begin;

create extension if not exists pgcrypto;

create type public.match_stage as enum (
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final'
);

create type public.match_status as enum (
  'scheduled',
  'postponed',
  'live',
  'finished',
  'cancelled'
);

create type public.pool_role as enum ('owner', 'admin', 'member');

create type public.score_category as enum (
  'exact',
  'refined',
  'result',
  'one-score',
  'miss'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create unique index tournaments_single_active_idx
  on public.tournaments(is_active)
  where is_active;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  code text not null,
  name text not null,
  short_name text not null,
  flag_emoji text,
  group_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, code),
  unique (id, tournament_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  provider_match_id text,
  match_number integer not null check (match_number > 0),
  stage public.match_stage not null,
  group_name text,
  home_team_id uuid,
  away_team_id uuid,
  scheduled_at timestamptz not null,
  prediction_lock_at timestamptz not null,
  status public.match_status not null default 'scheduled',
  venue text,
  home_score smallint check (home_score between 0 and 30),
  away_score smallint check (away_score between 0 and 30),
  advancing_team_id uuid,
  result_version integer not null default 0 check (result_version >= 0),
  provider_payload jsonb,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, match_number),
  foreign key (home_team_id, tournament_id)
    references public.teams(id, tournament_id) on delete restrict,
  foreign key (away_team_id, tournament_id)
    references public.teams(id, tournament_id) on delete restrict,
  foreign key (advancing_team_id, tournament_id)
    references public.teams(id, tournament_id) on delete restrict,
  check (prediction_lock_at <= scheduled_at),
  check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id),
  check ((home_score is null) = (away_score is null)),
  check (
    (status = 'finished' and home_score is not null and finalized_at is not null)
    or (status <> 'finished' and finalized_at is null)
  ),
  check (
    advancing_team_id is null
    or advancing_team_id = home_team_id
    or advancing_team_id = away_team_id
  )
);

create unique index matches_provider_match_id_idx
  on public.matches(provider_match_id)
  where provider_match_id is not null;
create index matches_schedule_idx on public.matches(scheduled_at);
create index matches_tournament_stage_idx on public.matches(tournament_id, stage);

create table public.pools (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 3 and 60),
  invite_code text not null unique check (
    invite_code = upper(invite_code) and char_length(invite_code) between 4 and 20
  ),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pool_members (
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.pool_role not null default 'member',
  joined_at timestamptz not null default now(),
  eligible_from timestamptz not null default now(),
  primary key (pool_id, user_id)
);

create index pool_members_user_idx on public.pool_members(user_id);

create table public.predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score smallint not null check (home_score between 0 and 30),
  away_score smallint not null check (away_score between 0 and 30),
  advancing_team_id uuid references public.teams(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create index predictions_match_idx on public.predictions(match_id);

create table public.prediction_scores (
  user_id uuid not null,
  match_id uuid not null,
  category public.score_category not null,
  base_points smallint not null check (base_points >= 0),
  multiplier smallint not null check (multiplier > 0),
  match_points smallint not null check (match_points >= 0),
  advancement_points smallint not null check (advancement_points >= 0),
  total_points smallint not null check (total_points >= 0),
  result_version integer not null check (result_version > 0),
  calculated_at timestamptz not null default now(),
  primary key (user_id, match_id),
  foreign key (user_id, match_id)
    references public.predictions(user_id, match_id)
    on delete cascade
);

create table public.match_result_history (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  result_version integer not null,
  previous_result jsonb not null,
  new_result jsonb not null,
  reason text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (match_id, result_version)
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger tournaments_set_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger pools_set_updated_at
before update on public.pools
for each row execute function public.set_updated_at();

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(
      case
        when char_length(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), '')) >= 2
          then trim(new.raw_user_meta_data ->> 'full_name')
        when char_length(coalesce(nullif(split_part(new.email, '@', 1), ''), '')) >= 2
          then split_part(new.email, '@', 1)
        else 'Jogador'
      end,
      60
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.request_is_service_role()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role';
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.request_is_service_role()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid() and is_admin
    );
$$;

create or replace function public.is_pool_member(
  p_pool_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pool_members
    where pool_id = p_pool_id and user_id = p_user_id
  );
$$;

create or replace function public.shares_pool_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pool_members mine
    join public.pool_members theirs on theirs.pool_id = mine.pool_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_other_user_id
  );
$$;

create or replace function public.match_stage_multiplier(p_stage public.match_stage)
returns smallint
language sql
immutable
strict
set search_path = public
as $$
  select case p_stage
    when 'group' then 1
    when 'round_of_32' then 1
    when 'round_of_16' then 2
    when 'quarter_final' then 3
    when 'semi_final' then 4
    when 'third_place' then 2
    when 'final' then 5
  end::smallint;
