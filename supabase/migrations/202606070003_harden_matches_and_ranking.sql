begin;

alter table public.matches
  add constraint matches_group_shape_check
  check (
    (
      stage = 'group'
      and group_name is not null
      and home_team_id is not null
      and away_team_id is not null
    )
    or (stage <> 'group' and group_name is null)
  ),
  add constraint matches_group_name_check
  check (group_name is null or group_name ~ '^[A-L]$'),
  add constraint matches_finalized_after_kickoff_check
  check (status <> 'finished' or finalized_at >= scheduled_at),
  add constraint matches_provider_status_check
  check (
    provider_status is null
    or provider_status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')
  );

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

grant execute on function public.get_pool_ranking(uuid) to authenticated;

commit;
