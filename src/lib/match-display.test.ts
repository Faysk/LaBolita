import { describe, expect, it } from "vitest";
import {
  initialPredictionFilter,
  prioritizeHomeMatches,
  selectHomeTimelineMatches,
} from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

describe("match display priorities", () => {
  it("puts live matches first and then keeps chronological order", () => {
    const matches = [
      match("pending-later", { scheduledAt: "2026-06-14T20:00:00Z" }),
      match("saved-earlier", {
        scheduledAt: "2026-06-12T20:00:00Z",
        prediction: { homeScore: 1, awayScore: 0 },
      }),
      match("live", {
        locked: true,
        providerStatus: "live",
        scheduledAt: "2026-06-13T20:00:00Z",
        liveResult: { homeScore: 1, awayScore: 1 },
      }),
    ];

    expect(prioritizeHomeMatches(matches).map((item) => item.id)).toEqual([
      "live",
      "saved-earlier",
      "pending-later",
    ]);
  });

  it("keeps finished matches behind upcoming matches", () => {
    const matches = [
      match("finished", {
        scheduledAt: "2026-06-11T20:00:00Z",
        result: { homeScore: 2, awayScore: 0 },
      }),
      match("upcoming", { scheduledAt: "2026-06-12T20:00:00Z" }),
    ];

    expect(prioritizeHomeMatches(matches).map((item) => item.id)).toEqual([
      "upcoming",
      "finished",
    ]);
  });

  it("keeps provider-finished matches awaiting confirmation behind upcoming matches", () => {
    const matches = [
      match("awaiting-confirmation", {
        providerStatus: "finished",
        scheduledAt: "2026-06-11T20:00:00Z",
        liveResult: { homeScore: 2, awayScore: 0 },
      }),
      match("upcoming", { scheduledAt: "2026-06-12T20:00:00Z" }),
    ];

    expect(prioritizeHomeMatches(matches).map((item) => item.id)).toEqual([
      "upcoming",
      "awaiting-confirmation",
    ]);
  });

  it("selects only live or still-open matches for the home timeline", () => {
    const matches = [
      match("stale-locked", {
        locked: true,
        scheduledAt: "2026-06-11T20:00:00Z",
      }),
      match("finished", {
        locked: true,
        scheduledAt: "2026-06-11T22:00:00Z",
        result: { homeScore: 2, awayScore: 0 },
      }),
      match("live", {
        locked: true,
        providerStatus: "live",
        scheduledAt: "2026-06-12T18:00:00Z",
        liveResult: { homeScore: 1, awayScore: 1 },
      }),
      match("open", { scheduledAt: "2026-06-12T20:00:00Z" }),
    ];

    expect(selectHomeTimelineMatches(matches).map((item) => item.id)).toEqual([
      "live",
      "open",
    ]);
  });

  it("starts with live, then pending, then all", () => {
    expect(initialPredictionFilter([match("live", { providerStatus: "live" })])).toBe("live");
    expect(initialPredictionFilter([match("pending")])).toBe("pending");
    expect(
      initialPredictionFilter([
        match("saved", { prediction: { homeScore: 1, awayScore: 0 } }),
      ]),
    ).toBe("all");
  });
});

function match(id: string, overrides: Partial<DemoMatch> = {}): DemoMatch {
  return {
    id,
    stage: "group",
    stageLabel: "Grupo A",
    dateLabel: "11 jun",
    timeLabel: "20:00",
    scheduledAt: "2026-06-11T20:00:00Z",
    venue: "Estádio",
    locked: false,
    homeTeam: { id: "home", name: "Casa", shortName: "Casa", flag: "🇧🇷" },
    awayTeam: { id: "away", name: "Fora", shortName: "Fora", flag: "🇵🇹" },
    ...overrides,
  };
}
