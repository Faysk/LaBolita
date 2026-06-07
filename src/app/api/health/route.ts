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
        requiredTeams: REQUIRED_TEAMS,
        requiredMatches: REQUIRED_MATCHES,
      },
      timestamp: new Date().toISOString(),
    });
  }

  const [teams, matches, tournaments] = await Promise.all([
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*", { count: "exact", head: true }),
    supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);
  const databaseError = teams.error ?? matches.error ?? tournaments.error;

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
  const launchReady =
    (tournaments.count ?? 0) === 1 &&
    teamCount === REQUIRED_TEAMS &&
    matchCount === REQUIRED_MATCHES;

  return NextResponse.json({
    status: "ok",
    app: "labolita",
    database: "connected",
    launchReady,
    schedule: {
      teams: teamCount,
      matches: matchCount,
      requiredTeams: REQUIRED_TEAMS,
      requiredMatches: REQUIRED_MATCHES,
    },
    timestamp: new Date().toISOString(),
  });
}