$$;

create or replace function public.calculate_base_points(
  p_prediction_home integer,
  p_prediction_away integer,
  p_result_home integer,
  p_result_away integer
)
returns table (category public.score_category, base_points smallint)
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  v_prediction_outcome integer := sign(p_prediction_home - p_prediction_away);
  v_result_outcome integer := sign(p_result_home - p_result_away);
  v_one_score_correct boolean :=
    p_prediction_home = p_result_home or p_prediction_away = p_result_away;
  v_goal_difference_correct boolean :=
    p_prediction_home - p_prediction_away = p_result_home - p_result_away;
begin
  if p_prediction_home = p_result_home and p_prediction_away = p_result_away then
    return query select 'exact'::public.score_category, 10::smallint;
  elsif v_result_outcome <> 0
    and v_prediction_outcome = v_result_outcome
    and (v_goal_difference_correct or v_one_score_correct) then
    return query select 'refined'::public.score_category, 7::smallint;
  elsif v_prediction_outcome = v_result_outcome then
    return query select 'result'::public.score_category, 5::smallint;
  elsif v_one_score_correct then
    return query select 'one-score'::public.score_category, 2::smallint;
  else
    return query select 'miss'::public.score_category, 0::smallint;
  end if;
end;
$$;

create or replace function public.calculate_prediction_score(
  p_prediction_home integer,
  p_prediction_away integer,
  p_result_home integer,
  p_result_away integer,
  p_stage public.match_stage,
  p_predicted_advancing_team_id uuid default null,
  p_result_advancing_team_id uuid default null
)
returns table (
  category public.score_category,
  base_points smallint,
  multiplier smallint,
  match_points smallint,
  advancement_points smallint,
  total_points smallint
)
language sql
immutable
set search_path = public
as $$
  select
    base.category,
    base.base_points,
    public.match_stage_multiplier(p_stage) as multiplier,
    (base.base_points * public.match_stage_multiplier(p_stage))::smallint as match_points,
    case
      when p_stage not in ('group', 'third_place')
        and p_predicted_advancing_team_id is not null
        and p_predicted_advancing_team_id = p_result_advancing_team_id
      then 3::smallint
      else 0::smallint
    end as advancement_points,
    (
      base.base_points * public.match_stage_multiplier(p_stage)
      + case
          when p_stage not in ('group', 'third_place')
            and p_predicted_advancing_team_id is not null
            and p_predicted_advancing_team_id = p_result_advancing_team_id
          then 3
          else 0
        end
    )::smallint as total_points
  from public.calculate_base_points(
    p_prediction_home,
    p_prediction_away,
    p_result_home,
    p_result_away
  ) base;
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
  v_prediction public.predictions;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_home_score not between 0 and 30 or p_away_score not between 0 and 30 then
    raise exception 'scores must be between 0 and 30' using errcode = '22023';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'match not found' using errcode = 'P0002';
  end if;

  if v_match.status not in ('scheduled', 'postponed') or now() >= v_match.prediction_lock_at then
    raise exception 'predictions are locked for this match' using errcode = 'P0001';
  end if;

  if v_match.stage in ('group', 'third_place') and p_advancing_team_id is not null then
    raise exception 'this stage does not accept an advancing team' using errcode = '22023';
  end if;

  if v_match.stage not in ('group', 'third_place') and (
    v_match.home_team_id is null
    or v_match.away_team_id is null
    or p_advancing_team_id is null
  ) then
    raise exception 'knockout predictions require both teams and an advancing team'
      using errcode = '22023';
  end if;

  if p_advancing_team_id is not null and (
    v_match.home_team_id is null
    or v_match.away_team_id is null
    or (
      p_advancing_team_id <> v_match.home_team_id
      and p_advancing_team_id <> v_match.away_team_id
    )
  ) then
    raise exception 'advancing team must be one of the match teams' using errcode = '22023';
  end if;

  insert into public.predictions (
    user_id,
    match_id,
    home_score,
    away_score,
    advancing_team_id
  )
  values (
    v_user_id,
    p_match_id,
    p_home_score,
    p_away_score,
    p_advancing_team_id
  )
  on conflict (user_id, match_id) do update
  set
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    advancing_team_id = excluded.advancing_team_id,
    updated_at = now()
  returning * into v_prediction;

  return v_prediction;
end;
$$;

