begin;

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
      and archived_at is null
  ) >= 20 then
    raise exception 'pool ownership limit reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop policy "results sync state is public" on public.results_sync_state;

create policy "results sync state visible to administrators"
on public.results_sync_state for select
to authenticated
using (public.is_admin());

revoke select on public.results_sync_state from anon, authenticated;
grant select on public.results_sync_state to authenticated;

create or replace function public.get_public_results_sync_status()
returns table (
  status text,
  source text,
  fallback_used boolean,
  observations integer,
  matched integer,
  updated integer,
  final_candidates integer,
  ignored_regressions integer,
  last_attempt_at timestamptz,
  last_success_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    state.status,
    state.source,
    state.fallback_used,
    state.observations,
    state.matched,
    state.updated,
    state.final_candidates,
    state.ignored_regressions,
    state.last_attempt_at,
    state.last_success_at
  from public.results_sync_state state
  where state.id;
$$;

revoke all on function public.get_public_results_sync_status() from public, anon, authenticated;
grant execute on function public.get_public_results_sync_status() to anon, authenticated;

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
    group by member.user_id, profile.display_name
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
    null::text,
    ranked.total_points,
    ranked.exact_scores,
    ranked.correct_results
  from ranked
  order by ranked.rank_position, ranked.display_name
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.get_public_pool_ranking(uuid, integer, integer)
from public, anon, authenticated;
grant execute on function public.get_public_pool_ranking(uuid, integer, integer)
to anon, authenticated;

commit;
