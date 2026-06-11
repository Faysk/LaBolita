import { describe, expect, it } from "vitest";
import { buildGroupStandings } from "@/lib/competition";
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
