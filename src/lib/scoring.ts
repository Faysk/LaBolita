import type {
  MatchResult,
  MatchStage,
  ScoreBreakdown,
  ScorePrediction,
} from "@/lib/types";

export const STAGE_MULTIPLIERS: Record<MatchStage, number> = {
  group: 1,
  round_of_32: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  third_place: 2,
  final: 5,
};

type Outcome = "home" | "draw" | "away";

function outcome(homeScore: number, awayScore: number): Outcome {
  if (homeScore === awayScore) return "draw";
  return homeScore > awayScore ? "home" : "away";
}

export function calculateBasePoints(
  prediction: ScorePrediction,
  result: MatchResult,
): Pick<ScoreBreakdown, "category" | "basePoints"> {
  const exact =
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore;
  if (exact) return { category: "exact", basePoints: 10 };

  const predictedOutcome = outcome(prediction.homeScore, prediction.awayScore);
  const actualOutcome = outcome(result.homeScore, result.awayScore);
  const correctOutcome = predictedOutcome === actualOutcome;
  const oneScoreCorrect =
    prediction.homeScore === result.homeScore ||
    prediction.awayScore === result.awayScore;
  const goalDifferenceCorrect =
    prediction.homeScore - prediction.awayScore ===
    result.homeScore - result.awayScore;

  // Empates não exatos valem resultado correto, evitando que saldo zero vire
  // automaticamente um acerto refinado.
  if (
    actualOutcome !== "draw" &&
    correctOutcome &&
    (goalDifferenceCorrect || oneScoreCorrect)
  ) {
    return { category: "refined", basePoints: 7 };
  }

  if (correctOutcome) return { category: "result", basePoints: 5 };
  if (oneScoreCorrect) return { category: "one-score", basePoints: 2 };
  return { category: "miss", basePoints: 0 };
}

export function calculateScore(
  prediction: ScorePrediction,
  result: MatchResult,
  stage: MatchStage,
): ScoreBreakdown {
  const base = calculateBasePoints(prediction, result);
  const multiplier = STAGE_MULTIPLIERS[stage];
  const advancementPoints =
    stage !== "group" &&
    stage !== "third_place" &&
    prediction.advancingTeamId &&
    prediction.advancingTeamId === result.advancingTeamId
      ? 3
      : 0;
  const matchPoints = base.basePoints * multiplier;

  return {
    ...base,
    multiplier,
    matchPoints,
    advancementPoints,
    totalPoints: matchPoints + advancementPoints,
  };
}
