-- Dados mínimos confiáveis para iniciar o projeto. A aplicação de demonstração
-- usa src/lib/demo-data.ts até a sincronização esportiva ser configurada.

insert into public.tournaments (
  id,
  slug,
  name,
  starts_at,
  ends_at,
  is_active
)
values (
  '20260000-0000-0000-0000-000000000001',
  'copa-do-mundo-2026',
  'Copa do Mundo 2026',
  '2026-06-11 19:00:00+00',
  '2026-07-19 23:00:00+00',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_active = excluded.is_active;

insert into public.teams (
  id,
  tournament_id,
  code,
  name,
  short_name,
  flag_emoji,
  group_name
)
values
  (
    '20260000-0000-0000-0001-000000000001',
    '20260000-0000-0000-0000-000000000001',
    'MEX',
    'México',
    'México',
    '🇲🇽',
    'A'
  ),
  (
    '20260000-0000-0000-0001-000000000002',
    '20260000-0000-0000-0000-000000000001',
    'RSA',
    'África do Sul',
    'África do Sul',
    '🇿🇦',
    'A'
  )
on conflict (id) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  flag_emoji = excluded.flag_emoji,
  group_name = excluded.group_name;

insert into public.matches (
  id,
  tournament_id,
  match_number,
  stage,
  group_name,
  home_team_id,
  away_team_id,
  scheduled_at,
  prediction_lock_at,
  venue
)
values (
  '20260000-0000-0000-0002-000000000001',
  '20260000-0000-0000-0000-000000000001',
  1,
  'group',
  'A',
  '20260000-0000-0000-0001-000000000001',
  '20260000-0000-0000-0001-000000000002',
  '2026-06-11 19:00:00+00',
  '2026-06-11 19:00:00+00',
  'Estádio Cidade do México'
)
on conflict (id) do update
set
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  scheduled_at = excluded.scheduled_at,
  prediction_lock_at = excluded.prediction_lock_at,
  venue = excluded.venue;
