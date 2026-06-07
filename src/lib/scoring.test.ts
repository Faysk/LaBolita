import { describe, expect, it } from "vitest";
import {
  calculateBasePoints,
  calculateScore,
  STAGE_MULTIPLIERS,
} from "@/lib/scoring";

describe("calculateBasePoints", () => {
  const result = { homeScore: 2, awayScore: 1 };

  it.each([
    [{ homeScore: 2, awayScore: 1 }, "exact", 10],
    [{ homeScore: 3, awayScore: 2 }, "refined", 7],
    [{ homeScore: 2, awayScore: 0 }, "refined", 7],
    [{ homeScore: 4, awayScore: 0 }, "result", 5],
    [{ homeScore: 2, awayScore: 2 }, "one-score", 2],
    [{ homeScore: 0, awayScore: 2 }, "miss", 0],
  ])("scores %o as %s", (prediction, category, points) => {
    expect(calculateBasePoints(prediction, result)).toEqual({
      category,
      basePoints: points,
    });
  });

  it("does not treat every non-exact draw as refined", () => {
    expect(
      calculateBasePoints(
        { homeScore: 1, awayScore: 1 },
        { homeScore: 3, awayScore: 3 },
      ),
    ).toEqual({ category: "result", basePoints: 5 });
  });
});

describe("calculateScore", () => {
  it("applies stage multiplier and advancement bonus", () => {
    expect(
      calculateScore(
        { homeScore: 1, awayScore: 1, advancingTeamId: "brazil" },
        { homeScore: 1, awayScore: 1, advancingTeamId: "brazil" },
        "semi_final",
      ),
    ).toMatchObject({
      basePoints: 10,
      multiplier: 4,
      matchPoints: 40,
      advancementPoints: 3,
      totalPoints: 43,
    });
  });

  it("does not award advancement points in third-place match", () => {
    expect(
      calculateScore(
        { homeScore: 2, awayScore: 1, advancingTeamId: "brazil" },
        { homeScore: 2, awayScore: 1, advancingTeamId: "brazil" },
        "third_place",
      ).advancementPoints,
    ).toBe(0);
  });

  it.each([
    ["group", 1],
    ["round_of_32", 1],
    ["round_of_16", 2],
    ["quarter_final", 3],
    ["semi_final", 4],
    ["third_place", 2],
    ["final", 5],
  ] as const)("uses multiplier %s = %d", (stage, multiplier) => {
    expect(STAGE_MULTIPLIERS[stage]).toBe(multiplier);
  });

  it("scores an away refined win symmetrically", () => {
    expect(
      calculateBasePoints(
        { homeScore: 1, awayScore: 3 },
        { homeScore: 0, awayScore: 2 },
      ),
    ).toEqual({ category: "refined", basePoints: 7 });
  });
});
