import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readTextWithByteLimit } from "@/lib/bounded-response";
import {
  assertDatabaseMappingComplete,
  normalizeEspnFeed,
  normalizeWorldCupFeed,
  type ProviderObservation,
  type ProviderScheduleMatch,
} from "@/lib/results-provider";

const DEFAULT_BACKUP_FEED_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200";
const MAX_FEED_BYTES = 2_000_000;
const EARLY_STATUS_TOLERANCE_MS = 15 * 60 * 1000;
const DATABASE_REQUEST_TIMEOUT_MS = 10_000;

type DatabaseMatch = {
  id: string;
  provider_match_id: string;
  scheduled_at: string;
  status: "scheduled" | "postponed" | "live" | "finished" | "cancelled";
  home_team_id: string | null;
  away_team_id: string | null;
  live_home_score: number | null;
  live_away_score: number | null;
  provider_status: string | null;
};

export async function syncResultsFeed() {
  const feedUrl = process.env.RESULTS_FEED_URL;

  if (!feedUrl) {
    throw new Error("Results synchronization is not configured.");
  }

  const supabase = createServiceClient();
  const [matchesResult, teamsResult] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, provider_match_id, scheduled_at, status, home_team_id, away_team_id, live_home_score, live_away_score, provider_status",
      )
      .not("provider_match_id", "is", null),
    supabase.from("teams").select("id, code"),
  ]);
  if (matchesResult.error) throw matchesResult.error;
  if (teamsResult.error) throw teamsResult.error;

  const matches = (matchesResult.data ?? []) as unknown as DatabaseMatch[];
  const teamCodes = new Map(
    (teamsResult.data ?? []).map((team) => [team.id as string, team.code as string]),
  );
  const schedule: ProviderScheduleMatch[] = matches.map((match) => ({
    providerMatchId: match.provider_match_id,
    scheduledAt: match.scheduled_at,
    homeTeamCode: match.home_team_id ? teamCodes.get(match.home_team_id) ?? null : null,
    awayTeamCode: match.away_team_id ? teamCodes.get(match.away_team_id) ?? null : null,
  }));
  const { observations, source, fallbackUsed } = await loadObservations(feedUrl, schedule);
  const byProviderId = new Map(matches.map((match) => [match.provider_match_id, match]));
  assertDatabaseMappingComplete(
    observations,
    matches.map((match) => match.provider_match_id),
  );
  const matched = observations.filter((item) => byProviderId.has(item.providerMatchId));

  let ignoredRegressions = 0;
  const changed = matched.flatMap((observation) => {
    const match = byProviderId.get(observation.providerMatchId);
    if (!match) return [];
    if (isUnsafeEarlyStatus(match, observation)) {
      throw new Error(`Provider reported ${observation.status} before kickoff window.`);
    }
    if (match.status === "finished") return [];
    if (isStatusRegression(match.provider_status, observation.status)) {
      ignoredRegressions += 1;
      return [];
    }
    if (
      match.provider_status === observation.status &&
      match.live_home_score === observation.homeScore &&
      match.live_away_score === observation.awayScore
    ) {
      return [];
    }
    return [{ match, observation }];
  });

  if (changed.length > 0) {
    const providerUpdatedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase.rpc(
      "apply_results_sync_updates",
      {
        p_updates: changed.map(({ match, observation }) => ({
          id: match.id,
          live_home_score: observation.homeScore,
          live_away_score: observation.awayScore,
          provider_status: observation.status,
          provider_updated_at: providerUpdatedAt,
        })),
      },
    );
    if (updateError) throw updateError;
    if (updated !== changed.length) {
      throw new Error(
        `Results transaction updated ${updated} matches; expected ${changed.length}.`,
      );
    }
  }

  const summary = {
    source,
    fallbackUsed,
    observations: observations.length,
    matched: matched.length,
    updated: changed.length,
    finalCandidates: observations.filter((item) => item.status === "finished").length,
    ignoredRegressions,
  };
  await recordSyncState({ status: "ok", ...summary }, supabase);
  return summary;
}

export async function recordResultsSyncFailure(error: unknown) {
  try {
    await recordSyncState(
      {
        status: "error",
        source: null,
        fallbackUsed: false,
        observations: 0,
        matched: 0,
        updated: 0,
        finalCandidates: 0,
        ignoredRegressions: 0,
        error: sanitizeError(error),
      },
      createServiceClient(),
    );
  } catch (recordError) {
    console.error("Could not record results synchronization failure", recordError);
  }
}

async function loadObservations(feedUrl: string, schedule: ProviderScheduleMatch[]) {
  try {
    return {
      observations: normalizeWorldCupFeed(await fetchJson(feedUrl)),
      source: "worldcup26",
      fallbackUsed: false,
    };
  } catch (primaryError) {
    const backupUrl = process.env.RESULTS_BACKUP_FEED_URL ?? DEFAULT_BACKUP_FEED_URL;
    try {
      return {
        observations: normalizeEspnFeed(await fetchJson(backupUrl), schedule),
        source: "espn",
        fallbackUsed: true,
      };
    } catch (backupError) {
      throw new Error(
        `Primary and backup results feeds failed: ${sanitizeError(primaryError)}; ${sanitizeError(backupError)}`,
      );
    }
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Results provider responded ${response.status}.`);

  const body = await readTextWithByteLimit(response, MAX_FEED_BYTES);

  return JSON.parse(body) as unknown;
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Results synchronization is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithDatabaseTimeout },
  });
}

const fetchWithDatabaseTimeout: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(DATABASE_REQUEST_TIMEOUT_MS)])
      : AbortSignal.timeout(DATABASE_REQUEST_TIMEOUT_MS),
  });

function isUnsafeEarlyStatus(match: DatabaseMatch, observation: ProviderObservation) {
  return (
    observation.status !== "scheduled" &&
    Date.now() + EARLY_STATUS_TOLERANCE_MS < new Date(match.scheduled_at).getTime()
  );
}

function isStatusRegression(current: string | null, incoming: ProviderObservation["status"]) {
  const order: Record<string, number> = { scheduled: 0, live: 1, finished: 2 };
  return current !== null && (order[incoming] ?? 0) < (order[current] ?? 0);
}

async function recordSyncState(
  state: {
    status: "ok" | "error";
    source: string | null;
    fallbackUsed: boolean;
    observations: number;
    matched: number;
    updated: number;
    finalCandidates: number;
    ignoredRegressions: number;
    error?: string;
  },
  supabase: ReturnType<typeof createServiceClient>,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("results_sync_state").upsert({
    id: true,
    status: state.status,
    source: state.source,
    fallback_used: state.fallbackUsed,
    observations: state.observations,
    matched: state.matched,
    updated: state.updated,
    final_candidates: state.finalCandidates,
    ignored_regressions: state.ignoredRegressions,
    last_attempt_at: now,
    last_success_at: state.status === "ok" ? now : undefined,
    error_message: state.error ?? null,
  });
  if (error) throw error;
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown synchronization failure.";
  return message.replace(/\s+/g, " ").slice(0, 300);
}
