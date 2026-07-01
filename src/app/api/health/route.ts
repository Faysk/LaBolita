import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const REQUIRED_TEAMS = 48;
const REQUIRED_MATCHES = 104;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const deployment = getDeploymentMetadata();

  if (!supabase) {
    return NextResponse.json({
      status: "ok",
      app: "labolita",
      deployment,
      database: "demo",
      launchReady: false,
      schedule: {
        teams: 0,
        matches: 0,
        providerMappedMatches: 0,
        renderReady: false,
        requiredTeams: REQUIRED_TEAMS,
        requiredMatches: REQUIRED_MATCHES,
      },
      resultsSyncConfigured: false,
      resultsSync: { status: "disabled" },
      timestamp: new Date().toISOString(),
    });
  }

  const activeTournaments = await supabase
    .from("tournaments")
    .select("id")
    .eq("is_active", true);
  if (activeTournaments.error) {
    return NextResponse.json(
      {
        status: "degraded",
        app: "labolita",
        database: "unreachable",
        launchReady: false,
        errorCode: activeTournaments.error.code,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const activeTournamentId = activeTournaments.data?.length === 1
    ? activeTournaments.data[0].id
    : null;

  const [teams, matches, providerMappedMatches, renderableMatch, resultsSync] =
    await Promise.all([
    activeTournamentId
      ? supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", activeTournamentId)
      : Promise.resolve({ count: 0, error: null }),
    activeTournamentId
      ? supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", activeTournamentId)
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", activeTournamentId ?? "00000000-0000-0000-0000-000000000000")
      .not("provider_match_id", "is", null),
    supabase
      .from("matches")
      .select(
        `
          id,
          home_team:teams!matches_home_team_id_tournament_id_fkey(id),
          away_team:teams!matches_away_team_id_tournament_id_fkey(id)
        `,
      )
      .eq("tournament_id", activeTournamentId ?? "00000000-0000-0000-0000-000000000000")
      .eq("stage", "group")
      .order("match_number")
      .limit(1)
      .maybeSingle(),
    supabase.rpc("get_public_results_sync_status").maybeSingle(),
  ]);
  const databaseError =
    teams.error ??
    matches.error ??
    providerMappedMatches.error ??
    renderableMatch.error ??
    resultsSync.error;

  if (databaseError) {
    return NextResponse.json(
      {
        status: "degraded",
        app: "labolita",
        database: "unreachable",
        launchReady: false,
        errorCode: databaseError.code,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  const teamCount = teams.count ?? 0;
  const matchCount = matches.count ?? 0;
  const providerMappedCount = providerMappedMatches.count ?? 0;
  const renderReady = Boolean(
    renderableMatch.data?.home_team && renderableMatch.data?.away_team,
  );
  const launchReady =
    activeTournaments.data?.length === 1 &&
    teamCount === REQUIRED_TEAMS &&
    matchCount === REQUIRED_MATCHES &&
    providerMappedCount === REQUIRED_MATCHES &&
    renderReady;

  return NextResponse.json({
    status: "ok",
    app: "labolita",
    deployment,
    database: "connected",
    launchReady,
    schedule: {
      teams: teamCount,
      matches: matchCount,
      providerMappedMatches: providerMappedCount,
      renderReady,
      requiredTeams: REQUIRED_TEAMS,
      requiredMatches: REQUIRED_MATCHES,
      activeTournamentId,
      activeTournaments: activeTournaments.data?.length ?? 0,
    },
    resultsSyncConfigured: Boolean(
      process.env.RESULTS_FEED_URL &&
        process.env.CRON_SECRET &&
        process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    resultsSync: resultsSync.data ?? { status: "unknown" },
    timestamp: new Date().toISOString(),
  });
}

function getDeploymentMetadata() {
  return {
    environment: process.env.VERCEL_ENV ?? null,
    commitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  };
}
