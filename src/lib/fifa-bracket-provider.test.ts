import { describe, expect, it } from "vitest";
import {
  normalizeFifaBracketParticipants,
  normalizeFifaBracketResults,
} from "@/lib/fifa-bracket-provider";

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

describe("normalizeFifaBracketResults", () => {
  it("extracts official knockout scores and penalty winners", () => {
    expect(
      normalizeFifaBracketResults({
        KnockoutStages: [
          {
            Matches: [
              {
                MatchNumber: 74,
                HomeTeam: { Abbreviation: "GER", IdTeam: "43942" },
                AwayTeam: { Abbreviation: "PAR", IdTeam: "43928" },
                HomeTeamScore: 1,
                AwayTeamScore: 1,
                HomeTeamPenaltyScore: 3,
                AwayTeamPenaltyScore: 4,
                Winner: "43928",
              },
              {
                MatchNumber: 76,
                HomeTeam: { Abbreviation: "BRA", IdTeam: "43924" },
                AwayTeam: { Abbreviation: "JPN", IdTeam: "43819" },
                HomeTeamScore: 2,
                AwayTeamScore: 1,
                Winner: null,
              },
              {
                MatchNumber: 80,
                HomeTeam: { Abbreviation: "ENG" },
                AwayTeam: { Abbreviation: "COD" },
                HomeTeamScore: null,
                AwayTeamScore: null,
                Winner: null,
              },
            ],
          },
        ],
      }),
    ).toEqual([
      {
        matchNumber: 74,
        homeScore: 1,
        awayScore: 1,
        advancingTeamCode: "PAR",
      },
      {
        matchNumber: 76,
        homeScore: 2,
        awayScore: 1,
        advancingTeamCode: "BRA",
      },
    ]);
  });

  it("accepts object winners when FIFA returns a team object", () => {
    expect(
      normalizeFifaBracketResults({
        KnockoutStages: [
          {
            Matches: [
              {
                MatchNumber: 75,
                HomeTeam: { Abbreviation: "NED", IdTeam: "43960" },
                AwayTeam: { Abbreviation: "MAR", IdTeam: "43872" },
                HomeTeamScore: 1,
                AwayTeamScore: 1,
                Winner: { IdTeam: "43872", Abbreviation: "MAR" },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      {
        matchNumber: 75,
        homeScore: 1,
        awayScore: 1,
        advancingTeamCode: "MAR",
      },
    ]);
  });

  it("skips tied matches until FIFA exposes an official winner", () => {
    expect(
      normalizeFifaBracketResults({
        KnockoutStages: [
          {
            Matches: [
              {
                MatchNumber: 75,
                HomeTeam: { Abbreviation: "NED" },
                AwayTeam: { Abbreviation: "MAR" },
                HomeTeamScore: 1,
                AwayTeamScore: 1,
                Winner: null,
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });

  it("rejects duplicate official result match numbers", () => {
    expect(() =>
      normalizeFifaBracketResults({
        KnockoutStages: [
          {
            Matches: [
              {
                MatchNumber: 73,
                HomeTeam: { Abbreviation: "RSA" },
                AwayTeam: { Abbreviation: "CAN" },
                HomeTeamScore: 0,
                AwayTeamScore: 1,
              },
              {
                MatchNumber: 73,
                HomeTeam: { Abbreviation: "RSA" },
                AwayTeam: { Abbreviation: "CAN" },
                HomeTeamScore: 0,
                AwayTeamScore: 1,
              },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate match results/);
  });
});
