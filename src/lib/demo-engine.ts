import { z } from "zod";
import { calculateScore } from "@/lib/scoring";
import type {
  DemoMatch,
  MatchResult,
  PoolSummary,
  RankingEntry,
  ScorePrediction,
} from "@/lib/types";

const scoreSchema = z.number().int().min(0).max(30);

export const predictionSchema = z.object({
  homeScore: scoreSchema,
  awayScore: scoreSchema,
  advancingTeamId: z.string().nullable().optional(),
});

export const localResultSchema = z.object({
  homeScore: scoreSchema,
  awayScore: scoreSchema,
  advancingTeamId: z.string().nullable().optional(),
  finalizedAt: z.iso.datetime(),
});

export const localPoolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3).max(60),
  code: z.string().min(4).max(20),
  members: z.number().int().positive(),
  position: z.number().int().positive(),
  eligibleFrom: z.iso.datetime().optional(),
});

export type LocalResult = z.infer<typeof localResultSchema>;

export function parsePrediction(value: string | null): ScorePrediction | null {
  return parseJson(predictionSchema, value);
}

export function parseResults(value: string | null): Record<string, LocalResult> {
  return parseJson(z.record(z.string(), localResultSchema), value) ?? {};
}

export function parsePools(value: string | null): PoolSummary[] {
  return parseJson(z.array(localPoolSchema), value) ?? [];
}

export function calculateDemoRanking(
  baseRanking: RankingEntry[],
  matches: DemoMatch[],
  predictions: Record<string, ScorePrediction>,
  results: Record<string, MatchResult & { finalizedAt?: string }>,
  eligibleFrom?: string,
): RankingEntry[] {
  const earned = matches.reduce(
    (total, match) => {
      const prediction = predictions[match.id] ?? match.prediction;
      const result = results[match.id] ?? match.result;
      if (!prediction || !result) return total;
      if (
        eligibleFrom &&
        "finalizedAt" in result &&
        result.finalizedAt &&
        new Date(result.finalizedAt) < new Date(eligibleFrom)
      ) {
        return total;
      }

      const score = calculateScore(prediction, result, match.stage);
      return {
        points: total.points + score.totalPoints,
        exact: total.exact + (score.category === "exact" ? 1 : 0),
        correct:
          total.correct +
          (["exact", "refined", "result"].includes(score.category) ? 1 : 0),
      };
    },
    { points: 0, exact: 0, correct: 0 },
  );

  const updated = baseRanking.map((player) =>
    player.isCurrentUser
      ? {
          ...player,
          points: player.points + earned.points,
          exact: player.exact + earned.exact,
          correct: player.correct + earned.correct,
        }
      : player,
  );

  return updated
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.exact - a.exact ||
        b.correct - a.correct ||
        a.name.localeCompare(b.name, "pt-BR"),
    )
    .map((player, index) => ({ ...player, position: index + 1 }));
}

function parseJson<T>(schema: z.ZodType<T>, value: string | null): T | null {
  if (!value) return null;

  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
