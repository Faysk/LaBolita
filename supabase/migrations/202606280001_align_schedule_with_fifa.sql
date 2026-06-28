begin;

create temp table official_fifa_schedule_update (
  match_number integer primary key,
  stage text not null,
  group_name text,
  scheduled_at timestamptz not null,
  home_code text,
  away_code text,
  home_placeholder text,
  away_placeholder text,
  venue text,
  provider_match_id text
) on commit drop;

insert into official_fifa_schedule_update (
  match_number,
  stage,
  group_name,
  scheduled_at,
  home_code,
  away_code,
  home_placeholder,
  away_placeholder,
  venue,
  provider_match_id
)
values
  (1, 'group', 'A', '2026-06-11T19:00:00.000Z', 'MEX', 'RSA', null, null, 'Mexico City Stadium', 'worldcup26:1'),
  (2, 'group', 'A', '2026-06-12T02:00:00.000Z', 'KOR', 'CZE', null, null, 'Guadalajara Stadium', 'worldcup26:2'),
  (3, 'group', 'B', '2026-06-12T19:00:00.000Z', 'CAN', 'BIH', null, null, 'Toronto Stadium', 'worldcup26:3'),
  (4, 'group', 'D', '2026-06-13T01:00:00.000Z', 'USA', 'PAR', null, null, 'Los Angeles Stadium', 'worldcup26:4'),
  (5, 'group', 'C', '2026-06-14T01:00:00.000Z', 'HAI', 'SCO', null, null, 'Boston Stadium', 'worldcup26:5'),
  (6, 'group', 'D', '2026-06-14T04:00:00.000Z', 'AUS', 'TUR', null, null, 'BC Place Vancouver', 'worldcup26:6'),
  (7, 'group', 'C', '2026-06-13T22:00:00.000Z', 'BRA', 'MAR', null, null, 'New York/New Jersey Stadium', 'worldcup26:7'),
  (8, 'group', 'B', '2026-06-13T19:00:00.000Z', 'QAT', 'SUI', null, null, 'San Francisco Bay Area Stadium', 'worldcup26:8'),
  (9, 'group', 'E', '2026-06-14T23:00:00.000Z', 'CIV', 'ECU', null, null, 'Philadelphia Stadium', 'worldcup26:9'),
  (10, 'group', 'E', '2026-06-14T17:00:00.000Z', 'GER', 'CUW', null, null, 'Houston Stadium', 'worldcup26:10'),
  (11, 'group', 'F', '2026-06-14T20:00:00.000Z', 'NED', 'JPN', null, null, 'Dallas Stadium', 'worldcup26:11'),
  (12, 'group', 'F', '2026-06-15T02:00:00.000Z', 'SWE', 'TUN', null, null, 'Monterrey Stadium', 'worldcup26:12'),
  (13, 'group', 'H', '2026-06-15T22:00:00.000Z', 'KSA', 'URU', null, null, 'Miami Stadium', 'worldcup26:13'),
  (14, 'group', 'H', '2026-06-15T16:00:00.000Z', 'ESP', 'CPV', null, null, 'Atlanta Stadium', 'worldcup26:14'),
  (15, 'group', 'G', '2026-06-16T01:00:00.000Z', 'IRN', 'NZL', null, null, 'Los Angeles Stadium', 'worldcup26:15'),
  (16, 'group', 'G', '2026-06-15T19:00:00.000Z', 'BEL', 'EGY', null, null, 'Seattle Stadium', 'worldcup26:16'),
  (17, 'group', 'I', '2026-06-16T19:00:00.000Z', 'FRA', 'SEN', null, null, 'New York/New Jersey Stadium', 'worldcup26:17'),
  (18, 'group', 'I', '2026-06-16T22:00:00.000Z', 'IRQ', 'NOR', null, null, 'Boston Stadium', 'worldcup26:18'),
  (19, 'group', 'J', '2026-06-17T01:00:00.000Z', 'ARG', 'ALG', null, null, 'Kansas City Stadium', 'worldcup26:19'),
  (20, 'group', 'J', '2026-06-17T04:00:00.000Z', 'AUT', 'JOR', null, null, 'San Francisco Bay Area Stadium', 'worldcup26:20'),
  (21, 'group', 'L', '2026-06-17T23:00:00.000Z', 'GHA', 'PAN', null, null, 'Toronto Stadium', 'worldcup26:21'),
  (22, 'group', 'L', '2026-06-17T20:00:00.000Z', 'ENG', 'CRO', null, null, 'Dallas Stadium', 'worldcup26:22'),
  (23, 'group', 'K', '2026-06-17T17:00:00.000Z', 'POR', 'COD', null, null, 'Houston Stadium', 'worldcup26:23'),
  (24, 'group', 'K', '2026-06-18T02:00:00.000Z', 'UZB', 'COL', null, null, 'Mexico City Stadium', 'worldcup26:24'),
  (25, 'group', 'A', '2026-06-18T16:00:00.000Z', 'CZE', 'RSA', null, null, 'Atlanta Stadium', 'worldcup26:25'),
  (26, 'group', 'B', '2026-06-18T19:00:00.000Z', 'SUI', 'BIH', null, null, 'Los Angeles Stadium', 'worldcup26:26'),
  (27, 'group', 'B', '2026-06-18T22:00:00.000Z', 'CAN', 'QAT', null, null, 'BC Place Vancouver', 'worldcup26:27'),
  (28, 'group', 'A', '2026-06-19T01:00:00.000Z', 'MEX', 'KOR', null, null, 'Guadalajara Stadium', 'worldcup26:28'),
  (29, 'group', 'C', '2026-06-20T00:30:00.000Z', 'BRA', 'HAI', null, null, 'Philadelphia Stadium', 'worldcup26:29'),
  (30, 'group', 'C', '2026-06-19T22:00:00.000Z', 'SCO', 'MAR', null, null, 'Boston Stadium', 'worldcup26:30'),
  (31, 'group', 'D', '2026-06-20T03:00:00.000Z', 'TUR', 'PAR', null, null, 'San Francisco Bay Area Stadium', 'worldcup26:31'),
  (32, 'group', 'D', '2026-06-19T19:00:00.000Z', 'USA', 'AUS', null, null, 'Seattle Stadium', 'worldcup26:32'),
  (33, 'group', 'E', '2026-06-20T20:00:00.000Z', 'GER', 'CIV', null, null, 'Toronto Stadium', 'worldcup26:33'),
  (34, 'group', 'E', '2026-06-21T00:00:00.000Z', 'ECU', 'CUW', null, null, 'Kansas City Stadium', 'worldcup26:34'),
  (35, 'group', 'F', '2026-06-20T17:00:00.000Z', 'NED', 'SWE', null, null, 'Houston Stadium', 'worldcup26:35'),
  (36, 'group', 'F', '2026-06-21T04:00:00.000Z', 'TUN', 'JPN', null, null, 'Monterrey Stadium', 'worldcup26:36'),
  (37, 'group', 'H', '2026-06-21T22:00:00.000Z', 'URU', 'CPV', null, null, 'Miami Stadium', 'worldcup26:37'),
  (38, 'group', 'H', '2026-06-21T16:00:00.000Z', 'ESP', 'KSA', null, null, 'Atlanta Stadium', 'worldcup26:38'),
  (39, 'group', 'G', '2026-06-21T19:00:00.000Z', 'BEL', 'IRN', null, null, 'Los Angeles Stadium', 'worldcup26:39'),
  (40, 'group', 'G', '2026-06-22T01:00:00.000Z', 'NZL', 'EGY', null, null, 'BC Place Vancouver', 'worldcup26:40'),
  (41, 'group', 'I', '2026-06-23T00:00:00.000Z', 'NOR', 'SEN', null, null, 'New York/New Jersey Stadium', 'worldcup26:41'),
  (42, 'group', 'I', '2026-06-22T21:00:00.000Z', 'FRA', 'IRQ', null, null, 'Philadelphia Stadium', 'worldcup26:42'),
  (43, 'group', 'J', '2026-06-22T17:00:00.000Z', 'ARG', 'AUT', null, null, 'Dallas Stadium', 'worldcup26:43'),
  (44, 'group', 'J', '2026-06-23T03:00:00.000Z', 'JOR', 'ALG', null, null, 'San Francisco Bay Area Stadium', 'worldcup26:44'),
  (45, 'group', 'L', '2026-06-23T20:00:00.000Z', 'ENG', 'GHA', null, null, 'Boston Stadium', 'worldcup26:45'),
  (46, 'group', 'L', '2026-06-23T23:00:00.000Z', 'PAN', 'CRO', null, null, 'Toronto Stadium', 'worldcup26:46'),
  (47, 'group', 'K', '2026-06-23T17:00:00.000Z', 'POR', 'UZB', null, null, 'Houston Stadium', 'worldcup26:47'),
  (48, 'group', 'K', '2026-06-24T02:00:00.000Z', 'COL', 'COD', null, null, 'Guadalajara Stadium', 'worldcup26:48'),
  (49, 'group', 'C', '2026-06-24T22:00:00.000Z', 'SCO', 'BRA', null, null, 'Miami Stadium', 'worldcup26:49'),
  (50, 'group', 'C', '2026-06-24T22:00:00.000Z', 'MAR', 'HAI', null, null, 'Atlanta Stadium', 'worldcup26:50'),
  (51, 'group', 'B', '2026-06-24T19:00:00.000Z', 'SUI', 'CAN', null, null, 'BC Place Vancouver', 'worldcup26:51'),
  (52, 'group', 'B', '2026-06-24T19:00:00.000Z', 'BIH', 'QAT', null, null, 'Seattle Stadium', 'worldcup26:52'),
  (53, 'group', 'A', '2026-06-25T01:00:00.000Z', 'CZE', 'MEX', null, null, 'Mexico City Stadium', 'worldcup26:53'),
  (54, 'group', 'A', '2026-06-25T01:00:00.000Z', 'RSA', 'KOR', null, null, 'Monterrey Stadium', 'worldcup26:54'),
  (55, 'group', 'E', '2026-06-25T20:00:00.000Z', 'CUW', 'CIV', null, null, 'Philadelphia Stadium', 'worldcup26:55'),
  (56, 'group', 'E', '2026-06-25T20:00:00.000Z', 'ECU', 'GER', null, null, 'New York/New Jersey Stadium', 'worldcup26:56'),
  (57, 'group', 'F', '2026-06-25T23:00:00.000Z', 'JPN', 'SWE', null, null, 'Dallas Stadium', 'worldcup26:57'),
  (58, 'group', 'F', '2026-06-25T23:00:00.000Z', 'TUN', 'NED', null, null, 'Kansas City Stadium', 'worldcup26:58'),
  (59, 'group', 'D', '2026-06-26T02:00:00.000Z', 'TUR', 'USA', null, null, 'Los Angeles Stadium', 'worldcup26:59'),
  (60, 'group', 'D', '2026-06-26T02:00:00.000Z', 'PAR', 'AUS', null, null, 'San Francisco Bay Area Stadium', 'worldcup26:60'),
  (61, 'group', 'I', '2026-06-26T19:00:00.000Z', 'NOR', 'FRA', null, null, 'Boston Stadium', 'worldcup26:61'),
  (62, 'group', 'I', '2026-06-26T19:00:00.000Z', 'SEN', 'IRQ', null, null, 'Toronto Stadium', 'worldcup26:62'),
  (63, 'group', 'G', '2026-06-27T03:00:00.000Z', 'EGY', 'IRN', null, null, 'Seattle Stadium', 'worldcup26:63'),
  (64, 'group', 'G', '2026-06-27T03:00:00.000Z', 'NZL', 'BEL', null, null, 'BC Place Vancouver', 'worldcup26:64'),
  (65, 'group', 'H', '2026-06-27T00:00:00.000Z', 'CPV', 'KSA', null, null, 'Houston Stadium', 'worldcup26:65'),
  (66, 'group', 'H', '2026-06-27T00:00:00.000Z', 'URU', 'ESP', null, null, 'Guadalajara Stadium', 'worldcup26:66'),
  (67, 'group', 'L', '2026-06-27T21:00:00.000Z', 'PAN', 'ENG', null, null, 'New York/New Jersey Stadium', 'worldcup26:67'),
  (68, 'group', 'L', '2026-06-27T21:00:00.000Z', 'CRO', 'GHA', null, null, 'Philadelphia Stadium', 'worldcup26:68'),
  (69, 'group', 'J', '2026-06-28T02:00:00.000Z', 'ALG', 'AUT', null, null, 'Kansas City Stadium', 'worldcup26:69'),
  (70, 'group', 'J', '2026-06-28T02:00:00.000Z', 'JOR', 'ARG', null, null, 'Dallas Stadium', 'worldcup26:70'),
  (71, 'group', 'K', '2026-06-27T23:30:00.000Z', 'COL', 'POR', null, null, 'Miami Stadium', 'worldcup26:71'),
  (72, 'group', 'K', '2026-06-27T23:30:00.000Z', 'COD', 'UZB', null, null, 'Atlanta Stadium', 'worldcup26:72'),
  (73, 'round_of_32', null, '2026-06-28T19:00:00.000Z', 'RSA', 'CAN', '2º do Grupo A', '2º do Grupo B', 'Los Angeles Stadium', 'worldcup26:73'),
  (74, 'round_of_32', null, '2026-06-29T20:30:00.000Z', 'GER', 'PAR', '1º do Grupo E', '3º de A/B/C/D/F', 'Boston Stadium', 'worldcup26:74'),
  (75, 'round_of_32', null, '2026-06-30T01:00:00.000Z', 'NED', 'MAR', '1º do Grupo F', '2º do Grupo C', 'Monterrey Stadium', 'worldcup26:75'),
  (76, 'round_of_32', null, '2026-06-29T17:00:00.000Z', 'BRA', 'JPN', '1º do Grupo C', '2º do Grupo F', 'Houston Stadium', 'worldcup26:76'),
  (77, 'round_of_32', null, '2026-06-30T21:00:00.000Z', 'FRA', 'SWE', '1º do Grupo I', '3º de C/D/F/G/H', 'New York/New Jersey Stadium', 'worldcup26:77'),
  (78, 'round_of_32', null, '2026-06-30T17:00:00.000Z', 'CIV', 'NOR', '2º do Grupo E', '2º do Grupo I', 'Dallas Stadium', 'worldcup26:78'),
  (79, 'round_of_32', null, '2026-07-01T01:00:00.000Z', 'MEX', 'ECU', '1º do Grupo A', '3º de C/E/F/H/I', 'Mexico City Stadium', 'worldcup26:79'),
  (80, 'round_of_32', null, '2026-07-01T16:00:00.000Z', 'ENG', 'COD', '1º do Grupo L', '3º de E/H/I/J/K', 'Atlanta Stadium', 'worldcup26:80'),
  (81, 'round_of_32', null, '2026-07-02T00:00:00.000Z', 'USA', 'BIH', '1º do Grupo D', '3º de B/E/F/I/J', 'San Francisco Bay Area Stadium', 'worldcup26:81'),
  (82, 'round_of_32', null, '2026-07-01T20:00:00.000Z', 'BEL', 'SEN', '1º do Grupo G', '3º de A/E/H/I/J', 'Seattle Stadium', 'worldcup26:82'),
  (83, 'round_of_32', null, '2026-07-02T23:00:00.000Z', 'POR', 'CRO', '2º do Grupo K', '2º do Grupo L', 'Toronto Stadium', 'worldcup26:83'),
  (84, 'round_of_32', null, '2026-07-02T19:00:00.000Z', 'ESP', 'AUT', '1º do Grupo H', '2º do Grupo J', 'Los Angeles Stadium', 'worldcup26:84'),
  (85, 'round_of_32', null, '2026-07-03T03:00:00.000Z', 'SUI', 'ALG', '1º do Grupo B', '3º de E/F/G/I/J', 'BC Place Vancouver', 'worldcup26:85'),
  (86, 'round_of_32', null, '2026-07-03T22:00:00.000Z', 'ARG', 'CPV', '1º do Grupo J', '2º do Grupo H', 'Miami Stadium', 'worldcup26:86'),
  (87, 'round_of_32', null, '2026-07-04T01:30:00.000Z', 'COL', 'GHA', '1º do Grupo K', '3º de D/E/I/J/L', 'Kansas City Stadium', 'worldcup26:87'),
  (88, 'round_of_32', null, '2026-07-03T18:00:00.000Z', 'AUS', 'EGY', '2º do Grupo D', '2º do Grupo G', 'Dallas Stadium', 'worldcup26:88'),
  (89, 'round_of_16', null, '2026-07-04T21:00:00.000Z', null, null, 'Vencedor da partida 74', 'Vencedor da partida 77', 'Philadelphia Stadium', 'worldcup26:89'),
  (90, 'round_of_16', null, '2026-07-04T17:00:00.000Z', null, null, 'Vencedor da partida 73', 'Vencedor da partida 75', 'Houston Stadium', 'worldcup26:90'),
  (91, 'round_of_16', null, '2026-07-05T20:00:00.000Z', null, null, 'Vencedor da partida 76', 'Vencedor da partida 78', 'New York/New Jersey Stadium', 'worldcup26:91'),
  (92, 'round_of_16', null, '2026-07-06T00:00:00.000Z', null, null, 'Vencedor da partida 79', 'Vencedor da partida 80', 'Mexico City Stadium', 'worldcup26:92'),
  (93, 'round_of_16', null, '2026-07-06T19:00:00.000Z', null, null, 'Vencedor da partida 83', 'Vencedor da partida 84', 'Dallas Stadium', 'worldcup26:93'),
  (94, 'round_of_16', null, '2026-07-07T00:00:00.000Z', null, null, 'Vencedor da partida 81', 'Vencedor da partida 82', 'Seattle Stadium', 'worldcup26:94'),
  (95, 'round_of_16', null, '2026-07-07T16:00:00.000Z', null, null, 'Vencedor da partida 86', 'Vencedor da partida 88', 'Atlanta Stadium', 'worldcup26:95'),
  (96, 'round_of_16', null, '2026-07-07T20:00:00.000Z', null, null, 'Vencedor da partida 85', 'Vencedor da partida 87', 'BC Place Vancouver', 'worldcup26:96'),
  (97, 'quarter_final', null, '2026-07-09T20:00:00.000Z', null, null, 'Vencedor da partida 89', 'Vencedor da partida 90', 'Boston Stadium', 'worldcup26:97'),
  (98, 'quarter_final', null, '2026-07-10T19:00:00.000Z', null, null, 'Vencedor da partida 93', 'Vencedor da partida 94', 'Los Angeles Stadium', 'worldcup26:98'),
  (99, 'quarter_final', null, '2026-07-11T21:00:00.000Z', null, null, 'Vencedor da partida 91', 'Vencedor da partida 92', 'Miami Stadium', 'worldcup26:99'),
  (100, 'quarter_final', null, '2026-07-12T01:00:00.000Z', null, null, 'Vencedor da partida 95', 'Vencedor da partida 96', 'Kansas City Stadium', 'worldcup26:100'),
  (101, 'semi_final', null, '2026-07-14T19:00:00.000Z', null, null, 'Vencedor da partida 97', 'Vencedor da partida 98', 'Dallas Stadium', 'worldcup26:101'),
  (102, 'semi_final', null, '2026-07-15T19:00:00.000Z', null, null, 'Vencedor da partida 99', 'Vencedor da partida 100', 'Atlanta Stadium', 'worldcup26:102'),
  (103, 'third_place', null, '2026-07-18T21:00:00.000Z', null, null, 'Perdedor da partida 101', 'Perdedor da partida 102', 'Miami Stadium', 'worldcup26:103'),
  (104, 'final', null, '2026-07-19T19:00:00.000Z', null, null, 'Vencedor da partida 101', 'Vencedor da partida 102', 'New York/New Jersey Stadium', 'worldcup26:104');

