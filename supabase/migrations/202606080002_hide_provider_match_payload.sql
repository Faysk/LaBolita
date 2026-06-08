begin;

revoke select on public.matches from anon, authenticated;

grant select (
  id,
  tournament_id,
  provider_match_id,
  match_number,
  stage,
  group_name,
  home_team_id,
  away_team_id,
  scheduled_at,
  prediction_lock_at,
  status,
  venue,
  home_score,
  away_score,
  advancing_team_id,
  result_version,
  finalized_at,
  created_at,
  updated_at,
  home_placeholder,
  away_placeholder,
  live_home_score,
  live_away_score,
  provider_status,
  provider_updated_at
)
on public.matches
to anon, authenticated;

commit;
