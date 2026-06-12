begin;

alter table public.profiles
  add column show_avatar_publicly boolean not null default false;

grant update (show_avatar_publicly) on public.profiles to authenticated;

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
language sql
stable
security definer
set search_path = public
as $$
  select
    pool.id,
    pool.name,
    owner_profile.display_name,
    pool.flag_code,
    count(member.user_id)::bigint,
    pool.created_at,
    count(*) over()::bigint
  from public.pools pool
  join public.profiles owner_profile on owner_profile.id = pool.owner_id
  left join public.pool_members member on member.pool_id = pool.id
  where pool.is_public
    and pool.archived_at is null
    and owner_profile.disabled_at is null
    and not exists (
      select 1
      from public.pool_members mine
      where mine.pool_id = pool.id
        and mine.user_id = auth.uid()
    )
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

drop function public.get_pool_ranking(uuid);
create function public.get_pool_ranking(p_pool_id uuid)
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
        totals.correct_results desc
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

drop function public.get_public_pool_ranking(uuid, integer, integer);
create function public.get_public_pool_ranking(
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
      case when profile.show_avatar_publicly then profile.avatar_url else null end as avatar_url,
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
    group by
      member.user_id,
      profile.display_name,
      profile.avatar_url,
      profile.show_avatar_publicly
  ),
  ranked as (
    select
      rank() over (
        order by
          totals.total_points desc,
          totals.exact_scores desc,
          totals.correct_results desc
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

drop function public.get_public_global_ranking(integer);
create function public.get_public_global_ranking(p_limit integer default 3)
returns table (
  rank_position bigint,
  is_current_user boolean,
  display_name text,
  avatar_url text,
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
      case when profile.show_avatar_publicly then profile.avatar_url else null end as avatar_url,
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
    group by
      eligible.user_id,
      profile.display_name,
      profile.avatar_url,
      profile.show_avatar_publicly
  ),
  ranked as (
    select
      rank() over (
        order by
          totals.total_points desc,
          totals.exact_scores desc,
          totals.correct_results desc
      ) as rank_position,
      totals.*
    from totals
  ),
  visible as (
    select ranked.*
    from ranked
    where ranked.rank_position <= least(greatest(coalesce(p_limit, 3), 1), 25)
      or ranked.user_id = auth.uid()
  )
  select
    visible.rank_position,
    visible.user_id = auth.uid(),
    visible.display_name,
    visible.avatar_url,
    visible.total_points,
    visible.exact_scores,
    visible.correct_results
  from visible
  order by visible.rank_position, visible.display_name;
$$;

revoke all on function public.get_public_pools(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.get_public_pools(text, integer, integer)
to anon, authenticated;

revoke all on function public.get_pool_ranking(uuid) from public, anon, authenticated;
grant execute on function public.get_pool_ranking(uuid) to authenticated;

revoke all on function public.get_public_pool_ranking(uuid, integer, integer)
from public, anon, authenticated;
grant execute on function public.get_public_pool_ranking(uuid, integer, integer)
to anon, authenticated;

revoke all on function public.get_public_global_ranking(integer)
from public, anon, authenticated;
grant execute on function public.get_public_global_ranking(integer)
to anon, authenticated;

commit;
