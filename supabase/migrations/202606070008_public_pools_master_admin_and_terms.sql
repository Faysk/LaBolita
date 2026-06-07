begin;

alter table public.profiles
  add column is_master_admin boolean not null default false,
  add column terms_accepted_at timestamptz,
  add column terms_version text,
  add column disabled_at timestamptz,
  add column disabled_reason text;

create unique index profiles_single_master_admin_idx
  on public.profiles(is_master_admin)
  where is_master_admin;

update public.profiles
set is_master_admin = true
where id = (
  select id
  from public.profiles
  where is_admin
  order by created_at
  limit 1
);

alter table public.pools
  add column archived_at timestamptz,
  add column archived_by uuid references public.profiles(id) on delete set null;

create table public.app_settings (
  id boolean primary key default true check (id),
  terms_enforcement_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.app_settings (id) values (true);

create index pools_public_active_idx
  on public.pools(created_at desc)
  where is_public and archived_at is null;

create or replace function public.is_master_admin()
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
      where id = auth.uid() and is_master_admin
    );
$$;

create or replace function public.assert_account_ready()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if public.request_is_service_role() then
    return;
  end if;

  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if (
    select terms_enforcement_enabled
    from public.app_settings
    where id
  ) and v_profile.terms_accepted_at is null then
    raise exception 'terms acceptance required' using errcode = '42501';
  end if;

  if v_profile.disabled_at is not null then
    raise exception 'account disabled' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.master_set_terms_enforcement(
  p_enabled boolean,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master_admin() then
    raise exception 'master administrator permission required' using errcode = '42501';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  update public.app_settings
  set
    terms_enforcement_enabled = p_enabled,
    updated_at = now(),
    updated_by = auth.uid()
  where id;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'set_terms_enforcement',
    'app_settings',
    'terms_enforcement',
    jsonb_build_object('enabled', p_enabled, 'reason', trim(p_reason))
  );

  return p_enabled;
end;
$$;

create or replace function public.get_master_settings()
returns table (
  terms_enforcement_enabled boolean,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_master_admin() then
    raise exception 'master administrator permission required' using errcode = '42501';
  end if;

  return query
  select setting.terms_enforcement_enabled, setting.updated_at
  from public.app_settings setting
  where setting.id;
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
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_version <> '2026-06-07' then
    raise exception 'unsupported terms version' using errcode = '22023';
  end if;

  update public.profiles
  set
    terms_accepted_at = now(),
    terms_version = p_version
  where id = auth.uid()
  returning * into v_profile;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

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
  v_prediction public.predictions;
begin
  perform public.assert_account_ready();

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
  perform public.assert_account_ready();

  if char_length(trim(p_name)) not between 3 and 60 then
    raise exception 'pool name must have between 3 and 60 characters' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.pools
    where owner_id = v_user_id and archived_at is null
  ) >= 20 then
    raise exception 'pool ownership limit reached' using errcode = 'P0001';
  end if;

  if (select count(*) from public.pool_members where user_id = v_user_id) >= 100 then
    raise exception 'pool membership limit reached' using errcode = 'P0001';
  end if;

  for v_attempt in 1..5 loop
    begin
      insert into public.pools (owner_id, name, invite_code, is_public)
      values (
        v_user_id,
        trim(p_name),
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
        p_is_public
      )
      returning * into v_pool;
      exit;
    exception
      when unique_violation then
        if v_attempt = 5 then
          raise;
        end if;
    end;
  end loop;

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
    return v_pool;
  end if;

  if (select count(*) from public.pool_members where user_id = v_user_id) >= 100 then
    raise exception 'pool membership limit reached' using errcode = 'P0001';
  end if;

  if (select count(*) from public.pool_members where pool_id = v_pool.id) >= 500 then
    raise exception 'pool member limit reached' using errcode = 'P0001';
  end if;

  insert into public.pool_members (pool_id, user_id)
  values (v_pool.id, v_user_id);

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
    return v_pool;
  end if;

  if (select count(*) from public.pool_members where user_id = v_user_id) >= 100 then
    raise exception 'pool membership limit reached' using errcode = 'P0001';
  end if;

  if (select count(*) from public.pool_members where pool_id = v_pool.id) >= 500 then
    raise exception 'pool member limit reached' using errcode = 'P0001';
  end if;

  insert into public.pool_members (pool_id, user_id)
  values (v_pool.id, v_user_id);

  return v_pool;
