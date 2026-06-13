import { describe, expect, it } from "vitest";
import {
  buildSpecialOptions,
  computeAutomaticSuggestions,
  playerOptionKey,
  teamOptionKey,
} from "@/lib/special-markets";
import type { DemoMatch, DemoTeam } from "@/lib/types";

const teams: DemoTeam[] = [
  {
    id: "team-mex",
    code: "MEX",
    name: "México",
    shortName: "México",
    flag: "🇲🇽",
  },
  {
    id: "team-rsa",
    code: "RSA",
    name: "África do Sul",
    shortName: "África do Sul",
    flag: "🇿🇦",
  },
];

describe("special markets", () => {
  it("builds stable team and player option keys", () => {
    expect(teamOptionKey(teams[0])).toBe("team:MEX");
    expect(playerOptionKey("MEX", 10, "João Teste")).toBe("player:MEX:10:joao-teste");
  });

  it("maps squad players to database teams by code", () => {
    const options = buildSpecialOptions(teams, "players");
    expect(options.some((option) => option.teamCode === "MEX")).toBe(true);
    expect(options.every((option) => option.teamId === "team-mex" || option.teamId === "team-rsa")).toBe(true);
  });

  it("suggests team markets from current match scores", () => {
    const matches: DemoMatch[] = [
      {
        id: "match-1",
        stage: "group",
        stageLabel: "Grupo A",
        dateLabel: "11 jun",
        timeLabel: "20:00",
        venue: "Teste",
        locked: true,
        homeTeam: teams[0],
        awayTeam: teams[1],
        result: { homeScore: 2, awayScore: 0 },
      },
    ];

    expect(computeAutomaticSuggestions("team_most_goals", matches, teams)[0]?.key).toBe("team:MEX");
    expect(computeAutomaticSuggestions("team_fewest_conceded", matches, teams)[0]?.key).toBe("team:MEX");
  });
});
