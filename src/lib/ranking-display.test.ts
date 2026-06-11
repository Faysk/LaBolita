import { describe, expect, it } from "vitest";
import { rankingLabel, rankingPosition } from "@/lib/ranking-display";
import type { RankingEntry } from "@/lib/types";

function player(
  position: number,
  points: number,
  exact: number,
  correct: number,
): RankingEntry {
  return {
    position,
    name: `Jogador ${position}`,
    initials: `J${position}`,
    points,
    exact,
    correct,
  };
}

describe("ranking display", () => {
  it("collapses sequential database positions when visible stats are tied", () => {
    const entries = [
      player(1, 10, 1, 1),
      player(2, 10, 1, 1),
      player(3, 7, 0, 1),
    ];

    expect(rankingPosition(entries[0], entries)).toBe(1);
    expect(rankingPosition(entries[1], entries)).toBe(1);
    expect(rankingLabel(entries[1], entries)).toBe("1º emp.");
    expect(rankingLabel(entries[2], entries)).toBe("3º");
  });

  it("keeps the server position when there is no visible tie", () => {
    const entries = [player(1, 20, 2, 3), player(8, 9, 1, 2)];

    expect(rankingPosition(entries[1], entries)).toBe(8);
  });
});
