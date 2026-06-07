import "server-only";
import { createClient } from "@supabase/supabase-js";
import { normalizeWorldCupFeed } from "@/lib/results-provider";

type DatabaseMatch = {
  id: string;
  provider_match_id: string | null;
  live_home_score: number | null;
  live_away_score: number | null;
  provider_status: string | null;
};

export async function syncResultsFeed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const feedUrl = process.env.RESULTS_FEED_URL;

  if (!supabaseUrl || !serviceRoleKey || !feedUrl) {
    throw new Error("Results synchronization is not configured.");
  }

  const response = await fetch(feedUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Results provider responded ${response.status}.`);
  const observations = normalizeWorldCupFeed(await response.json());

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("matches")
    .select("id, provider_match_id, live_home_score, live_away_score, provider_status")
    .not("provider_match_id", "is", null);
  if (error) throw error;

  const matches = (data ?? []) as DatabaseMatch[];
  const byProviderId = new Map(matches.map((match) => [match.provider_match_id, match]));
  const changed = observations.flatMap((observation) => {
    const match = byProviderId.get(observation.providerMatchId);
    if (!match) return [];
    if (
      match.provider_status === observation.status &&
      match.live_home_score === observation.homeScore &&
      match.live_away_score === observation.awayScore
    ) {
      return [];
    }
    return [{ match, observation }];
  });

  for (let index = 0; index < changed.length; index += 10) {
    const batch = changed.slice(index, index + 10);
    await Promise.all(
      batch.map(async ({ match, observation }) => {
        const { error: updateError } = await supabase
          .from("matches")
          .update({
            live_home_score: observation.homeScore,
            live_away_score: observation.awayScore,
            provider_status: observation.status,
            provider_updated_at: new Date().toISOString(),
          })
          .eq("id", match.id);
        if (updateError) throw updateError;
      }),
    );
  }

  return {
    observations: observations.length,
    matched: observations.filter((item) => byProviderId.has(item.providerMatchId)).length,
    updated: changed.length,
    finalCandidates: observations.filter((item) => item.status === "finished").length,
  };
}