create or replace function public.create_pool(p_name text, p_is_public boolean default false)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pool public.pools;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if char_length(trim(p_name)) not between 3 and 60 then
    raise exception 'pool name must have between 3 and 60 characters' using errcode = '22023';
  end if;

  insert into public.pools (owner_id, name, invite_code, is_public)
  values (
    v_user_id,
    trim(p_name),
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
    p_is_public
  )
  returning * into v_pool;

  insert into public.pool_members (pool_id, user_id, role)
  values (v_pool.id, v_user_id, 'owner');

  return v_pool;
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
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_pool
  from public.pools
  where invite_code = upper(trim(p_invite_code));

  if not found then
    raise exception 'pool not found' using errcode = 'P0002';
  end if;

  insert into public.pool_members (pool_id, user_id)
  values (v_pool.id, v_user_id)
  on conflict (pool_id, user_id) do nothing;

  return v_pool;
end;
$$;

create or replace function public.get_pool_ranking(p_pool_id uuid)
returns table (
  rank_position bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points bigint,
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
  with totals as (
    select
      member.user_id,
      profile.display_name,
      profile.avatar_url,
      coalesce(sum(case when matched.id is not null then score.total_points else 0 end), 0)::bigint
        as total_points,
      count(*) filter (where matched.id is not null and score.category = 'exact')::bigint
        as exact_scores,
      count(*) filter (
        where matched.id is not null and score.category in ('exact', 'refined', 'result')
      )::bigint as correct_results
    from public.pool_members member
    join public.profiles profile on profile.id = member.user_id
    left join public.prediction_scores score on score.user_id = member.user_id
    left join public.matches matched
      on matched.id = score.match_id
      and matched.prediction_lock_at >= member.eligible_from
    where member.pool_id = p_pool_id
    group by member.user_id, profile.display_name, profile.avatar_url
  )
  select
    rank() over (
      order by totals.total_points desc, totals.exact_scores desc, totals.display_name
    ),
    totals.user_id,
    totals.display_name,
    totals.avatar_url,
    totals.total_points,
    totals.exact_scores,
    totals.correct_results
  from totals
  order by totals.total_points desc, totals.exact_scores desc, totals.display_name;
end;
$$;

create or replace function public.finalize_match(
  p_match_id uuid,
  p_home_score integer,
  p_away_score integer,
  p_advancing_team_id uuid default null,
  p_reason text default null
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_previous_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'administrator permission required' using errcode = '42501';
  end if;

  if p_home_score not between 0 and 30 or p_away_score not between 0 and 30 then
    raise exception 'scores must be between 0 and 30' using errcode = '22023';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'match not found' using errcode = 'P0002';
  end if;

  if now() < v_match.prediction_lock_at then
    raise exception 'a match cannot be finalized before prediction lock'
      using errcode = 'P0001';
  end if;

  if v_match.status = 'cancelled' then
    raise exception 'a cancelled match cannot be finalized' using errcode = 'P0001';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required when finalizing or correcting a result'
      using errcode = '22023';
  end if;

  if v_match.stage in ('group', 'third_place') and p_advancing_team_id is not null then
    raise exception 'this stage does not accept an advancing team' using errcode = '22023';
  end if;

  if v_match.stage not in ('group', 'third_place') and p_advancing_team_id is null then
    raise exception 'advancing team is required for knockout matches' using errcode = '22023';
  end if;

  if p_advancing_team_id is not null and (
    v_match.home_team_id is null
    or v_match.away_team_id is null
    or (
      p_advancing_team_id <> v_match.home_team_id
      and p_advancing_team_id <> v_match.away_team_id
    )
  ) then
    raise exception 'advancing team must be one of the match teams' using errcode = '22023';
  end if;

  v_previous_result := jsonb_build_object(
    'home_score', v_match.home_score,
    'away_score', v_match.away_score,
    'advancing_team_id', v_match.advancing_team_id,
    'status', v_match.status,
    'result_version', v_match.result_version
  );

  update public.matches
  set
    home_score = p_home_score,
    away_score = p_away_score,
    advancing_team_id = p_advancing_team_id,
    status = 'finished',
    finalized_at = now(),
    result_version = result_version + 1
  where id = p_match_id
  returning * into v_match;

  insert into public.match_result_history (
    match_id,
    result_version,
    previous_result,
    new_result,
    reason,
    changed_by
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
    p_reason,
    auth.uid()
  );

  insert into public.prediction_scores (
    user_id,
    match_id,
    category,
    base_points,
    multiplier,
    match_points,
    advancement_points,
    total_points,
    result_version
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

  insert into public.admin_audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    'finalize_match',
    'match',
    v_match.id::text,
    jsonb_build_object('result_version', v_match.result_version, 'reason', p_reason)
  );

  return v_match;
end;
$$;

create or replace function public.update_match_schedule(
  p_match_id uuid,
  p_scheduled_at timestamptz,
  p_prediction_lock_at timestamptz,
  p_status public.match_status,
  p_reason text,
  p_allow_reopen boolean default false
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_previous jsonb;
begin
  if not public.is_admin() then
    raise exception 'administrator permission required' using errcode = '42501';
  end if;

  if p_prediction_lock_at > p_scheduled_at then
    raise exception 'prediction lock cannot be after kickoff' using errcode = '22023';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required for schedule changes' using errcode = '22023';
  end if;

  if p_status not in ('scheduled', 'postponed', 'cancelled') then
    raise exception 'schedule changes only accept scheduled, postponed or cancelled status'
      using errcode = '22023';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'match not found' using errcode = 'P0002';
  end if;

  if v_match.status = 'finished' then
    raise exception 'a finished match schedule cannot be changed' using errcode = 'P0001';
  end if;

  if now() >= v_match.prediction_lock_at
    and p_prediction_lock_at > now()
    and not p_allow_reopen then
    raise exception 'reopening predictions after lock requires explicit permission'
      using errcode = 'P0001';
  end if;

  v_previous := jsonb_build_object(
    'scheduled_at', v_match.scheduled_at,
    'prediction_lock_at', v_match.prediction_lock_at,
    'status', v_match.status
  );

  update public.matches
  set
    scheduled_at = p_scheduled_at,
    prediction_lock_at = p_prediction_lock_at,
    status = p_status
  where id = p_match_id
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
    'update_match_schedule',
    'match',
    v_match.id::text,
    jsonb_build_object(
      'previous', v_previous,
      'new', jsonb_build_object(
        'scheduled_at', v_match.scheduled_at,
        'prediction_lock_at', v_match.prediction_lock_at,
        'status', v_match.status
      ),
      'reason', trim(p_reason),
      'allow_reopen', p_allow_reopen
    )
  );

  return v_match;
end;
$$;

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_scores enable row level security;
alter table public.match_result_history enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "profiles visible inside shared pools"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.shares_pool_with(id)
  or public.is_admin()
);

create policy "users update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "tournaments are public"
on public.tournaments for select
to anon, authenticated
using (true);

create policy "teams are public"
on public.teams for select
to anon, authenticated
using (true);

create policy "matches are public"
on public.matches for select
to anon, authenticated
using (true);

create policy "members can see their pools"
on public.pools for select
to authenticated
using (is_public or public.is_pool_member(id));

create policy "members can see pool membership"
on public.pool_members for select
to authenticated
using (public.is_pool_member(pool_id));

create policy "predictions stay private until lock"
on public.predictions for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.shares_pool_with(user_id)
    and exists (
      select 1
      from public.matches match
      where match.id = match_id and now() >= match.prediction_lock_at
    )
  )
);

