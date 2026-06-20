begin;

create table public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 80),
  message text not null check (char_length(trim(message)) between 3 and 360),
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'critical')),
  audience text not null default 'all' check (audience in ('all', 'admins', 'pool_owners', 'specific_user')),
  target_user_id uuid references public.profiles(id) on delete cascade,
  link_href text check (link_href is null or link_href ~ '^/[^[:space:]]*$'),
  link_label text check (link_label is null or char_length(trim(link_label)) between 2 and 40),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((audience = 'specific_user') = (target_user_id is not null)),
  check (expires_at is null or expires_at > starts_at)
);

create trigger admin_alerts_set_updated_at
before update on public.admin_alerts
for each row execute function public.set_updated_at();

create index admin_alerts_visibility_idx
  on public.admin_alerts(audience, target_user_id, starts_at, expires_at);

create table public.admin_alert_reads (
  alert_id uuid not null references public.admin_alerts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);

create index admin_alert_reads_user_idx
  on public.admin_alert_reads(user_id, read_at desc);

create or replace function public.get_my_admin_alerts()
returns table (
  id uuid,
  title text,
  message text,
  severity text,
  audience text,
  link_href text,
  link_label text,
  created_at timestamptz,
  expires_at timestamptz,
  read_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_pool_owner boolean := false;
begin
  perform public.assert_account_ready();

  select coalesce(profile.is_admin, false)
  into v_is_admin
  from public.profiles profile
  where profile.id = v_user_id;

  select exists (
    select 1
    from public.pools pool
    where pool.owner_id = v_user_id
      and pool.archived_at is null
  )
  into v_is_pool_owner;

  return query
  select
    alert.id,
    alert.title,
    alert.message,
    alert.severity,
    alert.audience,
    alert.link_href,
    alert.link_label,
    alert.created_at,
    alert.expires_at,
    read_state.read_at
  from public.admin_alerts alert
  left join public.admin_alert_reads read_state
    on read_state.alert_id = alert.id
    and read_state.user_id = v_user_id
  where alert.starts_at <= now()
    and (alert.expires_at is null or alert.expires_at > now())
    and (
      alert.audience = 'all'
      or (alert.audience = 'admins' and v_is_admin)
      or (alert.audience = 'pool_owners' and v_is_pool_owner)
      or (alert.audience = 'specific_user' and alert.target_user_id = v_user_id)
    )
  order by
    read_state.read_at nulls first,
    case alert.severity
      when 'critical' then 1
      when 'warning' then 2
      when 'success' then 3
      else 4
    end,
    alert.created_at desc
  limit 12;
end;
$$;

create or replace function public.create_admin_alert(
  p_title text,
  p_message text,
  p_severity text default 'info',
  p_audience text default 'all',
  p_target_user_id uuid default null,
  p_link_href text default null,
  p_link_label text default null,
  p_expires_at timestamptz default null,
  p_reason text default null
)
returns public.admin_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert public.admin_alerts;
  v_title text := trim(coalesce(p_title, ''));
  v_message text := trim(coalesce(p_message, ''));
  v_severity text := coalesce(nullif(trim(p_severity), ''), 'info');
  v_audience text := coalesce(nullif(trim(p_audience), ''), 'all');
  v_link_href text := nullif(trim(coalesce(p_link_href, '')), '');
  v_link_label text := nullif(trim(coalesce(p_link_label, '')), '');
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'administrator permission required' using errcode = '42501';
  end if;

  if char_length(v_title) not between 3 and 80 then
    raise exception 'alert title must have between 3 and 80 characters' using errcode = '22023';
  end if;
  if char_length(v_message) not between 3 and 360 then
    raise exception 'alert message must have between 3 and 360 characters' using errcode = '22023';
  end if;
  if v_severity not in ('info', 'success', 'warning', 'critical') then
    raise exception 'invalid alert severity' using errcode = '22023';
  end if;
  if v_audience not in ('all', 'admins', 'pool_owners', 'specific_user') then
    raise exception 'invalid alert audience' using errcode = '22023';
  end if;
  if v_audience = 'specific_user' and p_target_user_id is null then
    raise exception 'target user is required for a specific alert' using errcode = '22023';
  end if;
  if v_audience <> 'specific_user' and p_target_user_id is not null then
    raise exception 'target user is only allowed for specific alerts' using errcode = '22023';
  end if;
  if p_target_user_id is not null and not exists (
    select 1 from public.profiles where id = p_target_user_id
  ) then
    raise exception 'target user not found' using errcode = 'P0002';
  end if;
  if v_link_href is not null and v_link_href !~ '^/[^[:space:]]*$' then
    raise exception 'alert link must be an internal path' using errcode = '22023';
  end if;
  if v_link_href is null then
    v_link_label := null;
  elsif v_link_label is null then
    v_link_label := 'Abrir';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'expiration must be in the future' using errcode = '22023';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  insert into public.admin_alerts (
    title,
    message,
    severity,
    audience,
    target_user_id,
    link_href,
    link_label,
    expires_at,
    created_by
  )
  values (
    v_title,
    v_message,
    v_severity,
    v_audience,
    p_target_user_id,
    v_link_href,
    v_link_label,
    p_expires_at,
    auth.uid()
  )
  returning * into v_alert;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'create_admin_alert',
    'admin_alert',
    v_alert.id::text,
    jsonb_build_object(
      'reason', v_reason,
      'severity', v_alert.severity,
      'audience', v_alert.audience,
      'target_user_id', v_alert.target_user_id,
      'expires_at', v_alert.expires_at
    )
  );

  return v_alert;
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
end;
$$;

alter table public.admin_alerts enable row level security;
alter table public.admin_alert_reads enable row level security;

create policy "admin alerts visible to administrators"
on public.admin_alerts for select
to authenticated
using (public.is_admin());

create policy "users can read their alert dismissals"
on public.admin_alert_reads for select
to authenticated
using (user_id = (select auth.uid()));

create policy "users can dismiss their alerts"
on public.admin_alert_reads for insert
to authenticated
with check (user_id = (select auth.uid()));

revoke all on public.admin_alerts, public.admin_alert_reads from public, anon, authenticated;
grant select on public.admin_alert_reads to authenticated;
grant insert on public.admin_alert_reads to authenticated;

revoke all on function public.get_my_admin_alerts() from public, anon, authenticated;
grant execute on function public.get_my_admin_alerts() to authenticated;

revoke all on function public.create_admin_alert(
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  timestamptz,
  text
) from public, anon, authenticated;
grant execute on function public.create_admin_alert(
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  timestamptz,
  text
) to authenticated;

revoke all on function public.dismiss_admin_alert(uuid) from public, anon, authenticated;
grant execute on function public.dismiss_admin_alert(uuid) to authenticated;

commit;
