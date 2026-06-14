begin;

create table public.special_markets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]{3,80}$'),
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '',
  value_type text not null check (value_type in ('player', 'team', 'team_set')),
  option_source text not null check (option_source in ('players', 'goalkeepers', 'teams')),
  automatic_key text check (
    automatic_key is null
    or automatic_key in ('team_most_goals', 'team_fewest_conceded')
  ),
  pick_count smallint not null default 1 check (pick_count between 1 and 8),
  lock_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'void')),
  exact_points smallint not null check (exact_points >= 0),
  partial_points smallint not null default 0 check (partial_points >= 0),
  sort_order smallint not null default 100,
  scoring_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, key)
);

create trigger special_markets_set_updated_at
before update on public.special_markets
for each row execute function public.set_updated_at();

create table public.special_predictions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  market_id uuid not null references public.special_markets(id) on delete cascade,
  position smallint not null check (position between 1 and 8),
  option_key text not null check (char_length(option_key) between 3 and 160),
  option_label text not null check (char_length(option_label) between 2 and 120),
  option_team_id uuid references public.teams(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, market_id, position)
);

create index special_predictions_market_idx
  on public.special_predictions(market_id);

create trigger special_predictions_set_updated_at
before update on public.special_predictions
for each row execute function public.set_updated_at();

create table public.special_market_results (
  market_id uuid not null references public.special_markets(id) on delete cascade,
  position smallint not null check (position between 1 and 8),
  option_key text not null check (char_length(option_key) between 3 and 160),
  option_label text not null check (char_length(option_label) between 2 and 120),
  option_team_id uuid references public.teams(id) on delete restrict,
  source text not null default 'manual' check (char_length(source) between 3 and 80),
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  primary key (market_id, position)
);

create index special_market_results_market_idx
  on public.special_market_results(market_id);

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
    greatest(v_tournament.starts_at + interval '7 days', now() + interval '3 days')
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

