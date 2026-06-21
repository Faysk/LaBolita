import "server-only";
import { calculateScore } from "@/lib/scoring";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  summarizePoolComparison,
  type PredictionComparisonEntry,
  type PredictionComparisonOverview,
} from "@/lib/prediction-comparisons";
import type { DemoMatch, PoolSummary, RankingEntry, ScorePrediction } from "@/lib/types";

type PoolRankingEntry = RankingEntry & { userId?: string };

type MyPoolRow = {
  pool_id: string;
  pool_name: string;
  flag_code: string | null;
  archived_at: string | null;
  member_count: number;
};

type RankingRow = {
  rank_position: number;
  provisional_rank_position?: number;
  user_id: string | null;
  display_name: string;
  avatar_url?: string | null;
  total_points: number;
  provisional_points?: number;
  exact_scores: number;
  correct_results: number;
};

type PredictionRow = {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  advancing_team_id: string | null;
  updated_at: string;
};

export async function getPredictionComparisonOverview(
  matches: DemoMatch[],
): Promise<PredictionComparisonOverview> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      source: "demo",
      pools: [],
      comparisonsByMatch: {},
    };
  }

  const user = await getOptionalUser(supabase);
  if (!user) {
    return {
      source: "supabase",
      pools: [],
      comparisonsByMatch: {},
    };
  }
  const client = supabase;
  const currentUser = user;

  const comparableMatches = matches.filter((match) => match.locked || match.result);
  const comparableMatchIds = comparableMatches.map((match) => match.id);
  if (comparableMatchIds.length === 0) {
    return {
      source: "supabase",
      pools: [],
      comparisonsByMatch: {},
    };
  }

  const { data: poolData, error: poolError } = await supabase.rpc("get_my_pools");
  if (poolError) {
    console.warn("Could not load pools for prediction comparisons", poolError);
    return {
      source: "supabase",
      pools: [],
      comparisonsByMatch: {},
    };
  }

  const pools = ((poolData ?? []) as MyPoolRow[])
    .filter((pool) => !pool.archived_at)
    .map(
      (pool) =>
        ({
          id: pool.pool_id,
          name: pool.pool_name,
          flagCode: pool.flag_code ?? undefined,
          members: Number(pool.member_count),
          position: 1,
        }) satisfies PoolSummary,
    );

  if (pools.length === 0) {
    return {
      source: "supabase",
      pools: [],
      comparisonsByMatch: {},
    };
  }

  const [rankingEntriesByPool, predictionRows] = await Promise.all([
    loadRankingsByPool(pools),
    loadVisiblePredictions(comparableMatchIds),
  ]);
  const predictionsByUserAndMatch = new Map(
    predictionRows.map((prediction) => [
      `${prediction.user_id}:${prediction.match_id}`,
      prediction,
    ]),
  );
  const comparisonsByMatch: PredictionComparisonOverview["comparisonsByMatch"] = {};

  for (const match of comparableMatches) {
    comparisonsByMatch[match.id] = pools
      .map((pool) => {
        const ranking = rankingEntriesByPool.get(pool.id) ?? [];
        const entries = ranking
          .map((player) =>
            mapComparisonEntry({
              player,
              prediction: player.userId
                ? predictionsByUserAndMatch.get(`${player.userId}:${match.id}`)
                : undefined,
              match,
            }),
          )
          .filter((entry) => entry.prediction || entry.isCurrentUser);

        return summarizePoolComparison({
          pool,
          matchId: match.id,
          entries,
          memberCount: pool.members,
        });
      })
      .filter((comparison) => comparison.entries.length > 0);
  }

  return {
    source: "supabase",
    pools: pools.map((pool) => ({
      id: pool.id,
      name: pool.name,
      flagCode: pool.flagCode,
      members: pool.members,
    })),
    comparisonsByMatch,
  };

  async function loadVisiblePredictions(matchIds: string[]) {
    const { data, error } = await client
      .from("predictions")
      .select("user_id, match_id, home_score, away_score, advancing_team_id, updated_at")
      .in("match_id", matchIds);

    if (error) {
      console.warn("Could not load visible predictions for comparisons", error);
      return [] as PredictionRow[];
    }

    return (data ?? []) as PredictionRow[];
  }

  async function loadRankingsByPool(poolRows: PoolSummary[]) {
    const entries = await Promise.all(
      poolRows.map(async (pool) => {
        const { data, error } = await client.rpc("get_pool_ranking", {
          p_pool_id: pool.id,
        });
        if (error) {
          console.warn("Could not load pool ranking for prediction comparisons", {
            poolId: pool.id,
            error,
          });
          return [pool.id, [] as PoolRankingEntry[]] as const;
        }

        return [
          pool.id,
          ((data ?? []) as RankingRow[]).map((row) => ({
            position: Number(row.rank_position),
            provisionalPosition:
              row.provisional_rank_position === undefined
                ? undefined
                : Number(row.provisional_rank_position),
            userId: row.user_id ?? undefined,
            name: row.display_name,
            initials: initials(row.display_name),
            points: Number(row.total_points),
            provisionalPoints:
              row.provisional_points === undefined
                ? undefined
                : Number(row.provisional_points),
            exact: Number(row.exact_scores),
            correct: Number(row.correct_results),
            isCurrentUser: row.user_id === currentUser.id,
            avatarUrl: row.avatar_url ?? undefined,
          })) satisfies PoolRankingEntry[],
        ] as const;
      }),
    );

    return new Map<string, PoolRankingEntry[]>(entries);
  }
}

function mapComparisonEntry({
  player,
  prediction,
  match,
}: {
  player: RankingEntry & { userId?: string };
  prediction?: PredictionRow;
  match: DemoMatch;
}): PredictionComparisonEntry {
  const scorePrediction = prediction
    ? ({
        homeScore: prediction.home_score,
        awayScore: prediction.away_score,
        advancingTeamId: prediction.advancing_team_id,
      } satisfies ScorePrediction)
    : undefined;

  return {
    userId: player.userId,
    name: player.name,
    initials: player.initials,
    avatarUrl: player.avatarUrl,
    position: player.position,
    points: player.points,
    exact: player.exact,
    correct: player.correct,
    isCurrentUser: player.isCurrentUser,
    prediction: scorePrediction,
    score:
      scorePrediction && match.result
        ? calculateScore(scorePrediction, match.result, match.stage)
        : null,
    updatedAt: prediction?.updated_at,
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
