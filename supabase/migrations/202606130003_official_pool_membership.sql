alter table public.pools
  add column if not exists is_official boolean not null default false;

create unique index if not exists pools_single_official_idx
  on public.pools (is_official)
  where is_official;

create index if not exists pools_official_active_idx
  on public.pools (is_official)
  where is_official and archived_at is null;

update public.pools pool
set
  is_official = true,
  is_public = true,
  archived_at = null,
  updated_at = now()
where pool.id = (
  select candidate.id
  from public.pools candidate
  where candidate.invite_code = '965930AF0581'
    or translate(lower(candidate.name), 'ãáàâäéêíóôõúç', 'aaaaaeeiooouc')
      in ('labolao oficial', 'la bolao oficial')
  order by
    case when candidate.invite_code = '965930AF0581' then 0 else 1 end,
    candidate.created_at
  limit 1
)
and not exists (
  select 1
  from public.pools already_official
  where already_official.is_official
);

update public.pool_members member
set eligible_from = least(member.eligible_from, timestamptz '1900-01-01 00:00:00+00')
from public.pools pool
where pool.id = member.pool_id
  and pool.is_official;

create or replace function public.ensure_official_pool_membership()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pool public.pools;
  v_official_epoch timestamptz := timestamptz '1900-01-01 00:00:00+00';
begin
  perform public.assert_account_ready();

  select pool.* into v_pool
  from public.pools pool
  join public.profiles owner_profile on owner_profile.id = pool.owner_id
  where pool.is_official
    and pool.archived_at is null
    and owner_profile.disabled_at is null
  order by pool.created_at
  limit 1
  for update;

  if not found then
    return null;
  end if;

  insert into public.pool_members (pool_id, user_id, role, eligible_from)
  values (v_pool.id, v_user_id, 'member', v_official_epoch)
  on conflict (pool_id, user_id) do update
    set eligible_from = excluded.eligible_from
    where public.pool_members.eligible_from > excluded.eligible_from;

  return v_pool.id;
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

  insert into public.pool_members (pool_id, user_id, eligible_from)
  values (
    v_pool.id,
    v_user_id,
    case when v_pool.is_official then v_official_epoch else now() end
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

  insert into public.pool_members (pool_id, user_id, eligible_from)
  values (
    v_pool.id,
    v_user_id,
    case when v_pool.is_official then v_official_epoch else now() end
  );

  return v_pool;
end;
$$;

drop function public.get_my_pools();
create function public.get_my_pools()
returns table (
  pool_id uuid,
  pool_name text,
  invite_code text,
  is_public boolean,
  flag_code text,
  is_official boolean,
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
    pool.flag_code,
    pool.is_official,
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
    pool.flag_code,
    pool.is_official,
    pool.archived_at,
    mine.role,
    mine.joined_at
  order by
    pool.archived_at nulls first,
    pool.is_official desc,
    mine.joined_at;
$$;

revoke all on function public.ensure_official_pool_membership()
from public, anon, authenticated;
grant execute on function public.ensure_official_pool_membership()
to authenticated;

revoke all on function public.join_pool(text) from public, anon, authenticated;
grant execute on function public.join_pool(text) to authenticated;

revoke all on function public.join_public_pool(uuid) from public, anon, authenticated;
grant execute on function public.join_public_pool(uuid) to authenticated;

revoke all on function public.get_my_pools() from public, anon, authenticated;
grant execute on function public.get_my_pools() to authenticated;
