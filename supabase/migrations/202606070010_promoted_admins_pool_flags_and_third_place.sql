begin;

alter table public.pools
  add column flag_code text not null default 'br'
  check (flag_code ~ '^[a-z]{2}$');

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
      when p_stage <> 'group'
        and p_predicted_advancing_team_id is not null
        and p_predicted_advancing_team_id = p_result_advancing_team_id
      then 3::smallint
      else 0::smallint
    end as advancement_points,
    (
      base.base_points * public.match_stage_multiplier(p_stage)
      + case
          when p_stage <> 'group'
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

  insert into public.predictions (user_id, match_id, home_score, away_score, advancing_team_id)
  values (v_user_id, p_match_id, p_home_score, p_away_score, p_advancing_team_id)
  on conflict (user_id, match_id) do update
  set home_score = excluded.home_score,
      away_score = excluded.away_score,
      advancing_team_id = excluded.advancing_team_id,
      updated_at = now()
  returning * into v_prediction;

  return v_prediction;
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
language plpgsql security definer set search_path = public
as $$
declare
  v_match public.matches;
  v_previous_result jsonb;
begin
  if not public.is_admin() then raise exception 'administrator permission required' using errcode = '42501'; end if;
  if p_home_score not between 0 and 30 or p_away_score not between 0 and 30 then
    raise exception 'scores must be between 0 and 30' using errcode = '22023';
  end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'match not found' using errcode = 'P0002'; end if;
  if now() < v_match.prediction_lock_at or now() < v_match.scheduled_at then
    raise exception 'a match cannot be finalized before kickoff' using errcode = 'P0001';
  end if;
  if v_match.status = 'cancelled' then raise exception 'a cancelled match cannot be finalized' using errcode = 'P0001'; end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required when finalizing or correcting a result' using errcode = '22023';
  end if;
  if v_match.stage = 'group' and p_advancing_team_id is not null then
    raise exception 'group stage does not accept an advancing team' using errcode = '22023';
  end if;
  if v_match.stage <> 'group' and p_advancing_team_id is null then
    raise exception 'winning team is required for knockout matches' using errcode = '22023';
  end if;
  if p_advancing_team_id is not null and (
    v_match.home_team_id is null or v_match.away_team_id is null
    or (p_advancing_team_id <> v_match.home_team_id and p_advancing_team_id <> v_match.away_team_id)
  ) then
    raise exception 'advancing team must be one of the match teams' using errcode = '22023';
  end if;

  v_previous_result := jsonb_build_object('home_score', v_match.home_score, 'away_score', v_match.away_score,
    'advancing_team_id', v_match.advancing_team_id, 'status', v_match.status, 'result_version', v_match.result_version);
  update public.matches set home_score = p_home_score, away_score = p_away_score,
    advancing_team_id = p_advancing_team_id, status = 'finished', finalized_at = now(),
    result_version = result_version + 1
  where id = p_match_id returning * into v_match;

  insert into public.match_result_history (match_id, result_version, previous_result, new_result, reason, changed_by)
  values (v_match.id, v_match.result_version, v_previous_result,
    jsonb_build_object('home_score', v_match.home_score, 'away_score', v_match.away_score,
      'advancing_team_id', v_match.advancing_team_id, 'status', v_match.status, 'result_version', v_match.result_version),
    trim(p_reason), auth.uid());

  insert into public.prediction_scores (user_id, match_id, category, base_points, multiplier,
    match_points, advancement_points, total_points, result_version)
  select prediction.user_id, prediction.match_id, score.category, score.base_points, score.multiplier,
    score.match_points, score.advancement_points, score.total_points, v_match.result_version
  from public.predictions prediction
  cross join lateral public.calculate_prediction_score(prediction.home_score, prediction.away_score,
    v_match.home_score, v_match.away_score, v_match.stage, prediction.advancing_team_id, v_match.advancing_team_id) score
  where prediction.match_id = v_match.id
  on conflict (user_id, match_id) do update set category = excluded.category, base_points = excluded.base_points,
    multiplier = excluded.multiplier, match_points = excluded.match_points, advancement_points = excluded.advancement_points,
    total_points = excluded.total_points, result_version = excluded.result_version, calculated_at = now();

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'finalize_match', 'match', v_match.id::text,
    jsonb_build_object('result_version', v_match.result_version, 'reason', trim(p_reason)));
  return v_match;
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
  return v_pool;
end;
$$;

