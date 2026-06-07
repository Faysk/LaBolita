import { describe, expect, it } from "vitest";
import { COUNTRIES, countryFlagEmoji } from "@/lib/countries";

describe("pool country flags", () => {
  it("offers a broad ISO country catalog beyond tournament teams", () => {
    expect(COUNTRIES.length).toBeGreaterThan(240);
    expect(COUNTRIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "br" }),
        expect.objectContaining({ code: "pt" }),
        expect.objectContaining({ code: "in" }),
      ]),
    );
  });

  it("creates a regional flag emoji from an ISO code", () => {
    expect(countryFlagEmoji("br")).toBe("🇧🇷");
    expect(countryFlagEmoji("../")).toBe("🏳");
  });
});
