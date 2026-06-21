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
  predictionCount: number;
  scoredCount: number;
  exactCount: number;
  resultCount: number;
  bestScore: number | null;
  currentUserPoints: number | null;
  samePredictionCount: number;
  averagePoints: number | null;
  hiddenCount: number;
  outcomeCounts: {
    home: number;
    draw: number;
    away: number;
  };
  topScorelines: {
    label: string;
    count: number;
    isCurrentUserPrediction: boolean;
  }[];
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
  const predictionCount = entries.filter((entry) => entry.prediction).length;
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
  const currentUserPrediction = entries.find((entry) => entry.isCurrentUser)?.prediction;
  const currentUserPredictionKey = currentUserPrediction
    ? predictionKey(currentUserPrediction)
    : null;
  const outcomeCounts = { home: 0, draw: 0, away: 0 };
  const scorelineCounts = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.prediction) continue;
    outcomeCounts[predictionOutcome(entry.prediction)] += 1;
    const label = predictionLabel(entry.prediction);
    scorelineCounts.set(label, (scorelineCounts.get(label) ?? 0) + 1);
  }

  return {
    poolId: pool.id,
    poolName: pool.name,
    flagCode: pool.flagCode,
    memberCount,
    matchId,
    entries,
    predictionCount,
    scoredCount: scoredEntries.length,
    exactCount,
    resultCount,
    bestScore:
      scoredEntries.length > 0
        ? Math.max(...scoredEntries.map((entry) => entry.score?.totalPoints ?? 0))
        : null,
    currentUserPoints:
      entries.find((entry) => entry.isCurrentUser)?.score?.totalPoints ?? null,
    samePredictionCount: currentUserPredictionKey
      ? entries.filter(
          (entry) =>
            !entry.isCurrentUser &&
            entry.prediction &&
            predictionKey(entry.prediction) === currentUserPredictionKey,
        ).length
      : 0,
    averagePoints:
      scoredEntries.length > 0 ? Math.round(totalPoints / scoredEntries.length) : null,
    hiddenCount: Math.max(0, memberCount - predictionCount),
    outcomeCounts,
    topScorelines: [...scorelineCounts.entries()]
      .map(([label, count]) => ({
        label,
        count,
        isCurrentUserPrediction: label === predictionLabel(currentUserPrediction),
      }))
      .sort(
        (left, right) =>
          right.count - left.count ||
          Number(right.isCurrentUserPrediction) -
            Number(left.isCurrentUserPrediction) ||
          left.label.localeCompare(right.label, "pt-BR"),
      ),
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

function predictionOutcome(prediction: ScorePrediction) {
  if (prediction.homeScore === prediction.awayScore) return "draw";
  return prediction.homeScore > prediction.awayScore ? "home" : "away";
}

function predictionKey(prediction: ScorePrediction) {
  return `${prediction.homeScore}:${prediction.awayScore}:${prediction.advancingTeamId ?? ""}`;
}