end;
$$;

create or replace function public.get_public_pools(
  p_search text default null,
  p_limit integer default 9,
  p_offset integer default 0
)
returns table (
  pool_id uuid,
  pool_name text,
  owner_name text,
  member_count bigint,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pool.id,
    pool.name,
    owner_profile.display_name,
    count(member.user_id)::bigint,
    pool.created_at,
    count(*) over()::bigint
  from public.pools pool
  join public.profiles owner_profile on owner_profile.id = pool.owner_id
  left join public.pool_members member on member.pool_id = pool.id
  where pool.is_public
    and pool.archived_at is null
    and owner_profile.disabled_at is null
    and (
      nullif(trim(p_search), '') is null
      or pool.name ilike '%' || trim(p_search) || '%'
      or owner_profile.display_name ilike '%' || trim(p_search) || '%'
    )
  group by pool.id, pool.name, owner_profile.display_name, pool.created_at
  order by count(member.user_id) desc, pool.created_at desc
  limit least(greatest(coalesce(p_limit, 9), 1), 24)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_my_pools()
returns table (
  pool_id uuid,
  pool_name text,
  invite_code text,
  is_public boolean,
  archived_at timestamptz,
  member_role public.pool_role,
  member_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pool.id,
    pool.name,
    pool.invite_code,
    pool.is_public,
    pool.archived_at,
    mine.role,
    count(member.user_id)::bigint
  from public.pool_members mine
  join public.pools pool on pool.id = mine.pool_id
  join public.profiles owner_profile on owner_profile.id = pool.owner_id
  left join public.pool_members member on member.pool_id = pool.id
  where mine.user_id = auth.uid()
    and owner_profile.disabled_at is null
    and (pool.archived_at is null or mine.role = 'owner')
  group by
    pool.id,
    pool.name,
    pool.invite_code,
    pool.is_public,
    pool.archived_at,
    mine.role,
    mine.joined_at
  order by pool.archived_at nulls first, mine.joined_at;
$$;

create or replace function public.get_public_pool_ranking(
  p_pool_id uuid,
  p_limit integer default 25,
  p_offset integer default 0
)
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
      and profile.disabled_at is null
    group by member.user_id, profile.display_name, profile.avatar_url
  ),
  ranked as (
    select
      rank() over (
        order by
          totals.total_points desc,
          totals.exact_scores desc,
          totals.correct_results desc,
          totals.display_name
      ) as rank_position,
      totals.*
    from totals
  )
  select
    ranked.rank_position,
    case when ranked.user_id = auth.uid() then ranked.user_id else null end,
    ranked.display_name,
    ranked.avatar_url,
    ranked.total_points,
    ranked.exact_scores,
    ranked.correct_results
  from ranked
  order by ranked.rank_position, ranked.display_name
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.update_pool(
  p_pool_id uuid,
  p_name text,
  p_is_public boolean,
  p_archived boolean,
  p_reason text
)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool public.pools;
  v_is_master boolean := public.is_master_admin();
  v_previous jsonb;
begin
  perform public.assert_account_ready();

  select * into v_pool
  from public.pools
  where id = p_pool_id
  for update;

  if not found then
    raise exception 'pool not found' using errcode = 'P0002';
  end if;

  if v_pool.owner_id <> auth.uid() and not v_is_master then
    raise exception 'pool owner permission required' using errcode = '42501';
  end if;

  if char_length(trim(p_name)) not between 3 and 60 then
    raise exception 'pool name must have between 3 and 60 characters' using errcode = '22023';
  end if;

  if v_pool.archived_at is not null and not p_archived and not v_is_master then
    raise exception 'only the master administrator can restore a pool' using errcode = '42501';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  v_previous := jsonb_build_object(
    'name', v_pool.name,
    'is_public', v_pool.is_public,
    'archived_at', v_pool.archived_at
  );

  update public.pools
  set
    name = trim(p_name),
    is_public = case when p_archived then false else p_is_public end,
    archived_at = case
      when p_archived and archived_at is null then now()
      when not p_archived then null
      else archived_at
    end,
    archived_by = case
      when p_archived and archived_at is null then auth.uid()
      when not p_archived then null
      else archived_by
    end
  where id = p_pool_id
  returning * into v_pool;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    case when p_archived then 'archive_pool' when v_previous ->> 'archived_at' is not null then 'restore_pool' else 'update_pool' end,
    'pool',
    p_pool_id::text,
    jsonb_build_object(
      'reason', trim(p_reason),
      'previous', v_previous,
      'next', jsonb_build_object(
        'name', v_pool.name,
        'is_public', v_pool.is_public,
        'archived_at', v_pool.archived_at
      )
    )
  );

  return v_pool;
