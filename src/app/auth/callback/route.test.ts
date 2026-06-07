import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { GET } from "@/app/auth/callback/route";

describe("OAuth callback", () => {
  beforeEach(() => {
    mocks.createServerSupabaseClient.mockReset();
  });

  it("redirects to the requested page after authentication and terms acceptance", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(client());

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toBe("https://labolita.test/palpites");
  });

  it("keeps an authenticated user in the terms flow when acceptance registration fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      client({ termsError: { code: "PGRST202", message: "function not found" } }),
    );

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toBe(
      "https://labolita.test/aceitar-termos?next=%2Fpalpites&erro=registro",
    );
  });

  it("requests terms acceptance when the callback has no current terms version", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(client());

    const response = await GET(
      new Request("https://labolita.test/auth/callback?code=valid&next=%2Fpalpites"),
    );

    expect(response.headers.get("location")).toBe(
      "https://labolita.test/aceitar-termos?next=%2Fpalpites",
    );
  });

  it("reports an OAuth error only when the code exchange fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      client({ exchangeError: { code: "bad_code", message: "invalid code" } }),
    );

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toBe("https://labolita.test/entrar?erro=oauth");
  });
});

function callbackRequest() {
  return new Request(
    "https://labolita.test/auth/callback?code=valid&next=%2Fpalpites&terms=2026-06-07",
  );
}

function client({
  exchangeError = null,
  termsError = null,
}: {
  exchangeError?: { code: string; message: string } | null;
  termsError?: { code: string; message: string } | null;
} = {}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: exchangeError }),
    },
    rpc: vi.fn().mockResolvedValue({ error: termsError }),
  };
}
