import { describe, expect, it } from "vitest";
import {
  calculateDemoRanking,
  parsePools,
  parsePrediction,
  parseResults,
} from "@/lib/demo-engine";
import type { DemoMatch, RankingEntry } from "@/lib/types";

const match: DemoMatch = {
  id: "match",
  stage: "final",
  stageLabel: "Final",
  dateLabel: "19 jul",
  timeLabel: "20:00",
  venue: "Teste",
  locked: false,
  homeTeam: { id: "bra", name: "Brasil", shortName: "Brasil", flag: "BR" },
  awayTeam: { id: "arg", name: "Argentina", shortName: "Argentina", flag: "AR" },
};

const ranking: RankingEntry[] = [
  {
    position: 1,
    name: "Rival",
    initials: "RI",
    points: 100,
    exact: 1,
    correct: 1,
  },
  {
    position: 2,
    name: "Faysk",
    initials: "FY",
    points: 60,
    exact: 1,
    correct: 1,
    isCurrentUser: true,
  },
];

describe("demo state parsing", () => {
  it("rejects malformed or out-of-range predictions", () => {
    expect(parsePrediction('{"homeScore":99,"awayScore":0}')).toBeNull();
    expect(parsePrediction("not json")).toBeNull();
  });

  it("keeps valid local state and discards invalid collections", () => {
    expect(parsePrediction('{"homeScore":2,"awayScore":1}')).toMatchObject({
      homeScore: 2,
      awayScore: 1,
    });
    expect(parseResults('{"match":{"homeScore":2}}')).toEqual({});
    expect(parsePools('[{"id":"1"}]')).toEqual([]);
  });
});

describe("calculateDemoRanking", () => {
  it("recalculates current user points and ranking from predictions and results", () => {
    const result = calculateDemoRanking(
      ranking,
      [match],
      {
        match: { homeScore: 1, awayScore: 1, advancingTeamId: "bra" },
      },
      {
        match: { homeScore: 1, awayScore: 1, advancingTeamId: "bra" },
      },
    );

    expect(result[0]).toMatchObject({
      name: "Faysk",
      points: 113,
      exact: 2,
      correct: 2,
      position: 1,
    });
  });

  it("reprocesses a corrected result without accumulating old points", () => {
    const predictions = {
      match: { homeScore: 1, awayScore: 1, advancingTeamId: "bra" },
    };
    const original = calculateDemoRanking(ranking, [match], predictions, {
      match: { homeScore: 1, awayScore: 1, advancingTeamId: "bra" },
    });
    const corrected = calculateDemoRanking(ranking, [match], predictions, {
      match: { homeScore: 2, awayScore: 0, advancingTeamId: "arg" },
    });

    expect(original.find((player) => player.isCurrentUser)?.points).toBe(113);
    expect(corrected.find((player) => player.isCurrentUser)?.points).toBe(60);
  });

  it("does not grant results finalized before local pool eligibility", () => {
    const newPoolRanking = ranking
      .filter((player) => player.isCurrentUser)
      .map((player) => ({ ...player, points: 0, exact: 0, correct: 0 }));
    const result = calculateDemoRanking(
      newPoolRanking,
      [match],
      {
        match: { homeScore: 1, awayScore: 1, advancingTeamId: "bra" },
      },
      {
        match: {
          homeScore: 1,
          awayScore: 1,
          advancingTeamId: "bra",
          finalizedAt: "2026-06-07T10:00:00.000Z",
        },
      },
      "2026-06-07T11:00:00.000Z",
    );

    expect(result[0]).toMatchObject({ name: "Faysk", points: 0, exact: 0, correct: 0 });
  });
});
