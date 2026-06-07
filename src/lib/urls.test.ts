import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/urls";

describe("safeRedirectPath", () => {
  it("accepts an internal path", () => {
    expect(safeRedirectPath("/palpites?fase=grupo")).toBe("/palpites?fase=grupo");
  });

  it.each([
    "https://example.com",
    "//example.com",
    "javascript:alert(1)",
    "",
  ])("rejects unsafe redirect %s", (path) => {
    expect(safeRedirectPath(path)).toBe("/");
  });
});
