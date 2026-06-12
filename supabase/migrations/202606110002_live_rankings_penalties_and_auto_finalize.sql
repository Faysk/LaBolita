begin;

create or replace function public.validate_prediction_advancing_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_expected_winner uuid;
begin
  select * into v_match from public.matches where id = new.match_id;
  if not found then
    raise exception 'match not found' using errcode = 'P0002';
  end if;

  if v_match.stage = 'group' then
    if new.advancing_team_id is not null then
      raise exception 'group stage does not accept an advancing team' using errcode = '22023';
    end if;
    return new;
  end if;

  if v_match.home_team_id is null or v_match.away_team_id is null or new.advancing_team_id is null then
    raise exception 'knockout predictions require both teams and a winning team'
      using errcode = '22023';
  end if;
  if new.advancing_team_id <> v_match.home_team_id
    and new.advancing_team_id <> v_match.away_team_id then
    raise exception 'advancing team must be one of the match teams' using errcode = '22023';
  end if;

  if new.home_score <> new.away_score then
    v_expected_winner := case
      when new.home_score > new.away_score then v_match.home_team_id
      else v_match.away_team_id
    end;
    if new.advancing_team_id <> v_expected_winner then
      raise exception 'advancing team must match the predicted score winner' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_prediction_advancing_team on public.predictions;
create trigger validate_prediction_advancing_team
before insert or update of match_id, home_score, away_score, advancing_team_id
on public.predictions
for each row execute function public.validate_prediction_advancing_team();

create or replace function public.validate_match_advancing_team()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_expected_winner uuid;
begin
  if new.home_score is null or new.away_score is null then
    return new;
  end if;
  if new.stage = 'group' then
    if new.advancing_team_id is not null then
      raise exception 'group stage does not accept an advancing team' using errcode = '22023';
    end if;
    return new;
  end if;
  if new.home_team_id is null or new.away_team_id is null or new.advancing_team_id is null then
    raise exception 'knockout results require both teams and a winning team' using errcode = '22023';
  end if;
  if new.advancing_team_id <> new.home_team_id and new.advancing_team_id <> new.away_team_id then
    raise exception 'advancing team must be one of the match teams' using errcode = '22023';
  end if;
  if new.home_score <> new.away_score then
    v_expected_winner := case
      when new.home_score > new.away_score then new.home_team_id
      else new.away_team_id
    end;
    if new.advancing_team_id <> v_expected_winner then
      raise exception 'advancing team must match the result winner' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_match_advancing_team on public.matches;
create trigger validate_match_advancing_team
before insert or update of stage, home_team_id, away_team_id, home_score, away_score, advancing_team_id
on public.matches
for each row execute function public.validate_match_advancing_team();

