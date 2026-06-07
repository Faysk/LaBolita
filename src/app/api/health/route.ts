import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const REQUIRED_TEAMS = 48;
const REQUIRED_MATCHES = 104;

export async function GET() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json({
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

  const [teams, matches, providerMappedMatches, renderableMatch, tournaments, resultsSync] =
    await Promise.all([
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*", { count: "exact", head: true }),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
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
      .eq("stage", "group")
      .order("match_number")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("results_sync_state")
      .select(
        "status, source, fallback_used, observations, matched, updated, final_candidates, ignored_regressions, last_attempt_at, last_success_at, error_message",
      )
      .eq("id", true)
      .maybeSingle(),
  ]);
  const databaseError =
    teams.error ??
    matches.error ??
    providerMappedMatches.error ??
    renderableMatch.error ??
    tournaments.error ??
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
    (tournaments.count ?? 0) === 1 &&
    teamCount === REQUIRED_TEAMS &&
    matchCount === REQUIRED_MATCHES &&
    providerMappedCount === REQUIRED_MATCHES &&
    renderReady;

  return NextResponse.json({
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
