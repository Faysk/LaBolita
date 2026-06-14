import { describe, expect, it } from "vitest";
import { teamDetailInsight } from "@/lib/team-insights";
import type { SpecialOption } from "@/lib/special-markets";

describe("teamDetailInsight", () => {
  it("describes attacking markets without repeating raw table stats", () => {
    const insight = teamDetailInsight(
      teamOption({
        teamCode: "CZE",
        teamName: "Chéquia",
        groupName: "Grupo A",
        teamStats: {
          played: 1,
          points: 0,
          wins: 0,
          draws: 0,
          losses: 1,
          goalsFor: 1,
          goalsAgainst: 2,
          goalDifference: -1,
        },
      }),
      "team_most_goals",
    );

    expect(insight).toContain("Chéquia");
    expect(insight).toContain("mais agressivo");
    expect(insight).toContain("volume");
    expect(insight).not.toContain("0 ponto");
    expect(insight).not.toContain("1 gol");
  });

  it("uses defensive criteria for fewest conceded markets", () => {
    const insight = teamDetailInsight(
      teamOption({
        teamCode: "BRA",
        teamName: "Brasil",
        teamStats: {
          played: 1,
          points: 3,
          wins: 1,
          draws: 0,
          losses: 0,
          goalsFor: 3,
          goalsAgainst: 0,
          goalDifference: 3,
        },
      }),
      "team_fewest_conceded",
    );

    expect(insight).toContain("Brasil");
    expect(insight).toContain("equipe protegida");
    expect(insight).toContain("menos gols sofridos");
  });

  it("uses knockout-specific context for champion picks", () => {
    const insight = teamDetailInsight(teamOption({ teamCode: "POR", teamName: "Portugal" }), "champion");

    expect(insight).toContain("Portugal");
    expect(insight).toContain("caminho");
    expect(insight).toContain("campeão");
  });
});

function teamOption(overrides: Partial<SpecialOption>): SpecialOption {
  return {
    key: "team:TST",
    label: "Seleção",
    description: "Descrição",
    teamId: "team-id",
    teamCode: "TST",
    teamName: "Seleção",
    groupName: "Grupo X",
    squadTopScorer: "Artilheiro",
    squadTopScorerGoals: 20,
    squadMostCapped: "Capitão",
    squadMostCappedCaps: 80,
    squadAverageAge: 27,
    squadAverageHeight: 181,
    teamStats: {
      played: 0,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    },
    ...overrides,
  };
}