do $$
declare
  v_tournament_id uuid;
  v_updated integer;
  v_missing_codes text;
begin
  select id
  into v_tournament_id
  from public.tournaments
  where is_active
  order by starts_at desc
  limit 1;

  if v_tournament_id is null then
    raise exception 'active tournament not found' using errcode = 'P0001';
  end if;

  select string_agg(code, ', ' order by code)
  into v_missing_codes
  from (
    select distinct code
    from (
      select home_code as code from official_fifa_schedule_update where home_code is not null
      union all
      select away_code as code from official_fifa_schedule_update where away_code is not null
    ) all_codes
    where not exists (
      select 1
      from public.teams team
      where team.tournament_id = v_tournament_id
        and team.code = all_codes.code
    )
  ) missing;

  if v_missing_codes is not null then
    raise exception 'official FIFA schedule references unknown team codes: %', v_missing_codes
      using errcode = 'P0001';
  end if;

  update public.matches match
  set
    stage = official.stage::public.match_stage,
    group_name = official.group_name,
    scheduled_at = official.scheduled_at,
    prediction_lock_at = official.scheduled_at,
    home_team_id = home_team.id,
    away_team_id = away_team.id,
    home_placeholder = official.home_placeholder,
    away_placeholder = official.away_placeholder,
    venue = official.venue,
    provider_match_id = official.provider_match_id,
    finalized_at = case
      when match.finalized_at is not null and match.finalized_at < official.scheduled_at
        then official.scheduled_at
      else match.finalized_at
    end,
    updated_at = now()
  from official_fifa_schedule_update official
  left join public.teams home_team
    on home_team.tournament_id = v_tournament_id
    and home_team.code = official.home_code
  left join public.teams away_team
    on away_team.tournament_id = v_tournament_id
    and away_team.code = official.away_code
  where match.tournament_id = v_tournament_id
    and match.match_number = official.match_number;

  get diagnostics v_updated = row_count;
  if v_updated <> 104 then
    raise exception 'official FIFA schedule updated % matches; expected 104', v_updated
      using errcode = 'P0001';
  end if;
end $$;

commit;
