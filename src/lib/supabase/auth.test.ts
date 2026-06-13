import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getOptionalUser, isRecoverableAuthError } from "@/lib/supabase/auth";

function supabaseWithAuthResult(result: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(result),
    },
  } as unknown as SupabaseClient;
}

describe("getOptionalUser", () => {
  it("returns the authenticated user when the session is valid", async () => {
    const user = { id: "user-1", email: "user@example.com" };
    const supabase = supabaseWithAuthResult({
      data: { user },
      error: null,
    });

    await expect(getOptionalUser(supabase)).resolves.toBe(user);
  });

  it("treats stale refresh tokens as signed out", async () => {
    const supabase = supabaseWithAuthResult({
      data: { user: null },
      error: new Error("Invalid Refresh Token: Refresh Token Not Found"),
    });

    await expect(getOptionalUser(supabase)).resolves.toBeNull();
  });

  it("still throws unexpected auth errors", async () => {
    const error = new Error("Supabase Auth is temporarily unavailable");
    const supabase = supabaseWithAuthResult({
      data: { user: null },
      error,
    });

    await expect(getOptionalUser(supabase)).rejects.toBe(error);
  });
});

describe("isRecoverableAuthError", () => {
  it("matches invalid token messages", () => {
    expect(isRecoverableAuthError(new Error("invalid JWT"))).toBe(true);
    expect(isRecoverableAuthError(new Error("session not found"))).toBe(true);
  });
});