create policy "scores visible inside shared pools"
on public.prediction_scores for select
to authenticated
using (user_id = auth.uid() or public.shares_pool_with(user_id));

create policy "result history visible to administrators"
on public.match_result_history for select
to authenticated
using (public.is_admin());

create policy "audit logs visible to administrators"
on public.admin_audit_logs for select
to authenticated
using (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.tournaments, public.teams, public.matches to anon, authenticated;
grant select on public.profiles, public.pools, public.pool_members, public.predictions,
  public.prediction_scores, public.match_result_history, public.admin_audit_logs
  to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_pool_member(uuid, uuid) to authenticated;
grant execute on function public.shares_pool_with(uuid) to authenticated;
grant execute on function public.match_stage_multiplier(public.match_stage) to anon, authenticated;
grant execute on function public.calculate_base_points(integer, integer, integer, integer)
  to anon, authenticated;
grant execute on function public.calculate_prediction_score(
  integer,
  integer,
  integer,
  integer,
  public.match_stage,
  uuid,
  uuid
) to anon, authenticated;
grant execute on function public.save_prediction(uuid, integer, integer, uuid) to authenticated;
grant execute on function public.create_pool(text, boolean) to authenticated;
grant execute on function public.join_pool(text) to authenticated;
grant execute on function public.get_pool_ranking(uuid) to authenticated;
grant execute on function public.finalize_match(uuid, integer, integer, uuid, text)
  to authenticated;
grant execute on function public.update_match_schedule(
  uuid,
  timestamptz,
  timestamptz,
  public.match_status,
  text,
  boolean
) to authenticated;

commit;
