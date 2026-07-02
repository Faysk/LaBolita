import { describe, expect, it } from "vitest";
import { providerObservationSyncDecision } from "@/lib/provider-sync-policy";

const baseMatch = {
  status: "scheduled" as const,
  providerStatus: "scheduled",
  liveHomeScore: null,
  liveAwayScore: null,
};

describe("providerObservationSyncDecision", () => {
  it("applies forward provider updates for unfinished matches", () => {
    expect(
      providerObservationSyncDecision(baseMatch, {
        status: "live",
        homeScore: 1,
        awayScore: 0,
      }),
    ).toBe("apply");
  });

  it("skips unchanged provider snapshots", () => {
    expect(
      providerObservationSyncDecision(
        {
          ...baseMatch,
          providerStatus: "live",
          liveHomeScore: 1,
          liveAwayScore: 0,
        },
        {
          status: "live",
          homeScore: 1,
          awayScore: 0,
        },
      ),
    ).toBe("skip");
  });

  it("reports provider regressions for unfinished matches", () => {
    expect(
      providerObservationSyncDecision(
        {
          ...baseMatch,
          status: "live",
          providerStatus: "finished",
          liveHomeScore: 2,
          liveAwayScore: 1,
        },
        {
          status: "live",
          homeScore: 2,
          awayScore: 1,
        },
      ),
    ).toBe("regression");
  });

  it("does not regress finished matches back to live", () => {
    expect(
      providerObservationSyncDecision(
        {
          status: "finished",
          providerStatus: "finished",
          liveHomeScore: 2,
          liveAwayScore: 1,
        },
        {
          status: "live",
          homeScore: 2,
          awayScore: 1,
        },
      ),
    ).toBe("skip");
  });

  it("refreshes stale provider metadata when a finished match is confirmed final", () => {
    expect(
      providerObservationSyncDecision(
        {
          status: "finished",
          providerStatus: "live",
          liveHomeScore: 0,
          liveAwayScore: 1,
        },
        {
          status: "finished",
          homeScore: 2,
          awayScore: 1,
        },
      ),
    ).toBe("apply");
  });
});
