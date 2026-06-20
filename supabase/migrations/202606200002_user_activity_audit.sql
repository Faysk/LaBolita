begin;

create table public.user_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z0-9_]{3,80}$'),
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id text not null check (char_length(trim(entity_id)) between 1 and 160),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index user_activity_events_user_recent_idx
  on public.user_activity_events(user_id, created_at desc);
create index user_activity_events_type_recent_idx
  on public.user_activity_events(event_type, created_at desc);
create index user_activity_events_entity_idx
  on public.user_activity_events(entity_type, entity_id);

create table public.prediction_change_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  action text not null check (action in ('created', 'updated')),
  previous_prediction jsonb check (
    previous_prediction is null or jsonb_typeof(previous_prediction) = 'object'
  ),
  new_prediction jsonb not null check (jsonb_typeof(new_prediction) = 'object'),
  created_at timestamptz not null default now()
);

create index prediction_change_events_user_recent_idx
  on public.prediction_change_events(user_id, created_at desc);
create index prediction_change_events_match_recent_idx
  on public.prediction_change_events(match_id, created_at desc);

create table public.special_prediction_change_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  market_id uuid not null references public.special_markets(id) on delete cascade,
  action text not null check (action in ('created', 'updated')),
  previous_options jsonb not null default '[]'::jsonb check (jsonb_typeof(previous_options) = 'array'),
  new_options jsonb not null check (jsonb_typeof(new_options) = 'array'),
  created_at timestamptz not null default now()
);

create index special_prediction_change_events_user_recent_idx
  on public.special_prediction_change_events(user_id, created_at desc);
create index special_prediction_change_events_market_recent_idx
  on public.special_prediction_change_events(market_id, created_at desc);

