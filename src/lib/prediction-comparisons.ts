import { demoPools, demoRanking } from "@/lib/demo-data";
import { calculateScore } from "@/lib/scoring";
import type {
  DemoMatch,
  MatchResult,
  PoolSummary,
  RankingEntry,
  ScoreBreakdown,
  ScorePrediction,
} from "@/lib/types";

export type PredictionComparisonEntry = {
  userId?: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  position: number;
  points: number;
  exact: number;
  correct: number;
  isCurrentUser?: boolean;
  prediction?: ScorePrediction;
  score?: ScoreBreakdown | null;
  updatedAt?: string;
};

export type MatchPoolComparison = {
  poolId: string;
  poolName: string;
  flagCode?: string;
  memberCount: number;
  matchId: string;
  entries: PredictionComparisonEntry[];
  exactCount: number;
  resultCount: number;
  averagePoints: number | null;
  hiddenCount: number;
};

export type PredictionComparisonOverview = {
  source: "supabase" | "demo";
  pools: Pick<PoolSummary, "id" | "name" | "flagCode" | "members">[];
  comparisonsByMatch: Record<string, MatchPoolComparison[]>;
};

export function buildDemoMatchComparisons({
  match,
  result,
  currentPrediction,
}: {
  match: DemoMatch;
  result?: MatchResult;
  currentPrediction?: ScorePrediction | null;
}): MatchPoolComparison[] {
  return demoPools.map((pool, poolIndex) => {
    const entries = demoRanking.map((player, playerIndex) => {
      const prediction = player.isCurrentUser
        ? currentPrediction ?? match.prediction ?? demoPrediction(match, player, playerIndex, poolIndex)
        : demoPrediction(match, player, playerIndex, poolIndex);
      const score = result ? calculateScore(prediction, result, match.stage) : null;

      return {
        ...player,
        userId: `demo-${player.initials.toLowerCase()}`,
        prediction,
        score,
        points: player.points + (score?.totalPoints ?? 0),
      } satisfies PredictionComparisonEntry;
    });

    return summarizePoolComparison({
      pool,
      matchId: match.id,
      entries,
      memberCount: pool.members,
    });
  });
}

export function summarizePoolComparison({
  pool,
  matchId,
  entries,
  memberCount,
}: {
  pool: Pick<PoolSummary, "id" | "name" | "flagCode">;
  matchId: string;
  entries: PredictionComparisonEntry[];
  memberCount: number;
}): MatchPoolComparison {
  const scoredEntries = entries.filter((entry) => entry.score);
  const totalPoints = scoredEntries.reduce(
    (total, entry) => total + (entry.score?.totalPoints ?? 0),
    0,
  );
  const exactCount = scoredEntries.filter(
    (entry) => entry.score?.category === "exact",
  ).length;
  const resultCount = scoredEntries.filter((entry) =>
    ["exact", "refined", "result"].includes(entry.score?.category ?? ""),
  ).length;

  return {
    poolId: pool.id,
    poolName: pool.name,
    flagCode: pool.flagCode,
    memberCount,
    matchId,
    entries,
    exactCount,
    resultCount,
    averagePoints:
      scoredEntries.length > 0 ? Math.round(totalPoints / scoredEntries.length) : null,
    hiddenCount: Math.max(0, memberCount - entries.filter((entry) => entry.prediction).length),
  };
}

export function predictionLabel(prediction?: ScorePrediction | null) {
  if (!prediction) return "sem palpite";
  return `${prediction.homeScore} x ${prediction.awayScore}`;
}

function demoPrediction(
  match: DemoMatch,
  player: RankingEntry,
  playerIndex: number,
  poolIndex: number,
): ScorePrediction {
  const seed = hashSeed(`${match.id}:${player.name}:${poolIndex}`);
  const homeScore = (seed + playerIndex) % 4;
  const awayScore = Math.floor(seed / 7 + poolIndex) % 4;
  const prediction: ScorePrediction = { homeScore, awayScore };

  if (match.stage !== "group") {
    prediction.advancingTeamId =
      homeScore === awayScore
        ? (seed % 2 === 0 ? match.homeTeam.id : match.awayTeam.id)
        : homeScore > awayScore
          ? match.homeTeam.id
          : match.awayTeam.id;
  }

  return prediction;
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
