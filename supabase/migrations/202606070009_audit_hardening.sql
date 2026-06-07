begin;

alter table public.app_settings
  add column current_terms_version text not null default '2026-06-07'
  check (length(trim(current_terms_version)) > 0);

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
      where id = auth.uid()
        and is_admin
        and disabled_at is null
    );
$$;

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
      where id = auth.uid()
        and is_master_admin
        and disabled_at is null
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
  v_terms_enforcement_enabled boolean;
  v_current_terms_version text;
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

  if v_profile.disabled_at is not null then
    raise exception 'account disabled' using errcode = '42501';
  end if;

  select terms_enforcement_enabled, current_terms_version
  into v_terms_enforcement_enabled, v_current_terms_version
  from public.app_settings
  where id;

  if v_terms_enforcement_enabled and (
    v_profile.terms_accepted_at is null
    or v_profile.terms_version is distinct from v_current_terms_version
  ) then
    raise exception 'terms acceptance required' using errcode = '42501';
  end if;
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

  return v_profile;
end;
$$;

create or replace function public.enforce_pool_owner_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('pool-owner:' || new.owner_id::text, 0));

  if (
    select count(*)
    from public.pools
    where owner_id = new.owner_id
  ) >= 20 then
    raise exception 'pool ownership limit reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_pool_owner_limit_before_insert
before insert on public.pools
for each row execute function public.enforce_pool_owner_limit();

create or replace function public.enforce_pool_membership_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('pool-member:' || new.user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('pool-capacity:' || new.pool_id::text, 0));

  if (
    select count(*)
    from public.pool_members
    where user_id = new.user_id
  ) >= 100 then
    raise exception 'pool membership limit reached' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.pool_members
    where pool_id = new.pool_id
  ) >= 500 then
    raise exception 'pool member limit reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_pool_membership_limits_before_insert
before insert on public.pool_members
for each row execute function public.enforce_pool_membership_limits();

revoke all on function public.enforce_pool_owner_limit() from public, anon, authenticated;
revoke all on function public.enforce_pool_membership_limits() from public, anon, authenticated;

create or replace function public.apply_results_sync_updates(p_updates jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
  v_expected integer;
begin
  if not public.request_is_service_role() then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_updates) is distinct from 'array' then
    raise exception 'updates must be a JSON array' using errcode = '22023';
  end if;

  v_expected := jsonb_array_length(p_updates);
  if v_expected > 104 then
    raise exception 'too many result updates' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_updates) as item(
      id uuid,
      live_home_score integer,
      live_away_score integer,
      provider_status text,
      provider_updated_at timestamptz
    )
    where item.id is null
      or item.provider_updated_at is null
      or item.provider_status is null
      or item.provider_status not in ('scheduled', 'live', 'finished')
      or item.live_home_score not between 0 and 30
      or item.live_away_score not between 0 and 30
      or (
        item.provider_status = 'scheduled'
        and (item.live_home_score is not null or item.live_away_score is not null)
      )
      or (
        item.provider_status in ('live', 'finished')
        and (item.live_home_score is null or item.live_away_score is null)
      )
  ) then
    raise exception 'invalid result update payload' using errcode = '22023';
  end if;

  with updates as (
    select *
    from jsonb_to_recordset(p_updates) as item(
      id uuid,
      live_home_score integer,
      live_away_score integer,
      provider_status text,
      provider_updated_at timestamptz
    )
  )
  update public.matches match
  set
    live_home_score = updates.live_home_score,
    live_away_score = updates.live_away_score,
    provider_status = updates.provider_status,
    provider_updated_at = updates.provider_updated_at
  from updates
  where match.id = updates.id;

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'result update payload referenced unknown or duplicate matches'
      using errcode = 'P0002';
  end if;

  return v_updated;
end;
$$;

revoke all on function public.apply_results_sync_updates(jsonb) from public, anon, authenticated;
grant execute on function public.apply_results_sync_updates(jsonb) to service_role;

commit;
