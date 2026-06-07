begin;

-- gen_random_bytes is installed outside the public search_path on hosted
-- Supabase projects. gen_random_uuid is a PostgreSQL built-in and avoids that
-- schema dependency while keeping invite codes unpredictable.
create or replace function public.create_pool(p_name text, p_is_public boolean default false)
returns public.pools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pool public.pools;
  v_attempt integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if char_length(trim(p_name)) not between 3 and 60 then
    raise exception 'pool name must have between 3 and 60 characters' using errcode = '22023';
  end if;

  for v_attempt in 1..5 loop
    begin
      insert into public.pools (owner_id, name, invite_code, is_public)
      values (
        v_user_id,
        trim(p_name),
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
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

-- The service role bypasses RLS but still needs SQL privileges. These grants
-- are required by trusted import/synchronization scripts that never run in the
-- browser.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

grant execute on function public.create_pool(text, boolean) to authenticated;

commit;
