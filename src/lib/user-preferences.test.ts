import { describe, expect, it } from "vitest";
import {
  formatGmtOffset,
  formatPreferredDateTime,
  GMT_OFFSET_OPTIONS,
  normalizeThemePreference,
  normalizeTimePreference,
} from "@/lib/user-preferences";

describe("user preferences", () => {
  it("formats manual GMT offsets", () => {
    expect(formatGmtOffset(-180)).toBe("GMT-3");
    expect(formatGmtOffset(60)).toBe("GMT+1");
    expect(formatGmtOffset(330)).toBe("GMT+5:30");
  });

  it("formats match time with a fixed GMT override", () => {
    expect(
      formatPreferredDateTime(
        "2026-06-12T19:00:00Z",
        true,
        { mode: "offset", offsetMinutes: 60 },
      ),
    ).toBe("12 jun · 20:00 · GMT+1");
  });

  it("formats match time with a named time zone", () => {
    expect(
      formatPreferredDateTime(
        "2026-06-12T19:00:00Z",
        true,
        { mode: "zone", timeZone: "America/Sao_Paulo" },
      ),
    ).toBe("12 jun · 16:00 · GMT-3");
  });

  it("offers hourly GMT offsets from -12 to +14", () => {
    expect(GMT_OFFSET_OPTIONS[0]).toEqual({ value: -720, label: "GMT-12" });
    expect(GMT_OFFSET_OPTIONS.at(-1)).toEqual({ value: 840, label: "GMT+14" });
    expect(GMT_OFFSET_OPTIONS).toHaveLength(27);
    expect(GMT_OFFSET_OPTIONS).toContainEqual({
      value: -180,
      label: "GMT-3 (São Paulo / Buenos Aires)",
    });
    expect(GMT_OFFSET_OPTIONS).toContainEqual({
      value: 60,
      label: "GMT+1 (Lisboa / Londres)",
    });
    expect(GMT_OFFSET_OPTIONS.every((option) => option.value % 60 === 0)).toBe(true);
  });

  it("normalizes persisted preferences defensively", () => {
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("neon")).toBeNull();
    expect(normalizeTimePreference("auto", null, null)).toEqual({ mode: "auto" });
    expect(normalizeTimePreference("zone", "Europe/Lisbon", null)).toEqual({
      mode: "zone",
      timeZone: "Europe/Lisbon",
    });
    expect(normalizeTimePreference("offset", null, 60)).toEqual({
      mode: "offset",
      offsetMinutes: 60,
    });
    expect(normalizeTimePreference("offset", null, 90)).toBeNull();
  });
});
