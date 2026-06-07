begin;

create table public.results_sync_state (
  id boolean primary key default true check (id),
  status text not null default 'never' check (status in ('never', 'ok', 'error')),
  source text,
  fallback_used boolean not null default false,
  observations integer not null default 0 check (observations >= 0),
  matched integer not null default 0 check (matched >= 0),
  updated integer not null default 0 check (updated >= 0),
  final_candidates integer not null default 0 check (final_candidates >= 0),
  ignored_regressions integer not null default 0 check (ignored_regressions >= 0),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  error_message text check (error_message is null or char_length(error_message) <= 300),
  updated_at timestamptz not null default now()
);

insert into public.results_sync_state (id)
values (true)
on conflict (id) do nothing;

create trigger results_sync_state_set_updated_at
before update on public.results_sync_state
for each row execute function public.set_updated_at();

alter table public.results_sync_state enable row level security;

create policy "results sync state is public"
on public.results_sync_state for select
to anon, authenticated
using (true);

grant select on public.results_sync_state to anon, authenticated;

drop policy "profiles visible inside shared pools" on public.profiles;
create policy "profiles visible inside shared pools"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or public.shares_pool_with(id)
  or public.is_admin()
);

drop policy "users update their own profile" on public.profiles;
create policy "users update their own profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy "predictions stay private until lock" on public.predictions;
create policy "predictions stay private until lock"
on public.predictions for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    public.shares_pool_with(user_id)
    and exists (
      select 1
      from public.matches match
      where match.id = match_id and now() >= match.prediction_lock_at
    )
  )
);

drop policy "scores visible inside shared pools" on public.prediction_scores;
create policy "scores visible inside shared pools"
on public.prediction_scores for select
to authenticated
using (user_id = (select auth.uid()) or public.shares_pool_with(user_id));

commit;
