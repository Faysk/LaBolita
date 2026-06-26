begin;

alter table public.results_sync_state
  add column bracket_status text not null default 'never'
    check (bracket_status in ('never', 'ok', 'error', 'skipped')),
  add column bracket_observations integer not null default 0
    check (bracket_observations >= 0),
  add column bracket_updated integer not null default 0
    check (bracket_updated >= 0),
  add column bracket_error_message text
    check (bracket_error_message is null or char_length(bracket_error_message) <= 300);

create or replace function public.apply_knockout_participant_sync_updates(p_updates jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
  v_expected integer;
  v_distinct integer;
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
    home_team_id uuid,
    away_team_id uuid
  );

  if v_expected > 104 then
    raise exception 'too many participant updates' using errcode = '22023';
  end if;

  if v_expected <> v_distinct then
    raise exception 'participant update payload contains duplicate matches'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_updates) as item(
      id uuid,
      home_team_id uuid,
      away_team_id uuid
    )
    where item.id is null
  ) then
    raise exception 'invalid participant update payload' using errcode = '22023';
  end if;

  if exists (
    with updates as (
      select *
      from jsonb_to_recordset(p_updates) as item(
        id uuid,
        home_team_id uuid,
        away_team_id uuid
      )
    )
    select 1
    from updates
    left join public.matches stored on stored.id = updates.id
    where stored.id is null
  ) then
    raise exception 'participant update payload referenced unknown matches'
      using errcode = 'P0002';
  end if;

  if exists (
    with updates as (
      select *
      from jsonb_to_recordset(p_updates) as item(
        id uuid,
        home_team_id uuid,
        away_team_id uuid
      )
    )
    select 1
    from updates
    join public.matches stored on stored.id = updates.id
    where stored.stage = 'group'
  ) then
    raise exception 'group-stage participants cannot be updated by bracket sync'
      using errcode = '22023';
  end if;

  if exists (
    with updates as (
      select *
      from jsonb_to_recordset(p_updates) as item(
        id uuid,
        home_team_id uuid,
        away_team_id uuid
      )
    )
    select 1
    from updates
    join public.matches stored on stored.id = updates.id
    left join public.teams home_team on home_team.id = updates.home_team_id
    left join public.teams away_team on away_team.id = updates.away_team_id
    where (
        updates.home_team_id is not null
        and (
          home_team.id is null
          or home_team.tournament_id <> stored.tournament_id
        )
      )
      or (
        updates.away_team_id is not null
        and (
          away_team.id is null
          or away_team.tournament_id <> stored.tournament_id
        )
      )
  ) then
    raise exception 'all teams must belong to the match tournament'
      using errcode = '22023';
  end if;

  if exists (
    with updates as (
      select *
      from jsonb_to_recordset(p_updates) as item(
        id uuid,
        home_team_id uuid,
        away_team_id uuid
      )
    ),
    candidates as (
      select
        stored.id,
        coalesce(updates.home_team_id, stored.home_team_id) as next_home_team_id,
        coalesce(updates.away_team_id, stored.away_team_id) as next_away_team_id
      from updates
      join public.matches stored on stored.id = updates.id
    )
    select 1
    from candidates
    where next_home_team_id is not null
      and next_home_team_id = next_away_team_id
  ) then
    raise exception 'home and away teams must be different' using errcode = '22023';
  end if;

  if exists (
    with updates as (
      select *
      from jsonb_to_recordset(p_updates) as item(
        id uuid,
        home_team_id uuid,
        away_team_id uuid
      )
    ),
    candidates as (
      select
        stored.id,
        stored.status,
        stored.prediction_lock_at,
        stored.home_team_id as previous_home_team_id,
        stored.away_team_id as previous_away_team_id,
        coalesce(updates.home_team_id, stored.home_team_id) as next_home_team_id,
        coalesce(updates.away_team_id, stored.away_team_id) as next_away_team_id
      from updates
      join public.matches stored on stored.id = updates.id
    )
    select 1
    from candidates
    where (
        previous_home_team_id is distinct from next_home_team_id
        or previous_away_team_id is distinct from next_away_team_id
      )
      and (
        status not in ('scheduled', 'postponed')
        or now() >= prediction_lock_at
        or exists (
          select 1
          from public.predictions prediction
          where prediction.match_id = candidates.id
        )
      )
  ) then
    raise exception 'participants cannot change after match lock or predictions exist'
      using errcode = 'P0001';
  end if;

  with updates as (
    select *
    from jsonb_to_recordset(p_updates) as item(
      id uuid,
      home_team_id uuid,
      away_team_id uuid
    )
  ),
  candidates as (
    select
      stored.id,
      stored.home_team_id as previous_home_team_id,
      stored.away_team_id as previous_away_team_id,
      coalesce(updates.home_team_id, stored.home_team_id) as next_home_team_id,
      coalesce(updates.away_team_id, stored.away_team_id) as next_away_team_id
    from updates
    join public.matches stored on stored.id = updates.id
  ),
  changed as (
    select *
    from candidates
    where previous_home_team_id is distinct from next_home_team_id
      or previous_away_team_id is distinct from next_away_team_id
  ),
  applied as (
    update public.matches target
    set
      home_team_id = changed.next_home_team_id,
      away_team_id = changed.next_away_team_id
    from changed
    where target.id = changed.id
    returning
      changed.id,
      changed.previous_home_team_id,
      changed.previous_away_team_id,
      target.home_team_id,
      target.away_team_id
  )
  insert into public.admin_audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  select
    auth.uid(),
    'sync_knockout_participants',
    'match',
    applied.id::text,
    jsonb_build_object(
      'source', 'fifa_bracket',
      'previous_home_team_id', applied.previous_home_team_id,
      'previous_away_team_id', applied.previous_away_team_id,
      'home_team_id', applied.home_team_id,
      'away_team_id', applied.away_team_id
    )
  from applied;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.apply_knockout_participant_sync_updates(jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_knockout_participant_sync_updates(jsonb)
  to service_role;

drop function public.get_public_results_sync_status();

create or replace function public.get_public_results_sync_status()
returns table (
  status text,
  source text,
  fallback_used boolean,
  observations integer,
  matched integer,
  updated integer,
  final_candidates integer,
  ignored_regressions integer,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  bracket_status text,
  bracket_observations integer,
  bracket_updated integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    state.status,
    state.source,
    state.fallback_used,
    state.observations,
    state.matched,
    state.updated,
    state.final_candidates,
    state.ignored_regressions,
    state.last_attempt_at,
    state.last_success_at,
    state.bracket_status,
    state.bracket_observations,
    state.bracket_updated
  from public.results_sync_state state
  where state.id;
$$;

revoke all on function public.get_public_results_sync_status() from public, anon, authenticated;
grant execute on function public.get_public_results_sync_status() to anon, authenticated;

commit;
