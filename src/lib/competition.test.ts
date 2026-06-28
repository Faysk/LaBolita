import { describe, expect, it } from "vitest";
import {
  buildGroupStandings,
  matchesForTeam,
  nextMatchForTeam,
  orderKnockoutRoundsForBracket,
  standingForTeam,
  groupKnockoutMatches,
} from "@/lib/competition";
import type { DemoMatch, DemoTeam } from "@/lib/types";

const alpha: DemoTeam = { id: "alpha", name: "Alpha", shortName: "Alpha", flag: "A" };
const beta: DemoTeam = { id: "beta", name: "Beta", shortName: "Beta", flag: "B" };

function groupMatch(result: DemoMatch["result"], liveResult?: DemoMatch["liveResult"]): DemoMatch {
  return {
    id: "match",
    stage: "group",
    stageLabel: "Grupo A",
    dateLabel: "11 jun",
    timeLabel: "20:00",
    venue: "Estádio",
    locked: Boolean(result || liveResult),
    homeTeam: alpha,
    awayTeam: beta,
    result,
    liveResult,
  };
}

function knockoutMatch(
  matchNumber: number,
  stage: DemoMatch["stage"],
  scheduledAt: string,
  homeSourceMatchNumber?: number,
  awaySourceMatchNumber?: number,
): DemoMatch {
  return {
    ...groupMatch(undefined),
    id: `match-${matchNumber}`,
    matchNumber,
    stage,
    stageLabel:
      stage === "round_of_32"
        ? "Fase de 32"
        : stage === "round_of_16"
          ? "Oitavas de final"
          : "Quartas de final",
    scheduledAt,
    homeSourceMatchNumber,
    awaySourceMatchNumber,
  };
}

describe("buildGroupStandings", () => {
  it("orders teams by points, goal difference and goals scored", () => {
    const [[, standings]] = buildGroupStandings([groupMatch({ homeScore: 2, awayScore: 0 })]);
    expect(standings.map((entry) => [entry.team.id, entry.points, entry.goalDifference])).toEqual([
      ["alpha", 3, 2],
      ["beta", 0, -2],
    ]);
  });

  it("includes live scores and marks them as provisional", () => {
    const [[, standings]] = buildGroupStandings([
      groupMatch(undefined, { homeScore: 1, awayScore: 1 }),
    ]);
    expect(standings.every((entry) => entry.provisional)).toBe(true);
    expect(standings.every((entry) => entry.points === 1)).toBe(true);
  });
});

describe("team helpers", () => {
  it("finds team matches ordered by schedule", () => {
    const later = {
      ...groupMatch(undefined),
      id: "later",
      scheduledAt: "2026-06-20T20:00:00Z",
    };
    const earlier = {
      ...groupMatch(undefined),
      id: "earlier",
      scheduledAt: "2026-06-12T20:00:00Z",
    };

    expect(matchesForTeam([later, earlier], alpha.id).map((match) => match.id)).toEqual([
      "earlier",
      "later",
    ]);
  });

  it("returns the current group standing for a team", () => {
    const result = standingForTeam([groupMatch({ homeScore: 2, awayScore: 0 })], alpha.id);

    expect(result?.group).toBe("A");
    expect(result?.standing.points).toBe(3);
  });

  it("ignores finished games when looking for the next match", () => {
    const finished = {
      ...groupMatch({ homeScore: 1, awayScore: 0 }),
      id: "finished",
      scheduledAt: "2026-06-11T20:00:00Z",
    };
    const upcoming = {
      ...groupMatch(undefined),
      id: "upcoming",
      scheduledAt: "2999-06-12T20:00:00Z",
    };

    expect(nextMatchForTeam([finished, upcoming], alpha.id)?.id).toBe("upcoming");
  });
});

describe("orderKnockoutRoundsForBracket", () => {
  it("groups knockout matches by downstream source references instead of kickoff order", () => {
    const rounds = groupKnockoutMatches([
      knockoutMatch(73, "round_of_32", "2026-06-28T19:00:00Z"),
      knockoutMatch(76, "round_of_32", "2026-06-29T17:00:00Z"),
      knockoutMatch(74, "round_of_32", "2026-06-29T20:30:00Z"),
      knockoutMatch(75, "round_of_32", "2026-06-30T01:00:00Z"),
      knockoutMatch(78, "round_of_32", "2026-06-30T17:00:00Z"),
      knockoutMatch(77, "round_of_32", "2026-06-30T21:00:00Z"),
      knockoutMatch(82, "round_of_32", "2026-07-01T20:00:00Z"),
      knockoutMatch(81, "round_of_32", "2026-07-02T00:00:00Z"),
      knockoutMatch(84, "round_of_32", "2026-07-02T19:00:00Z"),
      knockoutMatch(83, "round_of_32", "2026-07-02T23:00:00Z"),
      knockoutMatch(90, "round_of_16", "2026-07-04T17:00:00Z", 73, 75),
      knockoutMatch(89, "round_of_16", "2026-07-04T21:00:00Z", 74, 77),
      knockoutMatch(91, "round_of_16", "2026-07-05T20:00:00Z", 76, 78),
      knockoutMatch(93, "round_of_16", "2026-07-06T19:00:00Z", 83, 84),
      knockoutMatch(94, "round_of_16", "2026-07-07T00:00:00Z", 81, 82),
      knockoutMatch(97, "quarter_final", "2026-07-09T20:00:00Z", 89, 90),
      knockoutMatch(98, "quarter_final", "2026-07-10T19:00:00Z", 93, 94),
      knockoutMatch(99, "quarter_final", "2026-07-11T21:00:00Z", 91),
    ]);

    const ordered = orderKnockoutRoundsForBracket(rounds);

    expect(ordered[0][1].map((match) => match.matchNumber)).toEqual([
      73,
      75,
      74,
      77,
      82,
      81,
      84,
      83,
      76,
      78,
    ]);
  });
});
