begin;

create or replace function public.assign_match_teams(
  p_match_id uuid,
  p_home_team_id uuid,
  p_away_team_id uuid,
  p_reason text
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
begin
  if not public.is_admin() then
    raise exception 'administrator permission required' using errcode = '42501';
  end if;

  if p_home_team_id = p_away_team_id then
    raise exception 'home and away teams must be different' using errcode = '22023';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required when assigning match teams'
      using errcode = '22023';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'match not found' using errcode = 'P0002';
  end if;

  if v_match.stage = 'group' then
    raise exception 'group-stage participants cannot be assigned here' using errcode = '22023';
  end if;

  if v_match.status not in ('scheduled', 'postponed') or now() >= v_match.prediction_lock_at then
    raise exception 'participants cannot be changed after match lock' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.teams
    where id = p_home_team_id and tournament_id = v_match.tournament_id
  ) or not exists (
    select 1 from public.teams
    where id = p_away_team_id and tournament_id = v_match.tournament_id
  ) then
    raise exception 'both teams must belong to the match tournament' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.predictions
    where match_id = v_match.id
  ) and (
    v_match.home_team_id is distinct from p_home_team_id
    or v_match.away_team_id is distinct from p_away_team_id
  ) then
    raise exception 'participants cannot change after predictions exist' using errcode = 'P0001';
  end if;

  update public.matches
  set
    home_team_id = p_home_team_id,
    away_team_id = p_away_team_id
  where id = v_match.id
  returning * into v_match;

  insert into public.admin_audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    'assign_match_teams',
    'match',
    v_match.id::text,
    jsonb_build_object(
      'home_team_id', v_match.home_team_id,
      'away_team_id', v_match.away_team_id,
      'reason', trim(p_reason)
    )
  );

  return v_match;
end;
$$;

create or replace function public.propagate_knockout_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_losing_team_id uuid;
  v_target public.matches;
  v_home_team_id uuid;
  v_away_team_id uuid;
begin
  if new.status <> 'finished'
    or new.stage in ('group', 'third_place')
    or new.advancing_team_id is null
    or (
      old.status = 'finished'
      and old.advancing_team_id is not distinct from new.advancing_team_id
    )
  then
    return new;
  end if;

  v_losing_team_id := case
    when new.advancing_team_id = new.home_team_id then new.away_team_id
    else new.home_team_id
  end;

  for v_target in
    select *
    from public.matches
    where tournament_id = new.tournament_id
      and (
        home_placeholder in (
          format('Vencedor da partida %s', new.match_number),
          format('Perdedor da partida %s', new.match_number)
        )
        or away_placeholder in (
          format('Vencedor da partida %s', new.match_number),
          format('Perdedor da partida %s', new.match_number)
        )
      )
    for update
  loop
    v_home_team_id := case v_target.home_placeholder
      when format('Vencedor da partida %s', new.match_number) then new.advancing_team_id
      when format('Perdedor da partida %s', new.match_number) then v_losing_team_id
      else v_target.home_team_id
    end;
    v_away_team_id := case v_target.away_placeholder
      when format('Vencedor da partida %s', new.match_number) then new.advancing_team_id
      when format('Perdedor da partida %s', new.match_number) then v_losing_team_id
      else v_target.away_team_id
    end;

    if (
      v_target.home_team_id is distinct from v_home_team_id
      or v_target.away_team_id is distinct from v_away_team_id
    ) and (
      v_target.status not in ('scheduled', 'postponed')
      or now() >= v_target.prediction_lock_at
      or exists (select 1 from public.predictions where match_id = v_target.id)
    ) then
      raise exception 'cannot propagate participant into a locked downstream match'
        using errcode = 'P0001';
    end if;

    update public.matches
    set
      home_team_id = v_home_team_id,
      away_team_id = v_away_team_id
    where id = v_target.id;
  end loop;

  return new;
end;
$$;

create trigger matches_propagate_knockout_participants
after update of status, advancing_team_id on public.matches
for each row execute function public.propagate_knockout_participants();

revoke all on function public.assign_match_teams(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.assign_match_teams(uuid, uuid, uuid, text)
  to authenticated;

revoke all on function public.propagate_knockout_participants()
  from public, anon, authenticated;

commit;
