begin;

create or replace function public.apply_knockout_result_sync_updates(p_updates jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_update record;
  v_previous_result jsonb;
  v_updated integer := 0;
  v_expected integer;
  v_distinct integer;
  v_reason text;
  v_action text;
begin
  if not public.request_is_service_role() then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_updates) is distinct from 'array' then
    raise exception 'updates must be a JSON array' using errcode = '22023';
  end if;

  select count(*)::integer, count(distinct item.id)::integer
  into v_expected, v_distinct
  from jsonb_to_recordset(p_updates) as item(
    id uuid,
    home_score integer,
    away_score integer,
    advancing_team_id uuid
  );

  if v_expected > 104 then
    raise exception 'too many knockout result updates' using errcode = '22023';
  end if;

  if v_expected <> v_distinct then
    raise exception 'knockout result payload contains invalid or duplicate matches'
      using errcode = '22023';
  end if;

  for v_update in
    select *
    from jsonb_to_recordset(p_updates) as item(
      id uuid,
      home_score integer,
      away_score integer,
      advancing_team_id uuid
    )
  loop
    if v_update.home_score is null
      or v_update.away_score is null
      or v_update.advancing_team_id is null
      or v_update.home_score not between 0 and 30
      or v_update.away_score not between 0 and 30 then
      raise exception 'invalid knockout result payload' using errcode = '22023';
    end if;

    select * into v_match
    from public.matches
    where id = v_update.id
    for update;

    if not found then
      raise exception 'knockout result payload referenced unknown matches'
        using errcode = 'P0002';
    end if;

    if v_match.stage = 'group' then
      raise exception 'group-stage results cannot be finalized by knockout sync'
        using errcode = '22023';
    end if;

    if v_match.status = 'cancelled' then
      raise exception 'cancelled matches cannot be finalized by knockout sync'
        using errcode = 'P0001';
    end if;

    if v_match.home_team_id is null or v_match.away_team_id is null then
      raise exception 'knockout result sync requires both match teams'
        using errcode = '22023';
    end if;

    if v_update.advancing_team_id <> v_match.home_team_id
      and v_update.advancing_team_id <> v_match.away_team_id then
      raise exception 'advancing team must be one of the match teams'
        using errcode = '22023';
    end if;

    if v_update.home_score <> v_update.away_score
      and v_update.advancing_team_id is distinct from (
        case
          when v_update.home_score > v_update.away_score then v_match.home_team_id
          else v_match.away_team_id
        end
      ) then
      raise exception 'advancing team must match the result winner'
        using errcode = '22023';
    end if;

    if v_match.status = 'finished'
      and v_match.home_score is not distinct from v_update.home_score
      and v_match.away_score is not distinct from v_update.away_score
      and v_match.advancing_team_id is not distinct from v_update.advancing_team_id then
      continue;
    end if;

    if v_match.status <> 'finished'
      and (
        v_match.provider_status = 'live'
        or (v_match.status = 'live' and v_match.provider_status is distinct from 'finished')
      ) then
      continue;
    end if;

    if v_match.status <> 'finished'
      and (now() < v_match.prediction_lock_at or now() < v_match.scheduled_at) then
      raise exception 'a match cannot be finalized before kickoff'
        using errcode = 'P0001';
    end if;

    v_reason := case
      when v_match.status = 'finished' then
        'Resultado de mata-mata corrigido automaticamente pelo bracket oficial da FIFA'
      else
        'Resultado de mata-mata confirmado automaticamente pelo bracket oficial da FIFA'
    end;
    v_action := case
      when v_match.status = 'finished' then
        'auto_correct_fifa_knockout_match'
      else
        'auto_finalize_fifa_knockout_match'
    end;

    v_previous_result := jsonb_build_object(
      'home_score', v_match.home_score,
      'away_score', v_match.away_score,
      'advancing_team_id', v_match.advancing_team_id,
      'status', v_match.status,
      'result_version', v_match.result_version
    );

    update public.matches
    set
      home_score = v_update.home_score,
      away_score = v_update.away_score,
      advancing_team_id = v_update.advancing_team_id,
      status = 'finished',
      finalized_at = now(),
      result_version = result_version + 1
    where id = v_match.id
    returning * into v_match;

    insert into public.match_result_history (
      match_id, result_version, previous_result, new_result, reason, changed_by
    )
    values (
      v_match.id,
      v_match.result_version,
      v_previous_result,
      jsonb_build_object(
        'home_score', v_match.home_score,
        'away_score', v_match.away_score,
        'advancing_team_id', v_match.advancing_team_id,
        'status', v_match.status,
        'result_version', v_match.result_version
      ),
      v_reason,
      null
    );

    insert into public.prediction_scores (
      user_id, match_id, category, base_points, multiplier,
      match_points, advancement_points, total_points, result_version
    )
    select
      prediction.user_id,
      prediction.match_id,
      score.category,
      score.base_points,
      score.multiplier,
      score.match_points,
      score.advancement_points,
      score.total_points,
      v_match.result_version
    from public.predictions prediction
    cross join lateral public.calculate_prediction_score(
      prediction.home_score,
      prediction.away_score,
      v_match.home_score,
      v_match.away_score,
      v_match.stage,
      prediction.advancing_team_id,
      v_match.advancing_team_id
    ) score
    where prediction.match_id = v_match.id
    on conflict (user_id, match_id) do update
    set
      category = excluded.category,
      base_points = excluded.base_points,
      multiplier = excluded.multiplier,
      match_points = excluded.match_points,
      advancement_points = excluded.advancement_points,
      total_points = excluded.total_points,
      result_version = excluded.result_version,
      calculated_at = now();

    insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      null,
      v_action,
      'match',
      v_match.id::text,
      jsonb_build_object('result_version', v_match.result_version, 'source', 'fifa_bracket')
    );

    v_updated := v_updated + 1;
  end loop;

  return v_updated;
end;
$$;

revoke all on function public.apply_knockout_result_sync_updates(jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_knockout_result_sync_updates(jsonb)
  to service_role;

commit;
