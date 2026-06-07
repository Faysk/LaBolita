begin;

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

  if (select count(*) from public.pools where owner_id = v_user_id) >= 20 then
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
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_pool
  from public.pools
  where invite_code = upper(trim(p_invite_code))
  for update;

  if not found then
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

revoke all on function public.create_pool(text, boolean) from public, anon, authenticated;
grant execute on function public.create_pool(text, boolean) to authenticated;

revoke all on function public.join_pool(text) from public, anon, authenticated;
grant execute on function public.join_pool(text) to authenticated;

commit;