end;
$$;

create or replace function public.remove_pool_member(
  p_pool_id uuid,
  p_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool public.pools;
begin
  perform public.assert_account_ready();

  select * into v_pool from public.pools where id = p_pool_id;
  if not found then
    raise exception 'pool not found' using errcode = 'P0002';
  end if;

  if v_pool.owner_id <> auth.uid() and not public.is_master_admin() then
    raise exception 'pool owner permission required' using errcode = '42501';
  end if;

  if v_pool.owner_id = p_user_id then
    raise exception 'the pool owner cannot be removed' using errcode = '22023';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  delete from public.pool_members
  where pool_id = p_pool_id and user_id = p_user_id;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'remove_pool_member',
    'pool',
    p_pool_id::text,
    jsonb_build_object('removed_user_id', p_user_id, 'reason', trim(p_reason))
  );
end;
$$;

create or replace function public.get_managed_pool_members(p_pool_id uuid)
returns table (
  user_id uuid,
  display_name text,
  role public.pool_role,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.pools
    where id = p_pool_id
      and (owner_id = auth.uid() or public.is_master_admin())
  ) then
    raise exception 'pool owner permission required' using errcode = '42501';
  end if;

  return query
  select member.user_id, profile.display_name, member.role, member.joined_at
  from public.pool_members member
  join public.profiles profile on profile.id = member.user_id
  where member.pool_id = p_pool_id
  order by member.role, profile.display_name;
end;
$$;

create or replace function public.master_update_user(
  p_user_id uuid,
  p_display_name text,
  p_disabled boolean,
  p_reason text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_previous jsonb;
begin
  if not public.is_master_admin() then
    raise exception 'master administrator permission required' using errcode = '42501';
  end if;

  if char_length(trim(p_display_name)) not between 2 and 60 then
    raise exception 'display name must have between 2 and 60 characters' using errcode = '22023';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_profile.is_master_admin and p_disabled then
    raise exception 'the master administrator cannot be disabled' using errcode = '42501';
  end if;

  v_previous := jsonb_build_object(
    'display_name', v_profile.display_name,
    'disabled_at', v_profile.disabled_at,
    'disabled_reason', v_profile.disabled_reason
  );

  update public.profiles
  set
    display_name = trim(p_display_name),
    disabled_at = case when p_disabled then coalesce(disabled_at, now()) else null end,
    disabled_reason = case when p_disabled then trim(p_reason) else null end
  where id = p_user_id
  returning * into v_profile;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    case when p_disabled then 'disable_user' when v_previous ->> 'disabled_at' is not null then 'restore_user' else 'update_user' end,
    'user',
    p_user_id::text,
    jsonb_build_object(
      'reason', trim(p_reason),
      'previous', v_previous,
      'next', jsonb_build_object(
        'display_name', v_profile.display_name,
        'disabled_at', v_profile.disabled_at,
        'disabled_reason', v_profile.disabled_reason
      )
    )
  );

  return v_profile;
end;
$$;

