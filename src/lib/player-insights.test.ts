import { describe, expect, it } from "vitest";
import { playerDetailInsight } from "@/lib/player-insights";
import type { SpecialOption } from "@/lib/special-markets";

describe("playerDetailInsight", () => {
  it("uses a curated context for high-profile players without repeating raw stat lines", () => {
    const insight = playerDetailInsight(
      playerOption({
        teamCode: "POR",
        teamName: "Portugal",
        number: 7,
        label: "RONALDO",
        goals: 143,
        caps: 228,
      }),
    );

    expect(insight).toContain("Portugal");
    expect(insight).toContain("decisão");
    expect(insight).not.toContain("143 gols");
    expect(insight).not.toContain("228 jogos");
  });

  it("gives Neymar a more specific Brazil-oriented reading", () => {
    const insight = playerDetailInsight(
      playerOption({
        teamCode: "BRA",
        teamName: "Brasil",
        number: 10,
        label: "NEYMAR JR",
        goals: 79,
        caps: 128,
      }),
    );

    expect(insight).toContain("Brasil");
    expect(insight).toContain("atrai marcação");
    expect(insight).not.toContain("79 gols");
  });

  it("falls back to role-based analysis for non-curated players", () => {
    const insight = playerDetailInsight(
      playerOption({
        teamCode: "SWE",
        teamName: "Suécia",
        number: 25,
        label: "NILSSON",
        goals: 4,
        caps: 9,
        age: 29,
      }),
    );

    expect(insight).toContain("Suécia");
    expect(insight).toContain("atacante");
    expect(insight).toContain("encaixe coletivo");
  });

  it("uses goalkeeper-specific criteria for goalkeeper markets", () => {
    const insight = playerDetailInsight(
      playerOption({
        teamCode: "MEX",
        teamName: "México",
        number: 1,
        label: "MALAGON",
        position: "GK",
        goals: 0,
        caps: 18,
      }),
    );

    expect(insight).toContain("goleiro");
    expect(insight).toContain("defesas difíceis");
  });
});

function playerOption(overrides: Partial<SpecialOption>): SpecialOption {
  return {
    key: "player:test",
    label: "Jogador",
    description: "Descrição",
    teamId: "team-id",
    teamCode: "TST",
    teamName: "Seleção",
    position: "FW",
    number: 9,
    fullName: "Jogador Teste",
    club: "Teste FC (ENG)",
    age: 30,
    heightCm: 180,
    caps: 10,
    goals: 2,
    ...overrides,
  };
}