drop function public.get_public_pools(text, integer, integer);
create function public.get_public_pools(
  p_search text default null,
  p_limit integer default 9,
  p_offset integer default 0
)
returns table (
  pool_id uuid,
  pool_name text,
  owner_name text,
  flag_code text,
  member_count bigint,
  created_at timestamptz,
  total_count bigint
)
language sql stable security definer set search_path = public
as $$
  select pool.id, pool.name, owner_profile.display_name, pool.flag_code,
    count(member.user_id)::bigint, pool.created_at, count(*) over()::bigint
  from public.pools pool
  join public.profiles owner_profile on owner_profile.id = pool.owner_id
  left join public.pool_members member on member.pool_id = pool.id
  where pool.is_public and pool.archived_at is null and owner_profile.disabled_at is null
    and (
      nullif(trim(p_search), '') is null
      or pool.name ilike '%' || trim(p_search) || '%'
      or owner_profile.display_name ilike '%' || trim(p_search) || '%'
    )
  group by pool.id, pool.name, owner_profile.display_name, pool.flag_code, pool.created_at
  order by count(member.user_id) desc, pool.created_at desc
  limit least(greatest(coalesce(p_limit, 9), 1), 24)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

drop function public.get_my_pools();
create function public.get_my_pools()
returns table (
  pool_id uuid,
  pool_name text,
  invite_code text,
  is_public boolean,
  flag_code text,
  archived_at timestamptz,
  member_role public.pool_role,
  member_count bigint
)
language sql stable security definer set search_path = public
as $$
  select pool.id, pool.name, pool.invite_code, pool.is_public, pool.flag_code,
    pool.archived_at, mine.role, count(member.user_id)::bigint
  from public.pool_members mine
  join public.pools pool on pool.id = mine.pool_id
  join public.profiles owner_profile on owner_profile.id = pool.owner_id
  left join public.pool_members member on member.pool_id = pool.id
  where mine.user_id = auth.uid()
    and owner_profile.disabled_at is null
    and (pool.archived_at is null or mine.role = 'owner')
  group by pool.id, pool.name, pool.invite_code, pool.is_public, pool.flag_code,
    pool.archived_at, mine.role, mine.joined_at
  order by pool.archived_at nulls first, mine.joined_at;
$$;

create or replace function public.update_pool_with_flag(
  p_pool_id uuid,
  p_name text,
  p_is_public boolean,
  p_flag_code text,
  p_archived boolean,
  p_reason text
)
returns public.pools
language plpgsql security definer set search_path = public
as $$
declare
  v_pool public.pools;
  v_is_global_admin boolean := public.is_admin();
  v_previous jsonb;
begin
  perform public.assert_account_ready();
  select * into v_pool from public.pools where id = p_pool_id for update;
  if not found then raise exception 'pool not found' using errcode = 'P0002'; end if;
  if v_pool.owner_id <> auth.uid() and not v_is_global_admin then
    raise exception 'pool owner permission required' using errcode = '42501';
  end if;
  if char_length(trim(p_name)) not between 3 and 60 then
    raise exception 'pool name must have between 3 and 60 characters' using errcode = '22023';
  end if;
  if lower(trim(p_flag_code)) !~ '^[a-z]{2}$' then
    raise exception 'invalid pool flag code' using errcode = '22023';
  end if;
  if v_pool.archived_at is not null and not p_archived and not v_is_global_admin then
    raise exception 'administrator permission required to restore a pool' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  v_previous := jsonb_build_object('name', v_pool.name, 'is_public', v_pool.is_public,
    'flag_code', v_pool.flag_code, 'archived_at', v_pool.archived_at);
  update public.pools
  set name = trim(p_name),
      is_public = case when p_archived then false else p_is_public end,
      flag_code = lower(trim(p_flag_code)),
      archived_at = case when p_archived and archived_at is null then now() when not p_archived then null else archived_at end,
      archived_by = case when p_archived and archived_at is null then auth.uid() when not p_archived then null else archived_by end
  where id = p_pool_id returning * into v_pool;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(),
    case when p_archived then 'archive_pool' when v_previous ->> 'archived_at' is not null then 'restore_pool' else 'update_pool' end,
    'pool', p_pool_id::text,
    jsonb_build_object('reason', trim(p_reason), 'previous', v_previous,
      'next', jsonb_build_object('name', v_pool.name, 'is_public', v_pool.is_public,
        'flag_code', v_pool.flag_code, 'archived_at', v_pool.archived_at)));
  return v_pool;
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
language plpgsql security definer set search_path = public
as $$
declare v_flag_code text;
begin
  select flag_code into v_flag_code from public.pools where id = p_pool_id;
  if not found then raise exception 'pool not found' using errcode = 'P0002'; end if;
  return public.update_pool_with_flag(p_pool_id, p_name, p_is_public, v_flag_code, p_archived, p_reason);
