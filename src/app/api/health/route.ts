import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

const REQUIRED_TEAMS = 48;
const REQUIRED_MATCHES = 104;

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createPublicSupabaseClient();

  if (!supabase) {
    return healthJson({
      status: "ok",
      app: "labolita",
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

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id")
    .eq("is_active", true)
    .single();

  if (tournamentError) {
    return degraded(tournamentError.code);
  }

  const [teams, matches, providerMappedMatches, renderableMatch, resultsSync] =
    await Promise.all([
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournament.id),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournament.id),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournament.id)
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
      .eq("tournament_id", tournament.id)
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
    return degraded(databaseError.code);
  }

  const teamCount = teams.count ?? 0;
  const matchCount = matches.count ?? 0;
  const providerMappedCount = providerMappedMatches.count ?? 0;
  const renderReady = Boolean(
    renderableMatch.data?.home_team && renderableMatch.data?.away_team,
  );
  const launchReady =
    teamCount === REQUIRED_TEAMS &&
    matchCount === REQUIRED_MATCHES &&
    providerMappedCount === REQUIRED_MATCHES &&
    renderReady;

  return healthJson({
    status: "ok",
    app: "labolita",
    database: "connected",
    launchReady,
    schedule: {
      teams: teamCount,
      matches: matchCount,
      providerMappedMatches: providerMappedCount,
      renderReady,
      requiredTeams: REQUIRED_TEAMS,
      requiredMatches: REQUIRED_MATCHES,
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

function degraded(errorCode: string) {
  return healthJson(
    {
      status: "degraded",
      app: "labolita",
      database: "unreachable",
      launchReady: false,
      errorCode,
      timestamp: new Date().toISOString(),
    },
    503,
  );
}

function healthJson(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
