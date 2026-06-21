import { describe, expect, it } from "vitest";
import { summarizePoolComparison } from "@/lib/prediction-comparisons";
import { calculateScore } from "@/lib/scoring";
import type { PredictionComparisonEntry } from "@/lib/prediction-comparisons";
import type { ScorePrediction } from "@/lib/types";

describe("summarizePoolComparison", () => {
  it("summarizes visible predictions for a finished match comparison", () => {
    const result = { homeScore: 2, awayScore: 1 };
    const scoredEntry = (
      entry: Omit<PredictionComparisonEntry, "score"> & {
        prediction: ScorePrediction;
      },
    ): PredictionComparisonEntry => ({
      ...entry,
      score: calculateScore(entry.prediction, result, "group"),
    });

    const comparison = summarizePoolComparison({
      pool: { id: "pool-1", name: "Bolão da firma", flagCode: "BR" },
      matchId: "match-1",
      memberCount: 6,
      entries: [
        scoredEntry({
          userId: "me",
          name: "Você",
          initials: "VO",
          position: 1,
          points: 30,
          exact: 2,
          correct: 4,
          isCurrentUser: true,
          prediction: { homeScore: 2, awayScore: 1 },
        }),
        scoredEntry({
          userId: "ana",
          name: "Ana",
          initials: "AN",
          position: 2,
          points: 28,
          exact: 1,
          correct: 3,
          prediction: { homeScore: 2, awayScore: 1 },
        }),
        scoredEntry({
          userId: "bia",
          name: "Bia",
          initials: "BI",
          position: 3,
          points: 20,
          exact: 0,
          correct: 2,
          prediction: { homeScore: 3, awayScore: 2 },
        }),
        scoredEntry({
          userId: "caio",
          name: "Caio",
          initials: "CA",
          position: 4,
          points: 18,
          exact: 0,
          correct: 1,
          prediction: { homeScore: 1, awayScore: 1 },
        }),
        {
          userId: "duda",
          name: "Duda",
          initials: "DU",
          position: 5,
          points: 12,
          exact: 0,
          correct: 1,
        },
      ],
    });

    expect(comparison).toMatchObject({
      predictionCount: 4,
      scoredCount: 4,
      exactCount: 2,
      resultCount: 3,
      bestScore: 10,
      currentUserPoints: 10,
      samePredictionCount: 1,
      averagePoints: 7,
      hiddenCount: 2,
      outcomeCounts: {
        home: 3,
        draw: 1,
        away: 0,
      },
    });
    expect(comparison.topScorelines[0]).toEqual({
      label: "2 x 1",
      count: 2,
      isCurrentUserPrediction: true,
    });
  });
});
