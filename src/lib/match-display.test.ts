import { describe, expect, it } from "vitest";
import {
  initialPredictionFilter,
  prioritizeHomeMatches,
} from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

describe("match display priorities", () => {
  it("puts live matches before pending and saved matches", () => {
    const matches = [
      match("saved", { prediction: { homeScore: 1, awayScore: 0 } }),
      match("pending"),
      match("live", { locked: true, providerStatus: "live", liveResult: { homeScore: 1, awayScore: 1 } }),
    ];

    expect(prioritizeHomeMatches(matches).map((item) => item.id)).toEqual([
      "live",
      "pending",
      "saved",
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
