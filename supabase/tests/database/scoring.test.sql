begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select is(
  (select base_points from public.calculate_base_points(2, 1, 2, 1)),
  10::smallint,
  'placar exato vale 10'
);

select is(
  (select base_points from public.calculate_base_points(3, 2, 2, 1)),
  7::smallint,
  'vencedor e saldo corretos valem 7'
);

select is(
  (select base_points from public.calculate_base_points(2, 0, 2, 1)),
  7::smallint,
  'vencedor e um placar correto valem 7'
);

select is(
  (select base_points from public.calculate_base_points(4, 0, 2, 1)),
  5::smallint,
  'somente resultado correto vale 5'
);

select is(
  (select base_points from public.calculate_base_points(2, 2, 2, 1)),
  2::smallint,
  'um placar correto com resultado errado vale 2'
);

select is(
  (select base_points from public.calculate_base_points(0, 2, 2, 1)),
  0::smallint,
  'erro completo vale zero'
);

select is(
  (select base_points from public.calculate_base_points(1, 1, 3, 3)),
  5::smallint,
  'empate não exato vale resultado correto, não refinado'
);

select is(
  public.match_stage_multiplier('final'),
  5::smallint,
  'final multiplica por cinco'
);

select is(
  (
    select total_points
    from public.calculate_prediction_score(
      1,
      1,
      1,
      1,
      'semi_final',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001'
    )
  ),
  43::smallint,
  'semifinal exata mais avanço vale 43'
);

select is(
  (
    select advancement_points
    from public.calculate_prediction_score(
      2,
      1,
      2,
      1,
      'third_place',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001'
    )
  ),
  0::smallint,
  'terceiro lugar não concede bônus de avanço'
);

select * from finish();

rollback;
