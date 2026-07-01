import { describe, expect, it } from "vitest";
import {
  buildScoreEvolutionOverview,
  type ScoreEvolutionRow,
} from "@/lib/score-evolution";

const baseRow = {
  avatar_url: null,
  final_exact_scores: 1,
  final_correct_results: 2,
  stage: "group",
  stage_label: "Grupo A",
  scheduled_at: "2026-06-11T20:00:00.000Z",
  previous_rank: null,
  position_delta: 0,
} satisfies Partial<ScoreEvolutionRow>;

describe("score evolution overview", () => {
  it("groups flat database rows into participants, matches and timeline points", () => {
    const overview = buildScoreEvolutionOverview([
      row("p1", "Faysk", 1, 1, 10, 10, 1),
      row("p2", "Petista", 2, 1, 5, 5, 2),
      row("p2", "Petista", 2, 2, 13, 18, 1, 1, 1),
      row("p1", "Faysk", 1, 2, 0, 10, 2, 1, -1),
    ]);

    expect(overview.available).toBe(true);
    expect(overview.participants.map((participant) => participant.name)).toEqual([
      "Faysk",
      "Petista",
    ]);
    expect(overview.matches.map((match) => match.number)).toEqual([1, 2]);
    expect(overview.points.find((point) => point.participantKey === "p2" && point.matchNumber === 2))
      .toMatchObject({
        totalPoints: 18,
        rankAfterMatch: 1,
        positionDelta: 1,
      });
    expect(overview.highlights.find((highlight) => highlight.title === "Maior queda"))
      .toMatchObject({
        detail: "França x Suécia · jogo 2",
      });
    expect(overview.highlights.length).toBeGreaterThan(0);
  });
});

function row(
  participantKey: string,
  name: string,
  finalRank: number,
  matchNumber: number,
  pointsInMatch: number,
  totalPoints: number,
  rankAfterMatch: number,
  previousRank: number | null = null,
  positionDelta = 0,
): ScoreEvolutionRow {
  return {
    ...baseRow,
    participant_key: participantKey,
    is_current_user: participantKey === "p1",
    display_name: name,
    final_rank: finalRank,
    final_total_points: participantKey === "p1" ? 10 : 18,
    match_index: matchNumber,
    match_number: matchNumber,
    match_label: matchNumber === 1 ? "Brasil x Japão" : "França x Suécia",
    result_label: matchNumber === 1 ? "2 x 1" : "3 x 0",
    points_in_match: pointsInMatch,
    total_points: totalPoints,
    exact_scores: pointsInMatch >= 10 ? 1 : 0,
    correct_results: totalPoints > 0 ? 1 : 0,
    rank_after_match: rankAfterMatch,
    previous_rank: previousRank,
    position_delta: positionDelta,
  };
}