create or replace function public.pool_ranking_totals(p_pool_id uuid)
returns table (
  rank_position bigint,
  provisional_rank_position bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  show_avatar_publicly boolean,
  total_points bigint,
  provisional_points bigint,
  exact_scores bigint,
  correct_results bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with members as (
    select member.user_id, member.eligible_from
    from public.pool_members member
    join public.profiles profile on profile.id = member.user_id
    where member.pool_id = p_pool_id
      and profile.disabled_at is null
  ),
  official as (
    select
      member.user_id,
      coalesce(sum(case when matched.id is not null then score.total_points else 0 end), 0)::bigint
        as total_points,
      count(*) filter (where matched.id is not null and score.category = 'exact')::bigint
        as exact_scores,
      count(*) filter (
        where matched.id is not null and score.category in ('exact', 'refined', 'result')
      )::bigint as correct_results
    from members member
    left join public.prediction_scores score on score.user_id = member.user_id
    left join public.matches matched
      on matched.id = score.match_id
      and matched.prediction_lock_at >= member.eligible_from
    group by member.user_id
  ),
  live as (
    select
      member.user_id,
      coalesce(sum(case when live_match.id is not null then live_score.total_points else 0 end), 0)::bigint
        as live_points,
      count(*) filter (where live_match.id is not null and live_score.category = 'exact')::bigint
        as live_exact,
      count(*) filter (
        where live_match.id is not null and live_score.category in ('exact', 'refined', 'result')
      )::bigint as live_correct
    from members member
    left join public.predictions prediction on prediction.user_id = member.user_id
    left join public.matches live_match
      on live_match.id = prediction.match_id
      and live_match.prediction_lock_at >= member.eligible_from
      and live_match.provider_status = 'live'
      and live_match.home_score is null
      and live_match.away_score is null
      and live_match.live_home_score is not null
      and live_match.live_away_score is not null
    left join lateral public.calculate_prediction_score(
      prediction.home_score,
      prediction.away_score,
      live_match.live_home_score,
      live_match.live_away_score,
      live_match.stage,
      prediction.advancing_team_id,
      null
    ) live_score on live_match.id is not null
    group by member.user_id
  ),
  totals as (
    select
      member.user_id,
      profile.display_name,
      profile.avatar_url,
      profile.show_avatar_publicly,
      official.total_points,
      official.exact_scores,
      official.correct_results,
      (official.total_points + live.live_points)::bigint as provisional_points,
      (official.exact_scores + live.live_exact)::bigint as provisional_exact,
      (official.correct_results + live.live_correct)::bigint as provisional_correct
    from members member
    join public.profiles profile on profile.id = member.user_id
    join official on official.user_id = member.user_id
    join live on live.user_id = member.user_id
  )
  select
    rank() over (
      order by totals.total_points desc, totals.exact_scores desc, totals.correct_results desc
    ),
    rank() over (
      order by
        totals.provisional_points desc,
        totals.provisional_exact desc,
        totals.provisional_correct desc
    ),
    totals.user_id,
    totals.display_name,
    totals.avatar_url,
    totals.show_avatar_publicly,
    totals.total_points,
    totals.provisional_points,
    totals.exact_scores,
    totals.correct_results
  from totals
  order by totals.total_points desc, totals.exact_scores desc, totals.correct_results desc, totals.display_name;
$$;

revoke all on function public.pool_ranking_totals(uuid) from public, anon, authenticated;

drop function public.get_pool_ranking(uuid);
create function public.get_pool_ranking(p_pool_id uuid)
returns table (
  rank_position bigint,
  provisional_rank_position bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points bigint,
  provisional_points bigint,
  exact_scores bigint,
  correct_results bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_pool_member(p_pool_id) and not public.is_admin() then
    raise exception 'pool membership required' using errcode = '42501';
  end if;
  return query
  select
    totals.rank_position,
    totals.provisional_rank_position,
    totals.user_id,
    totals.display_name,
    totals.avatar_url,
    totals.total_points,
    totals.provisional_points,
    totals.exact_scores,
    totals.correct_results
  from public.pool_ranking_totals(p_pool_id) totals;
end;
$$;

drop function public.get_public_pool_ranking(uuid, integer, integer);
create function public.get_public_pool_ranking(
  p_pool_id uuid,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  rank_position bigint,
  provisional_rank_position bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points bigint,
  provisional_points bigint,
  exact_scores bigint,
  correct_results bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.pools pool
    join public.profiles owner_profile on owner_profile.id = pool.owner_id
    where pool.id = p_pool_id
      and pool.is_public
      and pool.archived_at is null
      and owner_profile.disabled_at is null
  ) then
    raise exception 'public pool not found' using errcode = 'P0002';
  end if;
  return query
  select
    totals.rank_position,
    totals.provisional_rank_position,
    case when totals.user_id = auth.uid() then totals.user_id else null end,
    totals.display_name,
    case when totals.show_avatar_publicly then totals.avatar_url else null end,
    totals.total_points,
    totals.provisional_points,
    totals.exact_scores,
    totals.correct_results
  from public.pool_ranking_totals(p_pool_id) totals
  order by totals.rank_position, totals.display_name
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.finalize_provider_group_matches(p_safety_minutes integer default 10)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_previous_result jsonb;
  v_finalized integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_safety_minutes not between 5 and 120 then
    raise exception 'safety window must be between 5 and 120 minutes' using errcode = '22023';
  end if;

  for v_match in
    select *
    from public.matches candidate
    where candidate.stage = 'group'
      and candidate.status <> 'finished'
      and candidate.provider_status = 'finished'
      and candidate.live_home_score is not null
      and candidate.live_away_score is not null
      and candidate.provider_updated_at <= now() - make_interval(mins => p_safety_minutes)
    order by candidate.scheduled_at
    for update skip locked
  loop
    v_previous_result := jsonb_build_object(
      'home_score', v_match.home_score,
      'away_score', v_match.away_score,
      'advancing_team_id', v_match.advancing_team_id,
      'status', v_match.status,
      'result_version', v_match.result_version
    );

    update public.matches
    set
      home_score = v_match.live_home_score,
      away_score = v_match.live_away_score,
      advancing_team_id = null,
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
        'advancing_team_id', null,
        'status', v_match.status,
        'result_version', v_match.result_version
      ),
      'Resultado de grupo confirmado automaticamente após janela de segurança do provedor',
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
      null
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
      'auto_finalize_provider_group_match',
      'match',
      v_match.id::text,
      jsonb_build_object('result_version', v_match.result_version, 'safety_minutes', p_safety_minutes)
    );
    v_finalized := v_finalized + 1;
  end loop;
  return v_finalized;
end;
$$;

revoke all on function public.get_pool_ranking(uuid) from public, anon, authenticated;
grant execute on function public.get_pool_ranking(uuid) to authenticated;
revoke all on function public.get_public_pool_ranking(uuid, integer, integer)
from public, anon, authenticated;
grant execute on function public.get_public_pool_ranking(uuid, integer, integer)
to anon, authenticated;
revoke all on function public.finalize_provider_group_matches(integer)
from public, anon, authenticated;
grant execute on function public.finalize_provider_group_matches(integer) to service_role;

commit;
