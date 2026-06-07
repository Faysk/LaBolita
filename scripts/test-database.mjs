import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const USER_ONE = "10000000-0000-0000-0000-000000000001";
const USER_TWO = "10000000-0000-0000-0000-000000000002";
const USER_THREE = "10000000-0000-0000-0000-000000000003";
const MATCH_ID = "20260000-0000-0000-0002-000000000001";
const KNOCKOUT_MATCH_ID = "20260000-0000-0000-0002-000000000002";
const UNRESOLVED_MATCH_ID = "20260000-0000-0000-0002-000000000003";
const FOLLOWUP_MATCH_ID = "20260000-0000-0000-0002-000000000004";
const THIRD_PLACE_MATCH_ID = "20260000-0000-0000-0002-000000000005";
const HOME_TEAM_ID = "20260000-0000-0000-0001-000000000001";
const AWAY_TEAM_ID = "20260000-0000-0000-0001-000000000002";

const db = new PGlite();

try {
  await bootstrapSupabasePrimitives();
  await applyProjectSql();
  await verifySeedAndScoring();
  await verifyPredictionPrivacyAndResultCorrection();
  console.log("Database smoke test passed");
} finally {
  await db.close();
}

async function bootstrapSupabasePrimitives() {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;

    create schema auth;

    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );

    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('app.test_uid', true), '')::uuid
    $$;

    create function auth.role()
    returns text
    language sql
    stable
    as $$
      select coalesce(nullif(current_setting('app.test_role', true), ''), 'anon')
    $$;

    create function public.gen_random_bytes(byte_count integer)
    returns bytea
    language sql
    volatile
    as $$
      select substring(decode(md5(random()::text), 'hex') from 1 for byte_count)
    $$;
  `);
}

async function applyProjectSql() {
  const migrations = (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of migrations) {
    let migration = await readFile(`supabase/migrations/${name}`, "utf8");
    migration = migration.replace(
      "create extension if not exists pgcrypto;",
      "-- pgcrypto primitives supplied by the embedded smoke test",
    );
    await db.exec(migration);
  }

  await db.exec(await readFile("supabase/seed.sql", "utf8"));
}

async function verifySeedAndScoring() {
  assert.equal(await scalar("select count(*)::integer from public.tournaments"), 1);
  assert.equal(await scalar("select count(*)::integer from public.matches"), 1);
  assert.equal(await scalar("select count(*)::integer from public.results_sync_state"), 1);
  assert.equal(
    await scalar(
      "select base_points::integer from public.calculate_base_points(2, 1, 2, 1)",
    ),
    10,
  );
  assert.equal(
    await scalar(`
      select total_points::integer
      from public.calculate_prediction_score(
        1,
        1,
        1,
        1,
        'semi_final',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001'
      )
    `),
    43,
  );

  await assert.rejects(
    db.exec(`
      insert into public.matches (
        tournament_id,
        match_number,
        stage,
        scheduled_at,
        prediction_lock_at
      )
      values (
        '20260000-0000-0000-0000-000000000001',
        999,
        'group',
        now(),
        now() + interval '1 minute'
      )
    `),
    "prediction lock after kickoff must be rejected by a table constraint",
  );

  const expectedMultipliers = {
    group: 1,
    round_of_32: 1,
    round_of_16: 2,
    quarter_final: 3,
    semi_final: 4,
    third_place: 2,
    final: 5,
  };
  for (const [stage, expected] of Object.entries(expectedMultipliers)) {
    assert.equal(
      await scalar("select public.match_stage_multiplier($1::public.match_stage)::integer", [
        stage,
      ]),
      expected,
    );
  }

  await asService(async () => {
    assert.equal(
      await scalar("select public.apply_results_sync_updates($1::jsonb)", [
        JSON.stringify([
          {
            id: MATCH_ID,
            live_home_score: null,
            live_away_score: null,
            provider_status: "scheduled",
            provider_updated_at: new Date().toISOString(),
          },
        ]),
      ]),
      1,
      "provider updates must be applied through one database transaction",
    );
  });
}

async function verifyPredictionPrivacyAndResultCorrection() {
  let secondPoolId;
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data)
    values
      ('${USER_ONE}', 'owner@example.com', '{"full_name":"Owner"}'),
      ('${USER_TWO}', 'member@example.com', '{"full_name":"Member"}'),
      ('${USER_THREE}', 'late@example.com', '{"full_name":"Late Member"}');

    update public.profiles
    set is_admin = true, is_master_admin = true
    where id = '${USER_ONE}';

    insert into public.matches (
      id,
      tournament_id,
      match_number,
      stage,
      home_team_id,
      away_team_id,
      scheduled_at,
      prediction_lock_at,
      venue
    )
    values (
      '${KNOCKOUT_MATCH_ID}',
      '20260000-0000-0000-0000-000000000001',
      2,
      'final',
      '${HOME_TEAM_ID}',
      '${AWAY_TEAM_ID}',
      now() + interval '2 days',
      now() + interval '2 days',
      'Estádio Teste'
    ), (
      '${UNRESOLVED_MATCH_ID}',
      '20260000-0000-0000-0000-000000000001',
      3,
      'round_of_32',
      null,
      null,
      now() + interval '3 days',
      now() + interval '3 days',
      'Estádio Teste'
    ), (
      '${FOLLOWUP_MATCH_ID}',
      '20260000-0000-0000-0000-000000000001',
      4,
      'round_of_16',
      null,
      null,
      now() + interval '4 days',
      now() + interval '4 days',
      'Estádio Teste'
    ), (
      '${THIRD_PLACE_MATCH_ID}',
      '20260000-0000-0000-0000-000000000001',
      5,
      'third_place',
      '${HOME_TEAM_ID}',
      '${AWAY_TEAM_ID}',
      now() + interval '5 days',
      now() + interval '5 days',
      'Estádio Teste'
    );

    update public.matches
    set
      home_placeholder = '1º do Grupo A',
      away_placeholder = '2º do Grupo B'
    where id = '${UNRESOLVED_MATCH_ID}';

    update public.matches
    set
      home_placeholder = 'Vencedor da partida 3',
      away_placeholder = 'Vencedor da partida 2'
    where id = '${FOLLOWUP_MATCH_ID}';
  `);

  await asUser(USER_ONE, async () => {
    await db.query("select public.master_set_terms_enforcement(true, 'ativação de teste')");
    await assert.rejects(
      db.query("select public.save_prediction($1, 2, 1, null)", [MATCH_ID]),
      "predictions must require terms acceptance",
    );
    await db.query("select public.accept_terms('2026-06-07')");
    await db.query("select public.save_prediction($1, 2, 1, null)", [MATCH_ID]);
    await assert.rejects(
      db.query("select public.save_prediction($1, 1, 1, null)", [KNOCKOUT_MATCH_ID]),
      "knockout predictions must require an advancing team",
    );
    await db.query("select public.save_prediction($1, 1, 1, $2)", [
      KNOCKOUT_MATCH_ID,
      HOME_TEAM_ID,
    ]);
    await assert.rejects(
      db.query("select public.save_prediction($1, 1, 1, null)", [THIRD_PLACE_MATCH_ID]),
      "third-place predictions must require a winning team",
    );
    await db.query("select public.save_prediction($1, 1, 1, $2)", [
      THIRD_PLACE_MATCH_ID,
      AWAY_TEAM_ID,
    ]);
    await db.query("select public.create_pool_with_flag('Bolão Teste', true, 'pt')");
    await db.query("select public.assign_match_teams($1, $2, $3, 'classificação oficial')", [
      UNRESOLVED_MATCH_ID,
      HOME_TEAM_ID,
      AWAY_TEAM_ID,
    ]);
  });

  await db.exec(
    "update public.app_settings set current_terms_version = '2026-06-08' where id",
  );
  await asUser(USER_ONE, async () => {
    await assert.rejects(
      db.query("select public.save_prediction($1, 1, 0, null)", [MATCH_ID]),
      "a newer terms version must require a fresh acceptance",
    );
  });
  await db.exec(
    "update public.app_settings set current_terms_version = '2026-06-07' where id",
  );

  await asUser(USER_THREE, async () => {
    await db.query("select public.accept_terms('2026-06-07')");
    assert.equal(
      await scalar("select count(*)::integer from public.pools"),
      0,
      "public discovery must not expose pool rows or invite codes directly",
    );
    await db.query("select public.save_prediction($1, 2, 1, null)", [MATCH_ID]);
  });

  const inviteCode = await scalar("select invite_code from public.pools limit 1");
  const publicPoolId = await scalar("select id from public.pools limit 1");
  assert.match(inviteCode, /^[A-F0-9]{12}$/);
  assert.equal(await scalar("select flag_code from public.pools where id = $1", [publicPoolId]), "pt");

  await asAnon(async () => {
    assert.equal(
      await scalar("select count(*)::integer from public.get_public_pools(null, 9, 0)"),
      1,
      "anonymous visitors can discover active public pools",
    );
    assert.equal(
      await scalar(
        "select count(*)::integer from public.get_public_pool_ranking($1, 25, 0)",
        [publicPoolId],
      ),
      1,
      "anonymous visitors can see public rankings",
    );
  });

  await asUser(USER_TWO, async () => {
    await db.query("select public.accept_terms('2026-06-07')");
    await db.query("select public.join_pool($1)", [inviteCode]);
    assert.equal(
      await scalar("select member_count::integer from public.get_my_pools() where pool_id = $1", [
        publicPoolId,
      ]),
      2,
      "the private pool overview must aggregate member counts in one query",
    );
    await db.query("select public.create_pool('Bolão Arquivável', true)");
    secondPoolId = await scalar("select id from public.pools where owner_id = $1", [USER_TWO]);
    await db.query("select public.update_pool($1, 'Bolão Arquivável', true, true, 'encerrado pelo dono')", [
      secondPoolId,
    ]);
    await assert.rejects(
      db.query("select public.update_pool($1, 'Bolão Arquivável', true, false, 'tentativa de recuperar')", [
        secondPoolId,
      ]),
      "only the master administrator can restore archived pools",
    );
    await assert.rejects(
      db.query(
        "insert into public.predictions (user_id, match_id, home_score, away_score) values ($1, $2, 0, 0)",
        [USER_TWO, MATCH_ID],
      ),
      "direct prediction writes must be denied",
    );
    assert.equal(
      await scalar("select count(*)::integer from public.predictions"),
      0,
      "a shared-pool prediction must stay hidden before lock",
    );
    assert.equal(
      await scalar("select count(*)::integer from public.profiles"),
      1,
      "another pool member's full profile must stay private",
    );
    await assert.rejects(
      db.query("update public.profiles set is_admin = true where id = $1", [USER_TWO]),
      "users must not be able to grant themselves administrator permission",
    );
  });

  await asUser(USER_ONE, async () => {
    await assert.rejects(
      db.query("select public.finalize_match($1, 2, 1, null, 'cedo demais')", [MATCH_ID]),
      "finalization must be rejected before prediction lock",
    );
  });

  await asUser(USER_ONE, async () => {
    await db.query("select public.admin_update_user_access($1, true, 'promoção de teste')", [USER_TWO]);
  });
  await asUser(USER_TWO, async () => {
    assert.ok(
      (await scalar("select count(*)::integer from public.master_list_users(null, 100, 0)")) >= 2,
      "promoted administrators must access global administration",
    );
    await assert.rejects(
      db.query("select public.admin_update_user_access($1, false, 'tentativa contra master')", [USER_ONE]),
      "promoted administrators cannot demote the principal master",
    );
    await assert.rejects(
      db.query("select public.master_update_user($1, 'Outro Master', false, 'tentativa contra master')", [USER_ONE]),
      "promoted administrators cannot alter the principal master",
    );
  });
  await asUser(USER_ONE, async () => {
    await db.query("select public.admin_update_user_access($1, false, 'fim da promoção de teste')", [USER_TWO]);
  });

  await db.exec(`update public.profiles set is_admin = true where id = '${USER_TWO}'`);

  await asUser(USER_ONE, async () => {
    await db.query("select public.update_pool($1, 'Bolão Recuperado', false, false, 'recuperação master')", [
      secondPoolId,
    ]);
    await db.query("select public.master_update_user($1, 'Member', true, 'suspensão de teste')", [
      USER_TWO,
    ]);
  });

  await asUser(USER_TWO, async () => {
    assert.equal(
      await scalar("select public.is_admin()"),
      false,
      "disabled administrators must lose effective administrator permission",
    );
    await assert.rejects(
      db.query("select public.save_prediction($1, 1, 0, null)", [MATCH_ID]),
      "disabled users must not save predictions",
    );
    await assert.rejects(
      db.query("select public.assign_match_teams($1, $2, $3, 'tentativa suspensa')", [
        UNRESOLVED_MATCH_ID,
        HOME_TEAM_ID,
        AWAY_TEAM_ID,
      ]),
      "disabled administrators must not assign knockout participants",
    );
  });

  await asUser(USER_ONE, async () => {
    await db.query("select public.master_update_user($1, 'Member', false, 'restauração de teste')", [
      USER_TWO,
    ]);
  });
  await db.exec(`update public.profiles set is_admin = false where id = '${USER_TWO}'`);

  await db.exec(`
    update public.matches
    set
      scheduled_at = now() + interval '1 hour',
      prediction_lock_at = now() - interval '1 minute'
    where id = '${MATCH_ID}';
  `);

  await asUser(USER_ONE, async () => {
    await assert.rejects(
      db.query("select public.finalize_match($1, 2, 1, null, 'antes do jogo')", [MATCH_ID]),
      "finalization must be rejected before kickoff even when predictions are locked",
    );
  });

  await db.exec(`
    update public.matches
    set
      scheduled_at = now() - interval '1 hour',
      prediction_lock_at = now() - interval '1 hour'
    where id = '${MATCH_ID}';

    update public.pool_members
    set eligible_from = now() - interval '2 hours'
    where user_id in ('${USER_ONE}', '${USER_TWO}');
  `);

  await asUser(USER_TWO, async () => {
    await assert.rejects(
      db.query("select public.save_prediction($1, 0, 0, null)", [MATCH_ID]),
      "predictions must be rejected after lock",
    );
    assert.equal(
      await scalar("select count(*)::integer from public.predictions"),
      1,
      "a shared-pool prediction must become visible after lock",
    );
    await assert.rejects(
      db.query("select public.finalize_match($1, 2, 1, null, 'tentativa indevida')", [
        MATCH_ID,
      ]),
      "non-admin users must not finalize matches",
    );
    await assert.rejects(
      db.query("select public.assign_match_teams($1, $2, $3, 'tentativa indevida')", [
        UNRESOLVED_MATCH_ID,
        HOME_TEAM_ID,
        AWAY_TEAM_ID,
      ]),
      "non-admin users must not assign knockout participants",
    );
  });

  await asUser(USER_ONE, async () => {
    await assert.rejects(
      db.query(
        "select public.update_match_schedule($1, now() + interval '1 hour', now() + interval '1 hour', 'scheduled', 'adiamento', false)",
        [MATCH_ID],
      ),
      "a locked match must not reopen predictions implicitly",
    );
    await db.query(
      "select public.update_match_schedule($1, now() + interval '1 hour', now() + interval '1 hour', 'scheduled', 'reabertura comunicada', true)",
      [MATCH_ID],
    );
    await db.query(
      "select public.update_match_schedule($1, now() - interval '1 hour', now() - interval '1 hour', 'scheduled', 'retorno ao teste', false)",
      [MATCH_ID],
    );
  });

  await asUser(USER_ONE, async () => {
    await db.query("select public.finalize_match($1, 2, 1, null, 'resultado inicial')", [
      MATCH_ID,
    ]);
    assert.equal(
      await scalar(
        "select total_points::integer from public.prediction_scores where match_id = $1",
        [MATCH_ID],
      ),
      10,
    );

    await assert.rejects(
      db.query("select public.finalize_match($1, 3, 0, null, null)", [MATCH_ID]),
      "result corrections must require a reason",
    );

    await db.query("select public.finalize_match($1, 3, 0, null, 'correção oficial')", [
      MATCH_ID,
    ]);
    assert.equal(
      await scalar(
        "select total_points::integer from public.prediction_scores where match_id = $1",
        [MATCH_ID],
      ),
      5,
      "a correction must replace, not accumulate, the previous score",
    );

    await db.query(
      "select public.update_match_schedule($1, now() - interval '1 hour', now() - interval '1 hour', 'scheduled', 'teste de progressão', false)",
      [UNRESOLVED_MATCH_ID],
    );
    await db.query(
      "select public.finalize_match($1, 1, 1, $2, 'resultado mata-mata')",
      [UNRESOLVED_MATCH_ID, HOME_TEAM_ID],
    );
    assert.equal(
      await scalar("select home_team_id from public.matches where id = $1", [
        FOLLOWUP_MATCH_ID,
      ]),
      HOME_TEAM_ID,
      "a confirmed knockout winner must propagate to the next match",
    );
  });

  await asUser(USER_THREE, async () => {
    await db.query("select public.join_pool($1)", [inviteCode]);
    assert.equal(
      await scalar("select count(*)::integer from public.profiles"),
      1,
      "sharing a pool must not expose full profile rows",
    );
  });

  assert.equal(
    await scalar("select result_version from public.matches where id = $1", [MATCH_ID]),
    2,
  );
  assert.equal(
    await scalar(
      "select count(*)::integer from public.match_result_history where match_id = $1",
      [MATCH_ID],
    ),
    2,
  );

  await asUser(USER_ONE, async () => {
    const ranking = await db.query(
      "select display_name, total_points::integer as total_points from public.get_pool_ranking((select id from public.pools limit 1))",
    );
    const lateMember = ranking.rows.find((row) => row.display_name === "Late Member");
    const owner = ranking.rows.find((row) => row.display_name === "Owner");

    assert.equal(owner?.total_points, 5);
    assert.equal(
      lateMember?.total_points,
      0,
      "a member joining after lock must not receive retroactive points",
    );
  });
}

async function asUser(userId, operation) {
  await db.exec(`
    select set_config('app.test_uid', '${userId}', false);
    select set_config('app.test_role', 'authenticated', false);
    set role authenticated;
  `);
  try {
    await operation();
  } finally {
    await db.exec(`
      reset role;
      select set_config('app.test_uid', '', false);
      select set_config('app.test_role', '', false);
    `);
  }
}

async function asAnon(operation) {
  await db.exec(`
    select set_config('app.test_uid', '', false);
    select set_config('app.test_role', 'anon', false);
    set role anon;
  `);
  try {
    await operation();
  } finally {
    await db.exec(`
      reset role;
      select set_config('app.test_role', '', false);
    `);
  }
}

async function asService(operation) {
  await db.exec(`
    select set_config('app.test_uid', '', false);
    select set_config('app.test_role', 'service_role', false);
    set role service_role;
  `);
  try {
    await operation();
  } finally {
    await db.exec(`
      reset role;
      select set_config('app.test_role', '', false);
    `);
  }
}

async function scalar(query, params = []) {
  const result = await db.query(query, params);
  return Object.values(result.rows[0])[0];
}
