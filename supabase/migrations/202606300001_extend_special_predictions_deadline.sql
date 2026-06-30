create or replace function public.ensure_default_special_markets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_lock_at timestamptz;
  v_inserted integer;
begin
  select *
  into v_tournament
  from public.tournaments
  where is_active
  order by starts_at desc
  limit 1;

  if not found then
    return 0;
  end if;

  v_lock_at := least(
    v_tournament.ends_at,
    timestamptz '2026-07-04 16:59:00+00'
  );

  with defaults (
    key,
    title,
    description,
    value_type,
    option_source,
    automatic_key,
    pick_count,
    exact_points,
    partial_points,
    sort_order,
    scoring_note
  ) as (
    values
      (
        'top_scorer',
        'Artilheiro da Copa',
        'Quem termina a Copa com mais gols.',
        'player',
        'players',
        null,
        1,
        30,
        5,
        10,
        '30 pts pelo jogador. 5 pts se acertar a seleção do artilheiro.'
      ),
      (
        'top_assists',
        'Líder em assistências',
        'Quem mais serve gols durante a Copa.',
        'player',
        'players',
        null,
        1,
        25,
        5,
        20,
        '25 pts pelo jogador. 5 pts se acertar a seleção.'
      ),
      (
        'golden_glove',
        'Luva de Ouro',
        'Quem será eleito o melhor goleiro da Copa.',
        'player',
        'goalkeepers',
        null,
        1,
        25,
        5,
        30,
        '25 pts pelo goleiro. 5 pts se acertar a seleção.'
      ),
      (
        'golden_ball',
        'Bola de Ouro',
        'Quem será eleito o melhor jogador da Copa.',
        'player',
        'players',
        null,
        1,
        30,
        5,
        40,
        '30 pts pelo jogador. 5 pts se acertar a seleção.'
      ),
      (
        'team_most_goals',
        'Seleção com mais gols',
        'Qual seleção termina a Copa com o ataque mais produtivo.',
        'team',
        'teams',
        'team_most_goals',
        1,
        25,
        0,
        50,
        '25 pts pela seleção correta. O painel admin mostra sugestão automática pelo placar atual.'
      ),
      (
        'team_fewest_conceded',
        'Defesa menos vazada',
        'Qual seleção sofre menos gols entre as que entrarem em campo.',
        'team',
        'teams',
        'team_fewest_conceded',
        1,
        25,
        0,
        60,
        '25 pts pela seleção correta. O painel admin mostra sugestão automática pelo placar atual.'
      ),
      (
        'champion',
        'Campeão',
        'Quem levanta a taça.',
        'team',
        'teams',
        null,
        1,
        35,
        0,
        70,
        '35 pts pelo campeão correto.'
      ),
      (
        'runner_up',
        'Vice-campeão',
        'Quem fica com o segundo lugar.',
        'team',
        'teams',
        null,
        1,
        25,
        0,
        80,
        '25 pts pelo vice correto.'
      ),
      (
        'semifinalists',
        'Semifinalistas',
        'Escolha as quatro seleções que chegam às semifinais.',
        'team_set',
        'teams',
        null,
        4,
        10,
        0,
        90,
        '10 pts por semifinalista correto.'
      )
  ),
  upserted as (
    insert into public.special_markets (
      tournament_id,
      key,
      title,
      description,
      value_type,
      option_source,
      automatic_key,
      pick_count,
      lock_at,
      exact_points,
      partial_points,
      sort_order,
      scoring_note
    )
    select
      v_tournament.id,
      defaults.key,
      defaults.title,
      defaults.description,
      defaults.value_type,
      defaults.option_source,
      defaults.automatic_key,
      defaults.pick_count,
      v_lock_at,
      defaults.exact_points,
      defaults.partial_points,
      defaults.sort_order,
      defaults.scoring_note
    from defaults
    on conflict (tournament_id, key) do update
    set
      title = excluded.title,
      description = excluded.description,
      value_type = excluded.value_type,
      option_source = excluded.option_source,
      automatic_key = excluded.automatic_key,
      pick_count = excluded.pick_count,
      lock_at = excluded.lock_at,
      exact_points = excluded.exact_points,
      partial_points = excluded.partial_points,
      sort_order = excluded.sort_order,
      scoring_note = excluded.scoring_note
    returning 1
  )
  select count(*) into v_inserted from upserted;

  return v_inserted;
end;
$$;

grant execute on function public.ensure_default_special_markets() to service_role;

select public.ensure_default_special_markets();
