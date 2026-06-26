import { describe, expect, it } from "vitest";
import { normalizeFifaBracketParticipants } from "@/lib/fifa-bracket-provider";

describe("normalizeFifaBracketParticipants", () => {
  it("extracts officially resolved knockout participants by match number", () => {
    expect(
      normalizeFifaBracketParticipants({
        KnockoutStages: [
          {
            Matches: [
              {
                MatchNumber: 74,
                HomeTeam: { Abbreviation: "GER", IdCountry: "GER" },
                AwayTeam: null,
              },
              {
                MatchNumber: 73,
                HomeTeam: { Abbreviation: "RSA", IdCountry: "RSA" },
                AwayTeam: { Abbreviation: "CAN", IdCountry: "CAN" },
              },
              {
                MatchNumber: 80,
                HomeTeam: null,
                AwayTeam: null,
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { matchNumber: 73, homeTeamCode: "RSA", awayTeamCode: "CAN" },
      { matchNumber: 74, homeTeamCode: "GER", awayTeamCode: null },
      { matchNumber: 80, homeTeamCode: null, awayTeamCode: null },
    ]);
  });

  it("falls back to IdCountry when Abbreviation is absent", () => {
    expect(
      normalizeFifaBracketParticipants({
        KnockoutStages: [
          {
            Matches: [
              {
                MatchNumber: 88,
                HomeTeam: { IdCountry: "cod" },
                AwayTeam: { Abbreviation: " civ " },
              },
            ],
          },
        ],
      }),
    ).toEqual([{ matchNumber: 88, homeTeamCode: "COD", awayTeamCode: "CIV" }]);
  });

  it("rejects duplicate official match numbers", () => {
    expect(() =>
      normalizeFifaBracketParticipants({
        KnockoutStages: [
          {
            Matches: [
              { MatchNumber: 73, HomeTeam: null, AwayTeam: null },
              { MatchNumber: 73, HomeTeam: null, AwayTeam: null },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate match numbers/);
  });
});