end;
$$;

create or replace function public.admin_update_user_access(
  p_user_id uuid,
  p_is_admin boolean,
  p_reason text
)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'administrator permission required' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'profile not found' using errcode = 'P0002'; end if;
  if v_profile.is_master_admin then
    raise exception 'the principal master administrator cannot be altered' using errcode = '42501';
  end if;
  if p_is_admin and v_profile.disabled_at is not null then
    raise exception 'a disabled account cannot be promoted' using errcode = '42501';
  end if;

  update public.profiles set is_admin = p_is_admin where id = p_user_id returning * into v_profile;
  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), case when p_is_admin then 'promote_admin' else 'remove_admin' end,
    'user', p_user_id::text, jsonb_build_object('reason', trim(p_reason)));
  return v_profile;
end;
$$;

create or replace function public.remove_pool_member(p_pool_id uuid, p_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_pool public.pools;
begin
  perform public.assert_account_ready();
  select * into v_pool from public.pools where id = p_pool_id;
  if not found then raise exception 'pool not found' using errcode = 'P0002'; end if;
  if v_pool.owner_id <> auth.uid() and not public.is_admin() then
    raise exception 'pool owner permission required' using errcode = '42501';
  end if;
  if v_pool.owner_id = p_user_id then raise exception 'the pool owner cannot be removed' using errcode = '22023'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'a reason is required' using errcode = '22023'; end if;
  delete from public.pool_members where pool_id = p_pool_id and user_id = p_user_id;
  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'remove_pool_member', 'pool', p_pool_id::text,
    jsonb_build_object('removed_user_id', p_user_id, 'reason', trim(p_reason)));
end;
$$;

create or replace function public.get_managed_pool_members(p_pool_id uuid)
returns table (user_id uuid, display_name text, role public.pool_role, joined_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.pools where id = p_pool_id and (owner_id = auth.uid() or public.is_admin())) then
    raise exception 'pool owner permission required' using errcode = '42501';
  end if;
  return query select member.user_id, profile.display_name, member.role, member.joined_at
  from public.pool_members member join public.profiles profile on profile.id = member.user_id
  where member.pool_id = p_pool_id order by member.role, profile.display_name;
end;
$$;

create or replace function public.master_set_terms_enforcement(p_enabled boolean, p_reason text)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'administrator permission required' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'a reason is required' using errcode = '22023'; end if;
  update public.app_settings set terms_enforcement_enabled = p_enabled, updated_at = now(), updated_by = auth.uid() where id;
  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'set_terms_enforcement', 'app_settings', 'terms_enforcement',
    jsonb_build_object('enabled', p_enabled, 'reason', trim(p_reason)));
  return p_enabled;
end;
$$;

create or replace function public.get_master_settings()
returns table (terms_enforcement_enabled boolean, updated_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'administrator permission required' using errcode = '42501'; end if;
  return query select setting.terms_enforcement_enabled, setting.updated_at from public.app_settings setting where setting.id;
end;
$$;

create or replace function public.master_update_user(p_user_id uuid, p_display_name text, p_disabled boolean, p_reason text)
returns public.profiles language plpgsql security definer set search_path = public
as $$
declare v_profile public.profiles; v_previous jsonb;
begin
  if not public.is_admin() then raise exception 'administrator permission required' using errcode = '42501'; end if;
  if char_length(trim(p_display_name)) not between 2 and 60 then raise exception 'display name must have between 2 and 60 characters' using errcode = '22023'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'a reason is required' using errcode = '22023'; end if;
  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'profile not found' using errcode = 'P0002'; end if;
  if v_profile.is_master_admin and (p_disabled or trim(p_display_name) <> v_profile.display_name) then
    raise exception 'the principal master administrator cannot be altered' using errcode = '42501';
  end if;
  v_previous := jsonb_build_object('display_name', v_profile.display_name, 'disabled_at', v_profile.disabled_at, 'disabled_reason', v_profile.disabled_reason);
  update public.profiles set display_name = trim(p_display_name),
    disabled_at = case when p_disabled then coalesce(disabled_at, now()) else null end,
    disabled_reason = case when p_disabled then trim(p_reason) else null end
  where id = p_user_id returning * into v_profile;
  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), case when p_disabled then 'disable_user' when v_previous ->> 'disabled_at' is not null then 'restore_user' else 'update_user' end,
    'user', p_user_id::text, jsonb_build_object('reason', trim(p_reason), 'previous', v_previous));
  return v_profile;