create or replace function public.validate_special_option_team(
  p_market public.special_markets,
  p_option_key text,
  p_team_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_market.value_type in ('team', 'team_set') and p_team_id is null then
    raise exception 'team predictions require a team option' using errcode = '22023';
  end if;

  if p_market.value_type = 'player' and p_team_id is null then
    raise exception 'player predictions require a player team' using errcode = '22023';
  end if;

  if p_market.value_type = 'player' and p_option_key !~ '^player:[A-Z0-9]{3}:[0-9]{1,2}:' then
    raise exception 'invalid player option' using errcode = '22023';
  end if;

  if p_team_id is not null and not exists (
    select 1
    from public.teams team
    where team.id = p_team_id
      and team.tournament_id = p_market.tournament_id
  ) then
    raise exception 'team option does not belong to the active tournament' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.save_special_prediction(
  p_market_key text,
  p_options jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_market public.special_markets;
  v_item record;
  v_count integer;
  v_distinct_count integer;
  v_key text;
  v_label text;
  v_team_text text;
  v_team_id uuid;
begin
  perform public.assert_account_ready();

  select market.*
  into v_market
  from public.special_markets market
  join public.tournaments tournament on tournament.id = market.tournament_id
  where tournament.is_active
    and market.key = trim(p_market_key)
  for update;

  if not found then
    raise exception 'special market not found' using errcode = 'P0002';
  end if;

  if v_market.status <> 'open' or now() >= v_market.lock_at then
    raise exception 'special predictions are locked for this market' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_options) <> 'array' then
    raise exception 'options must be an array' using errcode = '22023';
  end if;

  select count(*), count(distinct option_item.value ->> 'key')
  into v_count, v_distinct_count
  from jsonb_array_elements(p_options) option_item(value);

  if v_count <> v_market.pick_count then
    raise exception 'this market expects % option(s)', v_market.pick_count using errcode = '22023';
  end if;

  if v_distinct_count <> v_count then
    raise exception 'duplicated options are not allowed' using errcode = '22023';
  end if;

  delete from public.special_predictions
  where user_id = v_user_id
    and market_id = v_market.id;

  for v_item in
    select option_item.value, option_item.ordinality::smallint as position
    from jsonb_array_elements(p_options) with ordinality as option_item(value, ordinality)
    order by option_item.ordinality
  loop
    v_key := trim(coalesce(v_item.value ->> 'key', ''));
    v_label := trim(coalesce(v_item.value ->> 'label', ''));
    v_team_text := nullif(trim(coalesce(v_item.value ->> 'team_id', '')), '');
    v_team_id := null;

    if char_length(v_key) not between 3 and 160 then
      raise exception 'invalid option key' using errcode = '22023';
    end if;

    if char_length(v_label) not between 2 and 120 then
      raise exception 'invalid option label' using errcode = '22023';
    end if;

    if v_team_text is not null then
      begin
        v_team_id := v_team_text::uuid;
      exception when invalid_text_representation then
        raise exception 'invalid team id' using errcode = '22023';
      end;
    end if;

    perform public.validate_special_option_team(v_market, v_key, v_team_id);

    insert into public.special_predictions (
      user_id,
      market_id,
      position,
      option_key,
      option_label,
      option_team_id
    )
    values (
      v_user_id,
      v_market.id,
      v_item.position,
      v_key,
      v_label,
      v_team_id
    );
  end loop;

  return true;
end;
$$;

create or replace function public.set_special_market_result(
  p_market_key text,
  p_options jsonb,
  p_reason text,
  p_source text default 'manual'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.special_markets;
  v_item record;
  v_count integer;
  v_distinct_count integer;
  v_key text;
  v_label text;
  v_team_text text;
  v_team_id uuid;
  v_source text := coalesce(nullif(trim(p_source), ''), 'manual');
begin
  if not public.is_admin() then
    raise exception 'administrator permission required' using errcode = '42501';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  select market.*
  into v_market
  from public.special_markets market
  join public.tournaments tournament on tournament.id = market.tournament_id
  where tournament.is_active
    and market.key = trim(p_market_key)
  for update;

  if not found then
    raise exception 'special market not found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_options) <> 'array' then
    raise exception 'options must be an array' using errcode = '22023';
  end if;

  select count(*), count(distinct option_item.value ->> 'key')
  into v_count, v_distinct_count
  from jsonb_array_elements(p_options) option_item(value);

  if v_count <> v_market.pick_count then
    raise exception 'this market expects % result option(s)', v_market.pick_count using errcode = '22023';
  end if;

  if v_distinct_count <> v_count then
    raise exception 'duplicated result options are not allowed' using errcode = '22023';
  end if;

  delete from public.special_market_results
  where market_id = v_market.id;

  for v_item in
    select option_item.value, option_item.ordinality::smallint as position
    from jsonb_array_elements(p_options) with ordinality as option_item(value, ordinality)
    order by option_item.ordinality
  loop
    v_key := trim(coalesce(v_item.value ->> 'key', ''));
    v_label := trim(coalesce(v_item.value ->> 'label', ''));
    v_team_text := nullif(trim(coalesce(v_item.value ->> 'team_id', '')), '');
    v_team_id := null;

    if char_length(v_key) not between 3 and 160 then
      raise exception 'invalid result key' using errcode = '22023';
    end if;

    if char_length(v_label) not between 2 and 120 then
      raise exception 'invalid result label' using errcode = '22023';
    end if;

    if v_team_text is not null then
      begin
        v_team_id := v_team_text::uuid;
      exception when invalid_text_representation then
        raise exception 'invalid team id' using errcode = '22023';
      end;
    end if;

    perform public.validate_special_option_team(v_market, v_key, v_team_id);

    insert into public.special_market_results (
      market_id,
      position,
      option_key,
      option_label,
      option_team_id,
      source,
      confirmed_by
    )
    values (
      v_market.id,
      v_item.position,
      v_key,
      v_label,
      v_team_id,
      v_source,
      auth.uid()
    );
  end loop;

  update public.special_markets
  set status = 'resolved'
  where id = v_market.id;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'set_special_market_result',
    'special_market',
    v_market.key,
    jsonb_build_object(
      'reason', trim(p_reason),
      'source', v_source,
      'options', p_options
    )
  );

  return true;
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
    group by member.user_id, profile.display_name, profile.avatar_url
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
    totals.avatar_url,
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

alter table public.special_markets enable row level security;
alter table public.special_predictions enable row level security;
alter table public.special_market_results enable row level security;

create policy "special markets are public"
on public.special_markets for select
to anon, authenticated
using (true);

create policy "special results are public"
on public.special_market_results for select
to anon, authenticated
using (true);

create policy "special predictions visible to owner and shared pools after lock"
on public.special_predictions for select
to authenticated
using (
  user_id = auth.uid()
  or (
    public.shares_pool_with(user_id)
    and exists (
      select 1
      from public.special_markets market
      where market.id = market_id and now() >= market.lock_at
    )
  )
);

grant select on public.special_markets, public.special_market_results to anon, authenticated;
grant select on public.special_predictions to authenticated;

revoke all on function public.ensure_default_special_markets() from public, anon, authenticated;
revoke all on function public.validate_special_option_team(public.special_markets, text, uuid) from public, anon, authenticated;
revoke all on function public.save_special_prediction(text, jsonb) from public, anon, authenticated;
revoke all on function public.set_special_market_result(text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.get_special_pool_ranking(uuid) from public, anon, authenticated;

grant execute on function public.ensure_default_special_markets() to service_role;
grant execute on function public.save_special_prediction(text, jsonb) to authenticated;
grant execute on function public.set_special_market_result(text, jsonb, text, text) to authenticated;
grant execute on function public.get_special_pool_ranking(uuid) to authenticated;

select public.ensure_default_special_markets();

commit;
