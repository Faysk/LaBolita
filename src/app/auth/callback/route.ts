import { NextResponse } from "next/server";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/urls";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const termsVersion = url.searchParams.get("terms");
  const destination = new URL(safeRedirectPath(url.searchParams.get("next")), url.origin);
  const supabase = await createServerSupabaseClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && termsVersion === CURRENT_TERMS_VERSION) {
      const { error: termsError } = await supabase.rpc("accept_terms", {
        p_version: termsVersion,
      });
      if (!termsError) return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(new URL("/entrar?erro=auth", url.origin));
}
