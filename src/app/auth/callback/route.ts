import { NextResponse } from "next/server";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/urls";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const termsVersion = url.searchParams.get("terms");
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

  if (termsVersion !== CURRENT_TERMS_VERSION) {
    return NextResponse.redirect(termsRedirect(url.origin, nextPath));
  }

  const { error: termsError } = await supabase.rpc("accept_terms", {
    p_version: termsVersion,
  });
  if (termsError) {
    console.error("Terms acceptance after OAuth failed", {
      code: termsError.code,
      message: termsError.message,
    });
    return NextResponse.redirect(termsRedirect(url.origin, nextPath, "registro"));
  }

  return NextResponse.redirect(destination);
}

function termsRedirect(origin: string, nextPath: string, error?: string) {
  const destination = new URL("/aceitar-termos", origin);
  destination.searchParams.set("next", nextPath);
  if (error) destination.searchParams.set("erro", error);
  return destination;
}
