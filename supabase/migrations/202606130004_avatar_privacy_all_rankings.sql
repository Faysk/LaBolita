begin;

create or replace function public.get_pool_ranking(p_pool_id uuid)
returns table (
  rank_position bigint,
  provisional_rank_position bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points bigint,
  provisional_points bigint,
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
  select
    totals.rank_position,
    totals.provisional_rank_position,
    totals.user_id,
    totals.display_name,
    case when totals.show_avatar_publicly then totals.avatar_url else null end,
    totals.total_points,
    totals.provisional_points,
    totals.exact_scores,
    totals.correct_results
  from public.pool_ranking_totals(p_pool_id) totals;
end;
$$;

create or replace function public.get_special_pool_ranking(p_pool_id uuid)
returns table (
  rank_position bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points bigint,
  exact_hits bigint,
  partial_hits bigint
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
      profile.show_avatar_publicly,
      coalesce(sum(scored.points), 0)::bigint as total_points,
      coalesce(sum(scored.exact_hit), 0)::bigint as exact_hits,
      coalesce(sum(scored.partial_hit), 0)::bigint as partial_hits
    from public.pool_members member
    join public.profiles profile on profile.id = member.user_id
    left join public.special_markets market
      on market.status = 'resolved'
      and market.lock_at >= member.eligible_from
    left join lateral (
      select
        coalesce(sum(
          case
            when result.option_key = prediction.option_key then market.exact_points
            when market.value_type = 'player'
              and market.partial_points > 0
              and result.option_key <> prediction.option_key
              and result.option_team_id is not null
              and prediction.option_team_id = result.option_team_id
            then market.partial_points
            else 0
          end
        ), 0)::bigint as points,
        count(*) filter (where result.option_key = prediction.option_key)::bigint as exact_hit,
        count(*) filter (
          where market.value_type = 'player'
            and market.partial_points > 0
            and result.option_key <> prediction.option_key
            and result.option_team_id is not null
            and prediction.option_team_id = result.option_team_id
        )::bigint as partial_hit
      from public.special_predictions prediction
      left join public.special_market_results result
        on result.market_id = prediction.market_id
        and (
          (market.value_type = 'team_set' and result.option_key = prediction.option_key)
          or (market.value_type <> 'team_set' and result.position = prediction.position)
        )
      where prediction.user_id = member.user_id
        and prediction.market_id = market.id
    ) scored on true
    where member.pool_id = p_pool_id
      and profile.disabled_at is null
    group by
      member.user_id,
      profile.display_name,
      profile.avatar_url,
      profile.show_avatar_publicly
  )
  select
    rank() over (
      order by
        totals.total_points desc,
        totals.exact_hits desc,
        totals.partial_hits desc
    ),
    totals.user_id,
    totals.display_name,
    case when totals.show_avatar_publicly then totals.avatar_url else null end,
    totals.total_points,
    totals.exact_hits,
    totals.partial_hits
  from totals
  order by
    totals.total_points desc,
    totals.exact_hits desc,
    totals.partial_hits desc,
    totals.display_name;
end;
$$;

revoke all on function public.get_pool_ranking(uuid) from public, anon, authenticated;
grant execute on function public.get_pool_ranking(uuid) to authenticated;

revoke all on function public.get_special_pool_ranking(uuid) from public, anon, authenticated;
grant execute on function public.get_special_pool_ranking(uuid) to authenticated;

commit;
