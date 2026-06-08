import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Configure as variáveis Supabase antes do smoke test remoto.");
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const password = `${randomUUID()}Aa1!`;
const email = `labolita-audit-${Date.now()}@faysk.dev`;
const secondPassword = `${randomUUID()}Aa1!`;
const secondEmail = `labolita-audit-member-${Date.now()}@faysk.dev`;
let userId;
let secondUserId;
let poolId;
let ordinaryOwnerPoolId;
let limitTestPoolId;
let auditTournamentId;

try {
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Auditoria LaBolita" },
  });
  if (createError) throw createError;
  userId = created.user.id;
  const { data: secondCreated, error: secondCreateError } =
    await service.auth.admin.createUser({
      email: secondEmail,
      password: secondPassword,
      email_confirm: true,
      user_metadata: { full_name: "Membro Auditoria LaBolita" },
    });
  if (secondCreateError) throw secondCreateError;
  secondUserId = secondCreated.user.id;
  const { error: adminError } = await service
    .from("profiles")
    .update({ is_admin: true })
    .eq("id", userId);
  if (adminError) throw adminError;
  const { count: masterCount, error: masterCountError } = await service
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_master_admin", true);
  if (masterCountError) throw masterCountError;
  assert.equal(masterCount, 1, "there must be exactly one master administrator");

  const session = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await session.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const secondSession = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: secondSignInError } = await secondSession.auth.signInWithPassword({
    email: secondEmail,
    password: secondPassword,
  });
  if (secondSignInError) throw secondSignInError;

  const { error: acceptTermsError } = await session.rpc("accept_terms", {
    p_version: "2026-06-07",
  });
  if (acceptTermsError) throw acceptTermsError;
  const { error: secondAcceptTermsError } = await secondSession.rpc("accept_terms", {
    p_version: "2026-06-07",
  });
  if (secondAcceptTermsError) throw secondAcceptTermsError;

  const { data: adminSyncState, error: adminSyncStateError } = await session
    .from("results_sync_state")
    .select("status, error_message");
  if (adminSyncStateError) throw adminSyncStateError;
  assert.equal(
    adminSyncState.length,
    1,
    "administrators must retain access to detailed synchronization diagnostics",
  );

  const { data: directPublicPools, error: directPublicPoolsError } = await secondSession
    .from("pools")
    .select("id, invite_code");
  if (directPublicPoolsError) throw directPublicPoolsError;
  assert.equal(
    directPublicPools.length,
    0,
    "public discovery must not expose raw pool rows or invite codes",
  );
  const { data: ordinaryOwnerPool, error: ordinaryOwnerPoolError } = await secondSession.rpc(
    "create_pool_with_flag",
    {
      p_name: "Bolão comum de auditoria",
      p_is_public: false,
      p_flag_code: "br",
    },
  );
  if (ordinaryOwnerPoolError) throw ordinaryOwnerPoolError;
  ordinaryOwnerPoolId = (Array.isArray(ordinaryOwnerPool) ? ordinaryOwnerPool[0] : ordinaryOwnerPool).id;
  const { error: ordinaryArchiveError } = await secondSession.rpc("update_pool", {
    p_pool_id: ordinaryOwnerPoolId,
    p_name: "Bolão comum de auditoria",
    p_is_public: false,
    p_archived: true,
    p_reason: "teste de arquivamento pelo proprietário",
  });
  if (ordinaryArchiveError) throw ordinaryArchiveError;
  const { error: ordinaryRestoreError } = await secondSession.rpc("update_pool", {
    p_pool_id: ordinaryOwnerPoolId,
    p_name: "Bolão comum de auditoria",
    p_is_public: false,
    p_archived: false,
    p_reason: "tentativa indevida de recuperação",
  });
  assert.ok(ordinaryRestoreError, "ordinary pool owners cannot restore archived pools");

  const archivedPools = Array.from({ length: 20 }, (_, index) => ({
    owner_id: secondUserId,
    name: `Bolão arquivado de auditoria ${index + 1}`,
    invite_code: randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(),
    is_public: false,
    archived_at: new Date().toISOString(),
  }));
  const { error: archivedPoolsError } = await service.from("pools").insert(archivedPools);
  if (archivedPoolsError) throw archivedPoolsError;
  const { data: limitTestPool, error: limitTestPoolError } = await secondSession.rpc(
    "create_pool_with_flag",
    {
      p_name: "Bolão ativo após arquivados",
      p_is_public: false,
      p_flag_code: "br",
    },
  );
  if (limitTestPoolError) throw limitTestPoolError;
  limitTestPoolId = (
    Array.isArray(limitTestPool) ? limitTestPool[0] : limitTestPool
  ).id;

  const { data: firstMatch, error: matchError } = await service
    .from("matches")
    .select("id")
    .eq("stage", "group")
    .order("match_number")
    .limit(1)
    .single();
  if (matchError) throw matchError;
  const scoringTeamId = "00000000-0000-0000-0000-000000000001";
  const { data: thirdPlaceScore, error: thirdPlaceScoreError } = await service.rpc(
    "calculate_prediction_score",
    {
      p_prediction_home: 1,
      p_prediction_away: 1,
      p_result_home: 1,
      p_result_away: 1,
      p_stage: "third_place",
      p_predicted_advancing_team_id: scoringTeamId,
      p_result_advancing_team_id: scoringTeamId,
    },
  );
  if (thirdPlaceScoreError) throw thirdPlaceScoreError;
  assert.equal(
    thirdPlaceScore[0]?.advancement_points,
    0,
    "third-place matches must not award advancement points",
  );

  const { error: predictionError } = await session.rpc("save_prediction", {
    p_match_id: firstMatch.id,
    p_home_score: 2,
    p_away_score: 1,
    p_advancing_team_id: null,
  });
  if (predictionError) throw predictionError;

  const { data: pool, error: poolError } = await session.rpc("create_pool_with_flag", {
    p_name: "Auditoria automática",
    p_is_public: true,
    p_flag_code: "pt",
  });
  if (poolError) throw poolError;

  const value = Array.isArray(pool) ? pool[0] : pool;
  poolId = value.id;
  assert.match(value.invite_code, /^[A-F0-9]{12}$/);
  assert.equal(value.flag_code, "pt");

  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rawProviderPayload, error: rawProviderPayloadError } = await publicClient
    .from("matches")
    .select("provider_payload")
    .limit(1);
  assert.ok(rawProviderPayloadError, "anonymous visitors cannot read raw provider payloads");
  assert.equal(rawProviderPayload, null);
  const { data: rawSyncState, error: rawSyncStateError } = await publicClient
    .from("results_sync_state")
    .select("error_message");
  assert.ok(rawSyncStateError, "anonymous visitors cannot read internal sync errors");
  assert.equal(rawSyncState, null);
  const { data: publicSyncState, error: publicSyncStateError } = await publicClient.rpc(
    "get_public_results_sync_status",
  );
  if (publicSyncStateError) throw publicSyncStateError;
  assert.equal(publicSyncState.length, 1);
  assert.equal(
    "error_message" in publicSyncState[0],
    false,
    "the public synchronization status must not expose internal errors",
  );
  const { data: publicPools, error: publicPoolsError } = await publicClient.rpc(
    "get_public_pools",
    { p_search: "Auditoria", p_limit: 9, p_offset: 0 },
  );
  if (publicPoolsError) throw publicPoolsError;
  assert.equal(publicPools.length, 1);
  assert.equal(publicPools[0].flag_code, "pt");
  assert.equal("invite_code" in publicPools[0], false, "public discovery must not expose invites");

  const { data: publicRanking, error: publicRankingError } = await publicClient.rpc(
    "get_public_pool_ranking",
    { p_pool_id: poolId, p_limit: 25, p_offset: 0 },
  );
  if (publicRankingError) throw publicRankingError;
  assert.equal(publicRanking.length, 1);
  assert.equal(publicRanking[0].user_id, null, "public rankings must not expose user ids");
  assert.equal(
    publicRanking[0].avatar_url,
    null,
    "public rankings must not expose identity-provider avatars",
  );

  const { error: joinError } = await secondSession.rpc("join_pool", {
    p_invite_code: value.invite_code,
  });
  if (joinError) throw joinError;
  const { data: myPools, error: myPoolsError } = await secondSession.rpc("get_my_pools");
  if (myPoolsError) throw myPoolsError;
  assert.equal(myPools.find((item) => item.pool_id === poolId)?.member_count, 2);
  assert.equal(myPools.find((item) => item.pool_id === poolId)?.flag_code, "pt");

  const { data: globalUsers, error: globalUsersError } = await session.rpc(
    "master_list_users",
    { p_search: "Auditoria LaBolita", p_limit: 100, p_offset: 0 },
  );
  if (globalUsersError) throw globalUsersError;
  assert.ok(globalUsers.some((item) => item.user_id === userId), "promoted admins access global administration");

  const { data: masterProfile, error: masterProfileError } = await service
    .from("profiles")
    .select("id")
    .eq("is_master_admin", true)
    .single();
  if (masterProfileError) throw masterProfileError;
  const { error: masterProtectionError } = await session.rpc("admin_update_user_access", {
    p_user_id: masterProfile.id,
    p_is_admin: false,
    p_reason: "teste de proteção do master",
  });
  assert.ok(masterProtectionError, "promoted admins cannot demote the principal master");

  const { data: visibleProfiles, error: visibleProfilesError } = await secondSession
    .from("profiles")
    .select("id, terms_accepted_at, disabled_reason");
  if (visibleProfilesError) throw visibleProfilesError;
  assert.deepEqual(
    visibleProfiles.map((profile) => profile.id),
    [secondUserId],
    "sharing a pool must not expose another participant's full profile",
  );

  const { data: hiddenPredictions, error: hiddenError } = await secondSession
    .from("predictions")
    .select("user_id, match_id")
    .eq("match_id", firstMatch.id);
  if (hiddenError) throw hiddenError;
  assert.equal(hiddenPredictions.length, 0, "rival predictions must stay hidden before lock");

  const { error: secondPredictionError } = await secondSession.rpc("save_prediction", {
    p_match_id: firstMatch.id,
    p_home_score: 1,
    p_away_score: 0,
    p_advancing_team_id: null,
  });
  if (secondPredictionError) throw secondPredictionError;

  const { count, error: memberError } = await service
    .from("pool_members")
    .select("*", { count: "exact", head: true })
    .eq("pool_id", poolId)
    .in("user_id", [userId, secondUserId]);
  if (memberError) throw memberError;
  assert.equal(count, 2);

  const { error: archiveError } = await session.rpc("update_pool", {
    p_pool_id: poolId,
    p_name: "Auditoria automática",
    p_is_public: true,
    p_archived: true,
    p_reason: "teste de arquivamento reversível",
  });
  if (archiveError) throw archiveError;
  const { data: memberPoolsAfterArchive, error: memberPoolsAfterArchiveError } =
    await secondSession.rpc("get_my_pools");
  if (memberPoolsAfterArchiveError) throw memberPoolsAfterArchiveError;
  assert.equal(
    memberPoolsAfterArchive.some((item) => item.pool_id === poolId),
    false,
    "archived pools must disappear for ordinary members",
  );
  const { data: hiddenPublicPools, error: hiddenPublicPoolsError } = await publicClient.rpc(
    "get_public_pools",
    { p_search: "Auditoria", p_limit: 9, p_offset: 0 },
  );
  if (hiddenPublicPoolsError) throw hiddenPublicPoolsError;
  assert.equal(hiddenPublicPools.length, 0, "archived pools must disappear from discovery");
  const { error: adminRestoreError } = await session.rpc("update_pool", {
    p_pool_id: poolId,
    p_name: "Auditoria automática recuperada",
    p_is_public: true,
    p_archived: false,
    p_reason: "recuperação por administrador promovido",
  });
  if (adminRestoreError) throw adminRestoreError;

  const { data: masterPools, error: masterPoolsError } = await service.rpc(
    "master_list_pools",
    { p_search: "Auditoria", p_limit: 100, p_offset: 0 },
  );
  if (masterPoolsError) throw masterPoolsError;
  assert.ok(masterPools.some((item) => item.pool_id === poolId));


  const { data: ranking, error: rankingError } = await session.rpc("get_pool_ranking", {
    p_pool_id: poolId,
  });
  if (rankingError) throw rankingError;
  assert.equal(ranking.length, 2);

  const { error: directWriteError } = await secondSession.from("predictions").insert({
    user_id: secondUserId,
    match_id: firstMatch.id,
    home_score: 9,
    away_score: 9,
  });
  assert.ok(directWriteError, "direct prediction writes must be rejected");

  const tournamentId = randomUUID();
  const homeTeamId = randomUUID();
  const awayTeamId = randomUUID();
  const sourceMatchId = randomUUID();
  const targetMatchId = randomUUID();
  const unresolvedMatchId = randomUUID();
  auditTournamentId = tournamentId;
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 7_200_000).toISOString();

  const { error: tournamentError } = await service.from("tournaments").insert({
    id: tournamentId,
    slug: `auditoria-${Date.now()}`,
    name: "Auditoria automática",
    starts_at: past,
    ends_at: future,
    is_active: false,
  });
  if (tournamentError) throw tournamentError;
  const { error: teamsError } = await service.from("teams").insert([
    {
      id: homeTeamId,
      tournament_id: tournamentId,
      code: "AUD",
      name: "Auditoria A",
      short_name: "AUD A",
    },
    {
      id: awayTeamId,
      tournament_id: tournamentId,
      code: "TST",
      name: "Auditoria B",
      short_name: "AUD B",
    },
  ]);
  if (teamsError) throw teamsError;
  const { error: matchesError } = await service.from("matches").insert([
    {
      id: sourceMatchId,
      tournament_id: tournamentId,
      match_number: 1,
      stage: "round_of_32",
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      scheduled_at: past,
      prediction_lock_at: past,
    },
    {
      id: targetMatchId,
      tournament_id: tournamentId,
      match_number: 2,
      stage: "round_of_16",
      home_placeholder: "Vencedor da partida 1",
      away_placeholder: "Vencedor da partida 99",
      scheduled_at: future,
      prediction_lock_at: future,
    },
    {
      id: unresolvedMatchId,
      tournament_id: tournamentId,
      match_number: 3,
      stage: "round_of_32",
      home_placeholder: "1º do Grupo A",
      away_placeholder: "2º do Grupo B",
      scheduled_at: future,
      prediction_lock_at: future,
    },
  ]);
  if (matchesError) throw matchesError;

  const { error: forbiddenAssignment } = await secondSession.rpc("assign_match_teams", {
    p_match_id: unresolvedMatchId,
    p_home_team_id: homeTeamId,
    p_away_team_id: awayTeamId,
    p_reason: "tentativa indevida",
  });
  assert.ok(forbiddenAssignment, "non-admin users must not assign knockout teams");

  const { error: assignmentError } = await session.rpc("assign_match_teams", {
    p_match_id: unresolvedMatchId,
    p_home_team_id: homeTeamId,
    p_away_team_id: awayTeamId,
    p_reason: "teste remoto",
  });
  if (assignmentError) throw assignmentError;

  const { error: finalizeError } = await session.rpc("finalize_match", {
    p_match_id: sourceMatchId,
    p_home_score: 1,
    p_away_score: 1,
    p_advancing_team_id: homeTeamId,
    p_reason: "teste remoto de progressão",
  });
  if (finalizeError) throw finalizeError;

  const { data: propagated, error: propagatedError } = await service
    .from("matches")
    .select("home_team_id")
    .eq("id", targetMatchId)
    .single();
  if (propagatedError) throw propagatedError;
  assert.equal(propagated.home_team_id, homeTeamId);

  console.log("Remote database smoke test passed");
} finally {
  if (poolId) await service.from("pools").delete().eq("id", poolId);
  if (ordinaryOwnerPoolId) await service.from("pools").delete().eq("id", ordinaryOwnerPoolId);
  if (limitTestPoolId) await service.from("pools").delete().eq("id", limitTestPoolId);
  if (secondUserId) await service.from("pools").delete().eq("owner_id", secondUserId);
  if (auditTournamentId) await service.from("tournaments").delete().eq("id", auditTournamentId);
  if (poolId) await service.from("admin_audit_logs").delete().eq("entity_id", poolId);
  if (userId) await service.from("admin_audit_logs").delete().eq("actor_id", userId);
  if (secondUserId) await service.auth.admin.deleteUser(secondUserId);
  if (userId) await service.auth.admin.deleteUser(userId);
}
