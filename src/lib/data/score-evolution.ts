import "server-only";
import { ensureOfficialPoolMembership } from "@/lib/official-pool";
import {
  buildScoreEvolutionOverview,
  demoScoreEvolutionOverview,
  emptyScoreEvolutionOverview,
  type ScoreEvolutionOverview,
  type ScoreEvolutionRow,
} from "@/lib/score-evolution";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPublicScoreEvolution(
  limit = 8,
): Promise<ScoreEvolutionOverview> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoScoreEvolutionOverview();

  const user = await getOptionalUser(supabase);
  if (user) await ensureOfficialPoolMembership(supabase);

  const { data, error } = await supabase.rpc("get_public_score_evolution", {
    p_limit: limit,
  });

  if (error) {
    if (isMissingRpc(error)) return emptyScoreEvolutionOverview();
    throw new Error("Não foi possível carregar a evolução do bolão.", {
      cause: error,
    });
  }

  return buildScoreEvolutionOverview((data ?? []) as ScoreEvolutionRow[]);
}

function isMissingRpc(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    message.includes("get_public_score_evolution") ||
    message.includes("could not find the function")
  );
}
