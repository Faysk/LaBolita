import { NextResponse } from "next/server";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { ensureOfficialPoolMembership } from "@/lib/official-pool";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/urls";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeRedirectPath(url.searchParams.get("next"));
  const destination = new URL(nextPath, url.origin);
  const supabase = await createServerSupabaseClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/entrar?erro=oauth", url.origin));
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth code exchange failed", {
      code: exchangeError.code,
      message: exchangeError.message,
    });
    return NextResponse.redirect(new URL("/entrar?erro=oauth", url.origin));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Authenticated user could not be loaded after OAuth", {
      code: userError?.code,
      message: userError?.message,
    });
    return NextResponse.redirect(new URL("/entrar?erro=oauth", url.origin));
  }

  const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  if (typeof avatarUrl === "string" && avatarUrl.startsWith("https://")) {
    const { error: avatarError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);
    if (avatarError) {
      console.error("Profile avatar synchronization failed", {
        code: avatarError.code,
        message: avatarError.message,
      });
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("terms_accepted_at, terms_version, disabled_at")
    .eq("id", user.id)
    .single();
  if (profileError) {
    console.error("Profile could not be loaded after OAuth", {
      code: profileError.code,
      message: profileError.message,
    });
    return NextResponse.redirect(termsRedirect(url.origin, nextPath, "registro"));
  }

  if (profile?.disabled_at) {
    return NextResponse.redirect(new URL("/conta-suspensa", url.origin));
  }
  if (!profile?.terms_accepted_at || profile.terms_version !== CURRENT_TERMS_VERSION) {
    return NextResponse.redirect(termsRedirect(url.origin, nextPath));
  }

  await ensureOfficialPoolMembership(supabase);

  return NextResponse.redirect(destination);
}

function termsRedirect(origin: string, nextPath: string, error?: string) {
  const destination = new URL("/aceitar-termos", origin);
  destination.searchParams.set("next", nextPath);
  if (error) destination.searchParams.set("erro", error);
  return destination;
}
