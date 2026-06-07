begin;

alter table public.matches
  add column if not exists home_placeholder text,
  add column if not exists away_placeholder text,
  add column if not exists live_home_score smallint check (live_home_score between 0 and 30),
  add column if not exists live_away_score smallint check (live_away_score between 0 and 30),
  add column if not exists provider_status text,
  add column if not exists provider_updated_at timestamptz;

alter table public.matches
  add constraint matches_live_score_pair_check
  check ((live_home_score is null) = (live_away_score is null));

commit;
