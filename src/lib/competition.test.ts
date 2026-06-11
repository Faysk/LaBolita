import { describe, expect, it } from "vitest";
import {
  buildGroupStandings,
  matchesForTeam,
  nextMatchForTeam,
  standingForTeam,
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
