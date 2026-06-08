begin;

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
      and profile.disabled_at is null
    group by member.user_id, profile.display_name, profile.avatar_url
  )
  select
    rank() over (
      order by
        totals.total_points desc,
        totals.exact_scores desc,
        totals.correct_results desc,
        totals.display_name
    ),
    totals.user_id,
    totals.display_name,
    totals.avatar_url,
    totals.total_points,
    totals.exact_scores,
    totals.correct_results
  from totals
  order by
    totals.total_points desc,
    totals.exact_scores desc,
    totals.correct_results desc,
    totals.display_name;
end;
$$;

create or replace function public.get_public_global_ranking(p_limit integer default 3)
returns table (
  rank_position bigint,
  display_name text,
  total_points bigint,
  exact_scores bigint,
  correct_results bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with eligible as (
    select
      member.user_id,
      min(member.eligible_from) as eligible_from
    from public.pool_members member
    join public.pools pool on pool.id = member.pool_id
    join public.profiles owner_profile on owner_profile.id = pool.owner_id
    join public.profiles member_profile on member_profile.id = member.user_id
    where pool.is_public
      and pool.archived_at is null
      and owner_profile.disabled_at is null
      and member_profile.disabled_at is null
    group by member.user_id
  ),
  totals as (
    select
      eligible.user_id,
      profile.display_name,
      coalesce(sum(case when matched.id is not null then score.total_points else 0 end), 0)::bigint
        as total_points,
      count(*) filter (where matched.id is not null and score.category = 'exact')::bigint
        as exact_scores,
      count(*) filter (
        where matched.id is not null and score.category in ('exact', 'refined', 'result')
      )::bigint as correct_results
    from eligible
    join public.profiles profile on profile.id = eligible.user_id
    left join public.prediction_scores score on score.user_id = eligible.user_id
    left join public.matches matched
      on matched.id = score.match_id
      and matched.prediction_lock_at >= eligible.eligible_from
    group by eligible.user_id, profile.display_name
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
    ranked.display_name,
    ranked.total_points,
    ranked.exact_scores,
    ranked.correct_results
  from ranked
  order by ranked.rank_position, ranked.display_name
  limit least(greatest(coalesce(p_limit, 3), 1), 25);
$$;

revoke all on function public.get_pool_ranking(uuid) from public, anon, authenticated;
grant execute on function public.get_pool_ranking(uuid) to authenticated;

revoke all on function public.get_public_global_ranking(integer) from public, anon, authenticated;
grant execute on function public.get_public_global_ranking(integer) to anon, authenticated;

commit;
