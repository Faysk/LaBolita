begin;

create or replace function public.get_special_global_ranking(p_limit integer default 100)
returns table (
  rank_position bigint,
  is_current_user boolean,
  display_name text,
  avatar_url text,
  total_points bigint,
  exact_hits bigint,
  partial_hits bigint,
  completed_markets bigint,
  submitted_markets bigint,
  participant_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with active_markets as (
    select market.*
    from public.special_markets market
    join public.tournaments tournament on tournament.id = market.tournament_id
    where tournament.is_active
      and market.status <> 'void'
      and market.lock_at <= now()
  ),
  user_market_progress as (
    select
      prediction.user_id,
      market.id as market_id,
      count(*)::bigint as pick_total,
      max(market.pick_count)::bigint as pick_count
    from public.special_predictions prediction
    join active_markets market on market.id = prediction.market_id
    group by prediction.user_id, market.id
  ),
  participants as (
    select
      progress.user_id,
      count(*)::bigint as submitted_markets,
      count(*) filter (where progress.pick_total >= progress.pick_count)::bigint
        as completed_markets
    from user_market_progress progress
    group by progress.user_id
  ),
  scored as (
    select
      prediction.user_id,
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
      count(*) filter (where result.option_key = prediction.option_key)::bigint
        as exact_hit,
      count(*) filter (
        where market.value_type = 'player'
          and market.partial_points > 0
          and result.option_key <> prediction.option_key
          and result.option_team_id is not null
          and prediction.option_team_id = result.option_team_id
      )::bigint as partial_hit
    from public.special_predictions prediction
    join active_markets market
      on market.id = prediction.market_id
      and market.status = 'resolved'
    left join public.special_market_results result
      on result.market_id = prediction.market_id
      and (
        (market.value_type = 'team_set' and result.option_key = prediction.option_key)
        or (market.value_type <> 'team_set' and result.position = prediction.position)
      )
    group by prediction.user_id
  ),
  totals as (
    select
      participants.user_id,
      profile.display_name,
      profile.avatar_url,
      profile.show_avatar_publicly,
      coalesce(scored.points, 0)::bigint as total_points,
      coalesce(scored.exact_hit, 0)::bigint as exact_hits,
      coalesce(scored.partial_hit, 0)::bigint as partial_hits,
      participants.completed_markets,
      participants.submitted_markets
    from participants
    join public.profiles profile on profile.id = participants.user_id
    left join scored on scored.user_id = participants.user_id
    where profile.disabled_at is null
  ),
  ranked as (
    select
      rank() over (
        order by
          totals.total_points desc,
          totals.exact_hits desc,
          totals.partial_hits desc,
          totals.completed_markets desc,
          totals.submitted_markets desc
      ) as rank_position,
      count(*) over ()::bigint as participant_count,
      totals.*
    from totals
  )
  select
    ranked.rank_position,
    coalesce(ranked.user_id = auth.uid(), false) as is_current_user,
    ranked.display_name,
    case when ranked.show_avatar_publicly then ranked.avatar_url else null end,
    ranked.total_points,
    ranked.exact_hits,
    ranked.partial_hits,
    ranked.completed_markets,
    ranked.submitted_markets,
    ranked.participant_count
  from ranked
  order by ranked.rank_position, ranked.display_name
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

revoke all on function public.get_special_global_ranking(integer) from public, anon, authenticated;
grant execute on function public.get_special_global_ranking(integer) to authenticated;

commit;
