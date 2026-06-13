import { describe, expect, it } from "vitest";
import {
  specialMarketKeyFromSlug,
  specialMarketPath,
  specialProgress,
} from "@/lib/special-market-display";

describe("special market display", () => {
  it("maps public slugs to internal market keys", () => {
    expect(specialMarketPath("top_scorer")).toBe("/especiais/artilheiro");
    expect(specialMarketKeyFromSlug("bola-de-ouro")).toBe("golden_ball");
  });

  it("calculates special prediction progress", () => {
    const progress = specialProgress([
      { key: "top_scorer", locked: false, pickCount: 1, predictions: [{}] },
      { key: "champion", locked: false, pickCount: 1, predictions: [] },
    ]);

    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.next?.key).toBe("champion");
  });
});
