begin;

create or replace function public.get_public_score_evolution(p_limit integer default 8)
returns table (
  participant_key text,
  is_current_user boolean,
  display_name text,
  avatar_url text,
  final_rank bigint,
  final_total_points bigint,
  final_exact_scores bigint,
  final_correct_results bigint,
  match_index integer,
  match_number integer,
  stage public.match_stage,
  stage_label text,
  match_label text,
  result_label text,
  scheduled_at timestamptz,
  points_in_match bigint,
  total_points bigint,
  exact_scores bigint,
  correct_results bigint,
  rank_after_match bigint,
  previous_rank bigint,
  position_delta bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with safe_limit as (
    select least(greatest(coalesce(p_limit, 8), 1), 12)::bigint as value
  ),
  eligible as (
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
  scored_matches as (
    select
      row_number() over (order by match.scheduled_at, match.match_number)::integer as match_index,
      match.id,
      match.match_number,
      match.stage,
      case
        when match.stage = 'group' and match.group_name is not null then 'Grupo ' || match.group_name
        when match.stage = 'round_of_32' then 'Fase de 32'
        when match.stage = 'round_of_16' then 'Oitavas'
        when match.stage = 'quarter_final' then 'Quartas'
        when match.stage = 'semi_final' then 'Semifinal'
        when match.stage = 'third_place' then 'Terceiro lugar'
        when match.stage = 'final' then 'Final'
        else 'Mata-mata'
      end as stage_label,
      coalesce(home_team.short_name, match.home_placeholder, 'Mandante')
        || ' x ' ||
        coalesce(away_team.short_name, match.away_placeholder, 'Visitante') as match_label,
      match.home_score::text || ' x ' || match.away_score::text as result_label,
      match.scheduled_at,
      match.prediction_lock_at
    from public.matches match
    left join public.teams home_team on home_team.id = match.home_team_id
    left join public.teams away_team on away_team.id = match.away_team_id
    where match.status = 'finished'
      and match.home_score is not null
      and match.away_score is not null
  ),
  scored_grid as (
    select
      eligible.user_id,
      eligible.eligible_from,
      profile.display_name,
      case when profile.show_avatar_publicly then profile.avatar_url else null end as avatar_url,
      scored_matches.match_index,
      scored_matches.id as match_id,
      scored_matches.match_number,
      scored_matches.stage,
      scored_matches.stage_label,
      scored_matches.match_label,
      scored_matches.result_label,
      scored_matches.scheduled_at,
      coalesce(
        case
          when scored_matches.prediction_lock_at >= eligible.eligible_from then score.total_points
          else 0
        end,
        0
      )::bigint as points_in_match,
      case
        when scored_matches.prediction_lock_at >= eligible.eligible_from then score.category
        else null
      end as category
    from eligible
    join public.profiles profile on profile.id = eligible.user_id
    cross join scored_matches
    left join public.prediction_scores score
      on score.user_id = eligible.user_id
      and score.match_id = scored_matches.id
  ),
  cumulative as (
    select
      scored_grid.*,
      sum(scored_grid.points_in_match) over (
        partition by scored_grid.user_id
        order by scored_grid.match_index
        rows between unbounded preceding and current row
      )::bigint as total_points,
      sum(case when scored_grid.category = 'exact' then 1 else 0 end) over (
        partition by scored_grid.user_id
        order by scored_grid.match_index
        rows between unbounded preceding and current row
      )::bigint as exact_scores,
      sum(case when scored_grid.category in ('exact', 'refined', 'result') then 1 else 0 end) over (
        partition by scored_grid.user_id
        order by scored_grid.match_index
        rows between unbounded preceding and current row
      )::bigint as correct_results
    from scored_grid
  ),
  ranked as (
    select
      cumulative.*,
      rank() over (
        partition by cumulative.match_index
        order by
          cumulative.total_points desc,
          cumulative.exact_scores desc,
          cumulative.correct_results desc
      )::bigint as rank_after_match
    from cumulative
  ),
  ranked_with_previous as (
    select
      ranked.*,
      lag(ranked.rank_after_match) over (
        partition by ranked.user_id
        order by ranked.match_index
      )::bigint as previous_rank
    from ranked
  ),
  final_rows as (
    select ranked_with_previous.*
    from ranked_with_previous
    where ranked_with_previous.match_index = (
      select max(scored_matches.match_index) from scored_matches
    )
  ),
  visible_users as (
    select
      ('p' || row_number() over (
        order by
          final_rows.rank_after_match,
          final_rows.total_points desc,
          final_rows.exact_scores desc,
          final_rows.correct_results desc,
          final_rows.display_name,
          final_rows.user_id
      ))::text as participant_key,
      final_rows.user_id,
      final_rows.rank_after_match as final_rank,
      final_rows.total_points as final_total_points,
      final_rows.exact_scores as final_exact_scores,
      final_rows.correct_results as final_correct_results
    from final_rows, safe_limit
    where final_rows.rank_after_match <= safe_limit.value
      or final_rows.user_id = auth.uid()
  )
  select
    visible_users.participant_key,
    ranked_with_previous.user_id = auth.uid(),
    ranked_with_previous.display_name,
    ranked_with_previous.avatar_url,
    visible_users.final_rank,
    visible_users.final_total_points,
    visible_users.final_exact_scores,
    visible_users.final_correct_results,
    ranked_with_previous.match_index,
    ranked_with_previous.match_number,
    ranked_with_previous.stage,
    ranked_with_previous.stage_label,
    ranked_with_previous.match_label,
    ranked_with_previous.result_label,
    ranked_with_previous.scheduled_at,
    ranked_with_previous.points_in_match,
    ranked_with_previous.total_points,
    ranked_with_previous.exact_scores,
    ranked_with_previous.correct_results,
    ranked_with_previous.rank_after_match,
    ranked_with_previous.previous_rank,
    coalesce(ranked_with_previous.previous_rank, ranked_with_previous.rank_after_match)
      - ranked_with_previous.rank_after_match as position_delta
  from ranked_with_previous
  join visible_users on visible_users.user_id = ranked_with_previous.user_id
  order by
    ranked_with_previous.match_index,
    ranked_with_previous.rank_after_match,
    ranked_with_previous.display_name;
$$;

revoke all on function public.get_public_score_evolution(integer)
from public, anon, authenticated;
grant execute on function public.get_public_score_evolution(integer)
to anon, authenticated;

commit;