create or replace function public.master_list_pools(
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  pool_id uuid,
  pool_name text,
  owner_id uuid,
  owner_name text,
  invite_code text,
  is_public boolean,
  archived_at timestamptz,
  member_count bigint,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_master_admin() then
    raise exception 'master administrator permission required' using errcode = '42501';
  end if;

  return query
  select
    pool.id,
    pool.name,
    pool.owner_id,
    owner_profile.display_name,
    pool.invite_code,
    pool.is_public,
    pool.archived_at,
    count(member.user_id)::bigint,
    pool.created_at,
    count(*) over()::bigint
  from public.pools pool
  join public.profiles owner_profile on owner_profile.id = pool.owner_id
  left join public.pool_members member on member.pool_id = pool.id
  where nullif(trim(p_search), '') is null
    or pool.name ilike '%' || trim(p_search) || '%'
    or owner_profile.display_name ilike '%' || trim(p_search) || '%'
    or pool.invite_code ilike '%' || trim(p_search) || '%'
  group by pool.id, pool.name, pool.owner_id, owner_profile.display_name,
    pool.invite_code, pool.is_public, pool.archived_at, pool.created_at
  order by pool.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.master_list_users(
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  is_master_admin boolean,
  disabled_at timestamptz,
  terms_accepted_at timestamptz,
  pools_owned bigint,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_master_admin() then
    raise exception 'master administrator permission required' using errcode = '42501';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    auth_user.email::text,
    profile.is_master_admin,
    profile.disabled_at,
    profile.terms_accepted_at,
    count(pool.id)::bigint,
    profile.created_at,
    count(*) over()::bigint
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.id
  left join public.pools pool on pool.owner_id = profile.id
  where nullif(trim(p_search), '') is null
    or profile.display_name ilike '%' || trim(p_search) || '%'
    or auth_user.email ilike '%' || trim(p_search) || '%'
  group by profile.id, profile.display_name, auth_user.email, profile.is_master_admin,
    profile.disabled_at, profile.terms_accepted_at, profile.created_at
  order by profile.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

drop policy "members can see their pools" on public.pools;
create policy "active pools visible to members and managed pools visible to owners"
on public.pools for select
to authenticated
using (
  (
    archived_at is null
    and public.is_pool_member(id)
  )
  or owner_id = (select auth.uid())
  or public.is_master_admin()
);

drop policy "profiles visible inside shared pools" on public.profiles;
create policy "profiles visible to their owner and master administrator"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or public.is_master_admin()
);

alter table public.app_settings enable row level security;

revoke all on function public.is_master_admin() from public, anon, authenticated;
grant execute on function public.is_master_admin() to authenticated;

revoke all on function public.assert_account_ready() from public, anon, authenticated;
grant execute on function public.assert_account_ready() to authenticated;

revoke all on function public.accept_terms(text) from public, anon, authenticated;
grant execute on function public.accept_terms(text) to authenticated;

revoke all on function public.master_set_terms_enforcement(boolean, text) from public, anon, authenticated;
grant execute on function public.master_set_terms_enforcement(boolean, text) to authenticated;

revoke all on function public.get_master_settings() from public, anon, authenticated;
grant execute on function public.get_master_settings() to authenticated;

revoke all on function public.save_prediction(uuid, integer, integer, uuid) from public, anon, authenticated;
grant execute on function public.save_prediction(uuid, integer, integer, uuid) to authenticated;

revoke all on function public.create_pool(text, boolean) from public, anon, authenticated;
grant execute on function public.create_pool(text, boolean) to authenticated;

revoke all on function public.join_pool(text) from public, anon, authenticated;
grant execute on function public.join_pool(text) to authenticated;

revoke all on function public.join_public_pool(uuid) from public, anon, authenticated;
grant execute on function public.join_public_pool(uuid) to authenticated;

revoke all on function public.get_public_pools(text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_public_pools(text, integer, integer) to anon, authenticated;

revoke all on function public.get_my_pools() from public, anon, authenticated;
grant execute on function public.get_my_pools() to authenticated;

revoke all on function public.get_public_pool_ranking(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.get_public_pool_ranking(uuid, integer, integer) to anon, authenticated;

revoke all on function public.update_pool(uuid, text, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.update_pool(uuid, text, boolean, boolean, text) to authenticated;

revoke all on function public.remove_pool_member(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.remove_pool_member(uuid, uuid, text) to authenticated;

revoke all on function public.get_managed_pool_members(uuid) from public, anon, authenticated;
grant execute on function public.get_managed_pool_members(uuid) to authenticated;

revoke all on function public.master_update_user(uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.master_update_user(uuid, text, boolean, text) to authenticated;

revoke all on function public.master_list_pools(text, integer, integer) from public, anon, authenticated;
grant execute on function public.master_list_pools(text, integer, integer) to authenticated;

revoke all on function public.master_list_users(text, integer, integer) from public, anon, authenticated;
grant execute on function public.master_list_users(text, integer, integer) to authenticated;

commit;
