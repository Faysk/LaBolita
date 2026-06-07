import { describe, expect, it } from "vitest";
import {
  assertCompleteObservationSet,
  assertDatabaseMappingComplete,
  normalizeEspnFeed,
  normalizeWorldCupFeed,
} from "@/lib/results-provider";

function worldCupGames(
  override: Partial<{
    id: string;
    home_score: string;
    away_score: string;
    finished: string | boolean;
    time_elapsed: string | number;
  }> = {},
) {
  return Array.from({ length: 104 }, (_, index) => ({
    id: String(index + 1),
    home_score: "0",
    away_score: "0",
    finished: "FALSE",
    time_elapsed: "notstarted",
    ...override,
  }));
}

describe("normalizeWorldCupFeed", () => {
  it("does not expose zero scores before kickoff", () => {
    const result = normalizeWorldCupFeed({ games: worldCupGames() });

    expect(result[0]).toEqual({
      providerMatchId: "worldcup26:1",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
    });
  });

  it("normalizes live and finished results", () => {
    const games = worldCupGames();
    games[1] = { ...games[1], home_score: "1", time_elapsed: "63" };
    games[2] = {
      ...games[2],
      home_score: "2",
      away_score: "2",
      finished: true,
      time_elapsed: "finished",
    };

    expect(normalizeWorldCupFeed({ games }).slice(1, 3)).toMatchObject([
      { status: "live", homeScore: 1, awayScore: 0 },
      { status: "finished", homeScore: 2, awayScore: 2 },
    ]);
  });

  it("rejects implausible provider scores", () => {
    expect(() =>
      normalizeWorldCupFeed({
        games: worldCupGames({
          home_score: "99",
          finished: true,
          time_elapsed: "finished",
        }),
      }),
    ).toThrow(/Invalid provider score/);
  });

  it("rejects partial and duplicate feeds", () => {
    expect(() => normalizeWorldCupFeed({ games: worldCupGames().slice(0, 103) })).toThrow(
      /expected 104/,
    );

    const duplicate = worldCupGames();
    duplicate[103] = { ...duplicate[103], id: "1" };
    expect(() => normalizeWorldCupFeed({ games: duplicate })).toThrow(/duplicate/);
  });
});

describe("normalizeEspnFeed", () => {
  it("maps ESPN matches to internal provider ids by kickoff and teams", () => {
    const schedule = Array.from({ length: 104 }, (_, index) => ({
      providerMatchId: `worldcup26:${index + 1}`,
      scheduledAt: new Date(Date.UTC(2026, 5, 11, 19 + index)).toISOString(),
      homeTeamCode: `H${index}`,
      awayTeamCode: `A${index}`,
    }));
    const events = schedule.map((match, index) => ({
      date: match.scheduledAt,
      status: {
        type: {
          completed: index === 1,
          state: index === 0 ? "in" : index === 1 ? "post" : "pre",
        },
      },
      competitions: [
        {
          competitors: [
            {
              homeAway: "home",
              score: index === 0 ? "2" : "0",
              team: { abbreviation: match.homeTeamCode },
            },
            {
              homeAway: "away",
              score: index === 0 ? "1" : "0",
              team: { abbreviation: match.awayTeamCode },
            },
          ],
        },
      ],
    }));

    expect(normalizeEspnFeed({ events }, schedule).slice(0, 2)).toEqual([
      {
        providerMatchId: "worldcup26:1",
        status: "live",
        homeScore: 2,
        awayScore: 1,
      },
      {
        providerMatchId: "worldcup26:2",
        status: "finished",
        homeScore: 0,
        awayScore: 0,
      },
    ]);
  });
});

describe("assertCompleteObservationSet", () => {
  it("accepts a configurable expected total for focused callers", () => {
    expect(() =>
      assertCompleteObservationSet(
        [
          {
            providerMatchId: "provider:1",
            status: "scheduled",
            homeScore: null,
            awayScore: null,
          },
        ],
        1,
      ),
    ).not.toThrow();
  });
});

describe("assertDatabaseMappingComplete", () => {
  const observations = Array.from({ length: 104 }, (_, index) => ({
    providerMatchId: `provider:${index + 1}`,
    status: "scheduled" as const,
    homeScore: null,
    awayScore: null,
  }));

  it("accepts a complete one-to-one provider mapping", () => {
    expect(() =>
      assertDatabaseMappingComplete(
        observations,
        observations.map((item) => item.providerMatchId),
      ),
    ).not.toThrow();
  });

  it("rejects an incomplete database even when every stored match maps", () => {
    expect(() =>
      assertDatabaseMappingComplete(
        observations,
        observations.slice(0, 103).map((item) => item.providerMatchId),
      ),
    ).toThrow(/Database has 103 mapped matches/);
  });

  it("rejects mappings that point at a different provider match", () => {
    const ids = observations.map((item) => item.providerMatchId);
    ids[103] = "provider:missing";
    expect(() => assertDatabaseMappingComplete(observations, ids)).toThrow(
      /matched 103 database matches/,
    );
  });
});
