import { describe, expect, it } from "vitest";
import { normalizeWorldCupFeed } from "@/lib/results-provider";

describe("normalizeWorldCupFeed", () => {
  it("does not expose zero scores before kickoff", () => {
    expect(
      normalizeWorldCupFeed({
        games: [
          {
            id: "1",
            home_score: "0",
            away_score: "0",
            finished: "FALSE",
            time_elapsed: "notstarted",
          },
        ],
      }),
    ).toEqual([
      {
        providerMatchId: "worldcup26:1",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      },
    ]);
  });

  it("normalizes live and finished results", () => {
    expect(
      normalizeWorldCupFeed({
        games: [
          {
            id: "2",
            home_score: "1",
            away_score: "0",
            finished: false,
            time_elapsed: "63",
          },
          {
            id: "3",
            home_score: "2",
            away_score: "2",
            finished: true,
            time_elapsed: "finished",
          },
        ],
      }),
    ).toMatchObject([
      { status: "live", homeScore: 1, awayScore: 0 },
      { status: "finished", homeScore: 2, awayScore: 2 },
    ]);
  });

  it("rejects implausible provider scores", () => {
    expect(() =>
      normalizeWorldCupFeed({
        games: [
          {
            id: "4",
            home_score: "99",
            away_score: "0",
            finished: true,
            time_elapsed: "finished",
          },
        ],
      }),
    ).toThrow(/Invalid provider score/);
  });
});
