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

  it("redirects returning users with current terms directly to the requested page", async () => {
    const supabase = client();
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toBe("https://labolita.test/palpites");
    expect(supabase.rpc).toHaveBeenCalledWith("record_user_session_event", {
      p_event_type: "login_completed",
      p_next_path: "/palpites",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("ensure_official_pool_membership");
  });

  it("keeps an authenticated user in the terms flow when the profile cannot be loaded", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      client({ profileError: { code: "PGRST116", message: "profile not found" } }),
    );

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toBe(
      "https://labolita.test/aceitar-termos?next=%2Fpalpites&erro=registro",
    );
  });

  it("requests terms acceptance only when the stored acceptance is missing", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue(
      client({ profile: { terms_accepted_at: null, terms_version: null, disabled_at: null } }),
    );

    const response = await GET(
      callbackRequest(),
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

  it("synchronizes the Google profile avatar without blocking login", async () => {
    const supabase = client();
    mocks.createServerSupabaseClient.mockResolvedValue(supabase);

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toBe("https://labolita.test/palpites");
    expect(supabase.from).toHaveBeenCalledWith("profiles");
  });
});

function callbackRequest() {
  return new Request(
    "https://labolita.test/auth/callback?code=valid&next=%2Fpalpites",
  );
}

function client({
  exchangeError = null,
  userError = null,
  profileError = null,
  profile = {
    terms_accepted_at: "2026-06-07T10:00:00.000Z",
    terms_version: "2026-06-07",
    disabled_at: null,
  },
}: {
  exchangeError?: { code: string; message: string } | null;
  userError?: { code: string; message: string } | null;
  profileError?: { code: string; message: string } | null;
  profile?: {
    terms_accepted_at: string | null;
    terms_version: string | null;
    disabled_at: string | null;
  };
} = {}) {
  const profileBuilder = {
    update: vi.fn(() => profileBuilder),
    select: vi.fn(() => profileBuilder),
    eq: vi.fn(() => profileBuilder),
    single: vi.fn().mockResolvedValue({ data: profile, error: profileError }),
    then: (
      resolve: (value: { data: null; error: null }) => unknown,
    ) => resolve({ data: null, error: null }),
  };

  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: exchangeError }),
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            user_metadata: { avatar_url: "https://lh3.googleusercontent.com/avatar" },
          },
        },
        error: userError,
      }),
    },
    from: vi.fn(() => profileBuilder),
    rpc: vi.fn().mockResolvedValue({ data: "pool-1", error: null }),
  };
}