end;
$$;

drop function public.master_list_pools(text, integer, integer);
create function public.master_list_pools(p_search text default null, p_limit integer default 100, p_offset integer default 0)
returns table (pool_id uuid, pool_name text, owner_id uuid, owner_name text, invite_code text,
  is_public boolean, flag_code text, archived_at timestamptz, member_count bigint, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'administrator permission required' using errcode = '42501'; end if;
  return query select pool.id, pool.name, pool.owner_id, owner.display_name, pool.invite_code,
    pool.is_public, pool.flag_code, pool.archived_at, count(member.user_id)::bigint, pool.created_at, count(*) over()::bigint
  from public.pools pool join public.profiles owner on owner.id = pool.owner_id
  left join public.pool_members member on member.pool_id = pool.id
  where nullif(trim(p_search), '') is null or pool.name ilike '%' || trim(p_search) || '%'
    or owner.display_name ilike '%' || trim(p_search) || '%' or pool.invite_code ilike '%' || trim(p_search) || '%'
  group by pool.id, pool.name, pool.owner_id, owner.display_name, pool.invite_code, pool.is_public,
    pool.flag_code, pool.archived_at, pool.created_at
  order by pool.created_at desc limit least(greatest(coalesce(p_limit, 100), 1), 1000) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

drop function public.master_list_users(text, integer, integer);
create function public.master_list_users(p_search text default null, p_limit integer default 100, p_offset integer default 0)
returns table (user_id uuid, display_name text, email text, is_admin boolean, is_master_admin boolean,
  disabled_at timestamptz, terms_accepted_at timestamptz, pools_owned bigint, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise exception 'administrator permission required' using errcode = '42501'; end if;
  return query select profile.id, profile.display_name, auth_user.email::text, profile.is_admin, profile.is_master_admin,
    profile.disabled_at, profile.terms_accepted_at, count(pool.id)::bigint, profile.created_at, count(*) over()::bigint
  from public.profiles profile join auth.users auth_user on auth_user.id = profile.id
  left join public.pools pool on pool.owner_id = profile.id
  where nullif(trim(p_search), '') is null or profile.display_name ilike '%' || trim(p_search) || '%'
    or auth_user.email ilike '%' || trim(p_search) || '%'
  group by profile.id, profile.display_name, auth_user.email, profile.is_admin, profile.is_master_admin,
    profile.disabled_at, profile.terms_accepted_at, profile.created_at
  order by profile.created_at desc limit least(greatest(coalesce(p_limit, 100), 1), 1000) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

drop policy "active pools visible to members and managed pools visible to owners" on public.pools;
create policy "active pools visible to members and managed pools visible to owners"
on public.pools for select to authenticated
using ((archived_at is null and public.is_pool_member(id)) or owner_id = (select auth.uid()) or public.is_admin());

drop policy "profiles visible to their owner and master administrator" on public.profiles;
create policy "profiles visible to their owner and global administrators"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

revoke all on function public.get_public_pools(text, integer, integer) from public, anon, authenticated;
revoke all on function public.get_my_pools() from public, anon, authenticated;
revoke all on function public.master_list_pools(text, integer, integer) from public, anon, authenticated;
revoke all on function public.master_list_users(text, integer, integer) from public, anon, authenticated;
revoke all on function public.create_pool_with_flag(text, boolean, text) from public, anon, authenticated;
grant execute on function public.create_pool_with_flag(text, boolean, text) to authenticated;
revoke all on function public.update_pool_with_flag(uuid, text, boolean, text, boolean, text) from public, anon, authenticated;
grant execute on function public.update_pool_with_flag(uuid, text, boolean, text, boolean, text) to authenticated;
revoke all on function public.admin_update_user_access(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_update_user_access(uuid, boolean, text) to authenticated;
grant execute on function public.get_public_pools(text, integer, integer) to anon, authenticated;
grant execute on function public.get_my_pools() to authenticated;
grant execute on function public.master_list_pools(text, integer, integer) to authenticated;
grant execute on function public.master_list_users(text, integer, integer) to authenticated;

commit;