create or replace function public.record_user_activity(
  p_user_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if p_user_id is null then
    raise exception 'user id is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if coalesce(nullif(trim(p_event_type), ''), '') !~ '^[a-z0-9_]{3,80}$' then
    raise exception 'invalid event type' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_entity_type, ''))) not between 2 and 80 then
    raise exception 'invalid entity type' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_entity_id, ''))) not between 1 and 160 then
    raise exception 'invalid entity id' using errcode = '22023';
  end if;
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'event metadata must be an object' using errcode = '22023';
  end if;

  insert into public.user_activity_events (
    user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_user_id,
    trim(p_event_type),
    trim(p_entity_type),
    trim(p_entity_id),
    v_metadata
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.record_user_session_event(
  p_event_type text default 'login_completed',
  p_next_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_type text := coalesce(nullif(trim(p_event_type), ''), 'login_completed');
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if v_event_type <> 'login_completed' then
    raise exception 'invalid session event' using errcode = '22023';
  end if;

  perform public.record_user_activity(
    v_user_id,
    v_event_type,
    'session',
    v_user_id::text,
    jsonb_build_object('next_path', nullif(trim(coalesce(p_next_path, '')), ''))
  );
end;
$$;

create or replace function public.accept_terms(p_version text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_current_terms_version text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select current_terms_version
  into v_current_terms_version
  from public.app_settings
  where id;

  if p_version is distinct from v_current_terms_version then
    raise exception 'unsupported terms version' using errcode = '22023';
  end if;

  update public.profiles
  set
    terms_accepted_at = now(),
    terms_version = p_version
  where id = auth.uid()
    and disabled_at is null
  returning * into v_profile;

  if not found then
    raise exception 'profile not found or account disabled' using errcode = 'P0002';
  end if;

  perform public.record_user_activity(
    v_profile.id,
    'terms_accepted',
    'terms',
    p_version,
    jsonb_build_object('version', p_version)
  );

  return v_profile;
end;
$$;

create or replace function public.save_prediction(
  p_match_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_advancing_team_id uuid default null
)
returns public.predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches;
  v_previous_prediction public.predictions;
  v_prediction public.predictions;
  v_had_prediction boolean := false;
  v_changed boolean := false;
  v_action text;
  v_previous_json jsonb;
  v_new_json jsonb;
begin
  perform public.assert_account_ready();

  if p_home_score not between 0 and 30 or p_away_score not between 0 and 30 then
    raise exception 'scores must be between 0 and 30' using errcode = '22023';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'match not found' using errcode = 'P0002';
  end if;

  if v_match.status not in ('scheduled', 'postponed') or now() >= v_match.prediction_lock_at then
    raise exception 'predictions are locked for this match' using errcode = 'P0001';
  end if;

  if v_match.stage = 'group' and p_advancing_team_id is not null then
    raise exception 'group stage does not accept an advancing team' using errcode = '22023';
  end if;

  if v_match.stage <> 'group' and (
    v_match.home_team_id is null
    or v_match.away_team_id is null
    or p_advancing_team_id is null
  ) then
    raise exception 'knockout predictions require both teams and a winning team'
      using errcode = '22023';
  end if;

  if p_advancing_team_id is not null and (
    v_match.home_team_id is null
    or v_match.away_team_id is null
    or (p_advancing_team_id <> v_match.home_team_id and p_advancing_team_id <> v_match.away_team_id)
  ) then
    raise exception 'advancing team must be one of the match teams' using errcode = '22023';
  end if;

  select * into v_previous_prediction
  from public.predictions
  where user_id = v_user_id
    and match_id = p_match_id
  for update;

  v_had_prediction := found;
  v_changed := not v_had_prediction
    or v_previous_prediction.home_score is distinct from p_home_score
    or v_previous_prediction.away_score is distinct from p_away_score
    or v_previous_prediction.advancing_team_id is distinct from p_advancing_team_id;

  if v_had_prediction then
    v_previous_json := jsonb_build_object(
      'home_score', v_previous_prediction.home_score,
      'away_score', v_previous_prediction.away_score,
      'advancing_team_id', v_previous_prediction.advancing_team_id
    );
  end if;

  insert into public.predictions (user_id, match_id, home_score, away_score, advancing_team_id)
  values (v_user_id, p_match_id, p_home_score, p_away_score, p_advancing_team_id)
  on conflict (user_id, match_id) do update
  set home_score = excluded.home_score,
      away_score = excluded.away_score,
      advancing_team_id = excluded.advancing_team_id,
      updated_at = now()
  returning * into v_prediction;

  if v_changed then
    v_action := case when v_had_prediction then 'updated' else 'created' end;
    v_new_json := jsonb_build_object(
      'home_score', v_prediction.home_score,
      'away_score', v_prediction.away_score,
      'advancing_team_id', v_prediction.advancing_team_id
    );

    insert into public.prediction_change_events (
      user_id,
      match_id,
      action,
      previous_prediction,
      new_prediction
    )
    values (
      v_user_id,
      p_match_id,
      v_action,
      v_previous_json,
      v_new_json
    );

    perform public.record_user_activity(
      v_user_id,
      case when v_action = 'created' then 'match_prediction_created' else 'match_prediction_updated' end,
      'match',
      p_match_id::text,
      jsonb_build_object(
        'match_number', v_match.match_number,
        'previous', v_previous_json,
        'next', v_new_json
      )
    );
  end if;

  return v_prediction;
end;
$$;

create or replace function public.create_pool_with_flag(
  p_name text,
  p_is_public boolean default false,
  p_flag_code text default 'br'
)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pool public.pools;
begin
  perform public.assert_account_ready();

  if char_length(trim(p_name)) not between 3 and 60 then
    raise exception 'pool name must have between 3 and 60 characters' using errcode = '22023';
  end if;
  if lower(trim(p_flag_code)) !~ '^[a-z]{2}$' then
    raise exception 'invalid pool flag code' using errcode = '22023';
  end if;
  if (select count(*) from public.pools where owner_id = v_user_id and archived_at is null) >= 20 then
    raise exception 'pool ownership limit reached' using errcode = 'P0001';
  end if;
  if (select count(*) from public.pool_members where user_id = v_user_id) >= 100 then
    raise exception 'pool membership limit reached' using errcode = 'P0001';
  end if;

  for v_attempt in 1..5 loop
    begin
      insert into public.pools (owner_id, name, invite_code, is_public, flag_code)
      values (
        v_user_id,
        trim(p_name),
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
        p_is_public,
        lower(trim(p_flag_code))
      )
      returning * into v_pool;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then raise; end if;
    end;
  end loop;

  insert into public.pool_members (pool_id, user_id, role)
  values (v_pool.id, v_user_id, 'owner');

  perform public.record_user_activity(
    v_user_id,
    'pool_created',
    'pool',
    v_pool.id::text,
    jsonb_build_object(
      'pool_name', v_pool.name,
      'is_public', v_pool.is_public,
      'flag_code', v_pool.flag_code
    )
  );

  return v_pool;
end;
$$;

create or replace function public.create_pool(p_name text, p_is_public boolean default false)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_pool_with_flag(p_name, p_is_public, 'br');
end;
$$;

create or replace function public.join_pool(p_invite_code text)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pool public.pools;
  v_official_epoch timestamptz := timestamptz '1900-01-01 00:00:00+00';
  v_eligible_from timestamptz;
begin
  perform public.assert_account_ready();

  select pool.* into v_pool
  from public.pools pool
  where pool.invite_code = upper(trim(p_invite_code))
    and exists (
      select 1
      from public.profiles owner_profile
      where owner_profile.id = pool.owner_id and owner_profile.disabled_at is null
    )
  for update;

  if not found or v_pool.archived_at is not null then
    raise exception 'pool not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.pool_members
    where pool_id = v_pool.id and user_id = v_user_id
  ) then
    if v_pool.is_official then
      update public.pool_members
      set eligible_from = least(eligible_from, v_official_epoch)
      where pool_id = v_pool.id and user_id = v_user_id;
    end if;
    return v_pool;
  end if;

  if not v_pool.is_official
    and (select count(*) from public.pool_members where user_id = v_user_id) >= 100 then
    raise exception 'pool membership limit reached' using errcode = 'P0001';
  end if;

  if not v_pool.is_official
    and (select count(*) from public.pool_members where pool_id = v_pool.id) >= 500 then
    raise exception 'pool member limit reached' using errcode = 'P0001';
  end if;

  v_eligible_from := case when v_pool.is_official then v_official_epoch else now() end;

  insert into public.pool_members (pool_id, user_id, eligible_from)
  values (
    v_pool.id,
    v_user_id,
    v_eligible_from
  );

  perform public.record_user_activity(
    v_user_id,
    'pool_joined',
    'pool',
    v_pool.id::text,
    jsonb_build_object(
      'pool_name', v_pool.name,
      'method', 'invite',
      'is_official', v_pool.is_official,
      'eligible_from', v_eligible_from
    )
  );

  return v_pool;
end;
$$;

create or replace function public.join_public_pool(p_pool_id uuid)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pool public.pools;
  v_official_epoch timestamptz := timestamptz '1900-01-01 00:00:00+00';
  v_eligible_from timestamptz;
begin
  perform public.assert_account_ready();

  select pool.* into v_pool
  from public.pools pool
  where pool.id = p_pool_id
    and pool.is_public
    and pool.archived_at is null
    and exists (
      select 1
      from public.profiles owner_profile
      where owner_profile.id = pool.owner_id and owner_profile.disabled_at is null
    )
  for update;

  if not found then
    raise exception 'public pool not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.pool_members
    where pool_id = v_pool.id and user_id = v_user_id
  ) then
    if v_pool.is_official then
      update public.pool_members
      set eligible_from = least(eligible_from, v_official_epoch)
      where pool_id = v_pool.id and user_id = v_user_id;
    end if;
    return v_pool;
  end if;

  if not v_pool.is_official
    and (select count(*) from public.pool_members where user_id = v_user_id) >= 100 then
    raise exception 'pool membership limit reached' using errcode = 'P0001';
  end if;

  if not v_pool.is_official
    and (select count(*) from public.pool_members where pool_id = v_pool.id) >= 500 then
    raise exception 'pool member limit reached' using errcode = 'P0001';
  end if;

  v_eligible_from := case when v_pool.is_official then v_official_epoch else now() end;

  insert into public.pool_members (pool_id, user_id, eligible_from)
  values (
    v_pool.id,
    v_user_id,
    v_eligible_from
  );

  perform public.record_user_activity(
    v_user_id,
    'pool_joined',
    'pool',
    v_pool.id::text,
    jsonb_build_object(
      'pool_name', v_pool.name,
      'method', 'public',
      'is_official', v_pool.is_official,
      'eligible_from', v_eligible_from
    )
  );

  return v_pool;
end;
$$;

create or replace function public.save_special_prediction(
  p_market_key text,
  p_options jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_market public.special_markets;
  v_item record;
  v_count integer;
  v_distinct_count integer;
  v_key text;
  v_label text;
  v_team_text text;
  v_team_id uuid;
  v_previous_options jsonb := '[]'::jsonb;
  v_new_options jsonb := '[]'::jsonb;
  v_action text;
begin
  perform public.assert_account_ready();

  select market.*
  into v_market
  from public.special_markets market
  join public.tournaments tournament on tournament.id = market.tournament_id
  where tournament.is_active
    and market.key = trim(p_market_key)
  for update;

  if not found then
    raise exception 'special market not found' using errcode = 'P0002';
  end if;

  if v_market.status <> 'open' or now() >= v_market.lock_at then
    raise exception 'special predictions are locked for this market' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_options) <> 'array' then
    raise exception 'options must be an array' using errcode = '22023';
  end if;

  select count(*), count(distinct option_item.value ->> 'key')
  into v_count, v_distinct_count
  from jsonb_array_elements(p_options) option_item(value);

  if v_count <> v_market.pick_count then
    raise exception 'this market expects % option(s)', v_market.pick_count using errcode = '22023';
  end if;

  if v_distinct_count <> v_count then
    raise exception 'duplicated options are not allowed' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'position', prediction.position,
        'key', prediction.option_key,
        'label', prediction.option_label,
        'team_id', prediction.option_team_id
      )
      order by prediction.position
    ),
    '[]'::jsonb
  )
  into v_previous_options
  from public.special_predictions prediction
  where prediction.user_id = v_user_id
    and prediction.market_id = v_market.id;

  delete from public.special_predictions
  where user_id = v_user_id
    and market_id = v_market.id;

  for v_item in
    select option_item.value, option_item.ordinality::smallint as position
    from jsonb_array_elements(p_options) with ordinality as option_item(value, ordinality)
    order by option_item.ordinality
  loop
    v_key := trim(coalesce(v_item.value ->> 'key', ''));
    v_label := trim(coalesce(v_item.value ->> 'label', ''));
    v_team_text := nullif(trim(coalesce(v_item.value ->> 'team_id', '')), '');
    v_team_id := null;

    if char_length(v_key) not between 3 and 160 then
      raise exception 'invalid option key' using errcode = '22023';
    end if;

    if char_length(v_label) not between 2 and 120 then
      raise exception 'invalid option label' using errcode = '22023';
    end if;

    if v_team_text is not null then
      begin
        v_team_id := v_team_text::uuid;
      exception when invalid_text_representation then
        raise exception 'invalid team id' using errcode = '22023';
      end;
    end if;

    perform public.validate_special_option_team(v_market, v_key, v_team_id);

    insert into public.special_predictions (
      user_id,
      market_id,
      position,
      option_key,
      option_label,
      option_team_id
    )
    values (
      v_user_id,
      v_market.id,
      v_item.position,
      v_key,
      v_label,
      v_team_id
    );
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'position', prediction.position,
        'key', prediction.option_key,
        'label', prediction.option_label,
        'team_id', prediction.option_team_id
      )
      order by prediction.position
    ),
    '[]'::jsonb
  )
  into v_new_options
  from public.special_predictions prediction
  where prediction.user_id = v_user_id
    and prediction.market_id = v_market.id;

  if v_previous_options is distinct from v_new_options then
    v_action := case when v_previous_options = '[]'::jsonb then 'created' else 'updated' end;

    insert into public.special_prediction_change_events (
      user_id,
      market_id,
      action,
      previous_options,
      new_options
    )
    values (
      v_user_id,
      v_market.id,
      v_action,
      v_previous_options,
      v_new_options
    );

    perform public.record_user_activity(
      v_user_id,
      case when v_action = 'created' then 'special_prediction_created' else 'special_prediction_updated' end,
      'special_market',
      v_market.key,
      jsonb_build_object(
        'market_title', v_market.title,
        'previous', v_previous_options,
        'next', v_new_options
      )
    );
  end if;

  return true;
