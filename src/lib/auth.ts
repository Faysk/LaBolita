import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ViewerProfile = {
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_master_admin: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;
  disabled_at: string | null;
};

type AuthenticatedViewerContext = {
  supabase: SupabaseClient;
  user: User;
  profile: ViewerProfile | null;
};

export const getViewerContext = cache(async function getViewerContext() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { supabase: null, user: null, profile: null, demoMode: true };
  }

  const user = await getOptionalUser(supabase);
  if (!user) {
    return { supabase, user: null, profile: null, demoMode: false };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "display_name, avatar_url, is_admin, is_master_admin, terms_accepted_at, terms_version, disabled_at",
    )
    .eq("id", user.id)
    .single();
  if (error) throw error;

  return {
    supabase,
    user,
    profile: profile as ViewerProfile | null,
    demoMode: false,
  };
});

export async function getViewerState() {
  const { user, profile, demoMode } = await getViewerContext();
  if (demoMode) {
    return { isAuthenticated: true, termsAccepted: true, isDisabled: false };
  }

  if (!user) {
    return { isAuthenticated: false, termsAccepted: false, isDisabled: false };
  }

  return {
    isAuthenticated: true,
    termsAccepted:
      Boolean(profile?.terms_accepted_at) &&
      profile?.terms_version === CURRENT_TERMS_VERSION,
    isDisabled: Boolean(profile?.disabled_at),
  };
}

export async function requireUser(
  nextPath: string,
): Promise<AuthenticatedViewerContext | null> {
  const { supabase, user, profile, demoMode } = await getViewerContext();
  if (demoMode) return null;

  if (!user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);

  if (profile?.disabled_at) redirect("/conta-suspensa");
  if (
    !profile?.terms_accepted_at ||
    profile.terms_version !== CURRENT_TERMS_VERSION
  ) {
    redirect(`/aceitar-termos?next=${encodeURIComponent(nextPath)}`);
  }

  return { supabase: supabase!, user, profile };
}

export async function requireAdmin() {
  const context = await requireUser("/admin");
  if (!context) return null;

  if (!context.profile?.is_admin) redirect("/?erro=admin");
  return context;
}

export async function requireMasterAdmin() {
  const context = await requireUser("/admin");
  if (!context) return null;

  if (!context.profile?.is_master_admin) redirect("/?erro=admin");
  return context;
}