end;
$$;

create or replace function public.dismiss_admin_alert(p_alert_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_account_ready();

  if not exists (
    select 1
    from public.get_my_admin_alerts() alert
    where alert.id = p_alert_id
  ) then
    raise exception 'alert not found' using errcode = 'P0002';
  end if;

  insert into public.admin_alert_reads (alert_id, user_id)
  values (p_alert_id, auth.uid())
  on conflict (alert_id, user_id) do update
  set read_at = now();

  perform public.record_user_activity(
    auth.uid(),
    'admin_alert_dismissed',
    'admin_alert',
    p_alert_id::text,
    jsonb_build_object('alert_id', p_alert_id)
  );
end;
$$;

alter table public.user_activity_events enable row level security;
alter table public.prediction_change_events enable row level security;
alter table public.special_prediction_change_events enable row level security;

create policy "users and admins can read user activity"
on public.user_activity_events for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy "users and admins can read prediction changes"
on public.prediction_change_events for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy "users and admins can read special prediction changes"
on public.special_prediction_change_events for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

revoke all on public.user_activity_events,
  public.prediction_change_events,
  public.special_prediction_change_events
from public, anon, authenticated;

grant select on public.user_activity_events,
  public.prediction_change_events,
  public.special_prediction_change_events
to authenticated, service_role;

revoke all on function public.record_user_activity(uuid, text, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.record_user_activity(uuid, text, text, text, jsonb)
to service_role;

revoke all on function public.record_user_session_event(text, text)
from public, anon, authenticated;
grant execute on function public.record_user_session_event(text, text)
to authenticated;

commit;
