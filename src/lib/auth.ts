import "server-only";
import { redirect } from "next/navigation";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getViewerState() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { isAuthenticated: true, termsAccepted: true, isDisabled: false };
  }

  const user = await getOptionalUser(supabase);
  if (!user) {
    return { isAuthenticated: false, termsAccepted: false, isDisabled: false };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("terms_accepted_at, terms_version, disabled_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  return {
    isAuthenticated: true,
    termsAccepted:
      Boolean(profile?.terms_accepted_at) &&
      profile?.terms_version === CURRENT_TERMS_VERSION,
    isDisabled: Boolean(profile?.disabled_at),
  };
}

export async function requireUser(nextPath: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const user = await getOptionalUser(supabase);

  if (!user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("terms_accepted_at, terms_version, disabled_at")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;

  if (profile?.disabled_at) redirect("/conta-suspensa");
  if (
    !profile?.terms_accepted_at ||
    profile.terms_version !== CURRENT_TERMS_VERSION
  ) {
    redirect(`/aceitar-termos?next=${encodeURIComponent(nextPath)}`);
  }

  return { supabase, user, profile };
}

export async function requireAdmin() {
  const context = await requireUser("/admin");
  if (!context) return null;

  const { data: profile, error } = await context.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", context.user.id)
    .single();
  if (error) throw error;

  if (!profile?.is_admin) redirect("/?erro=admin");
  return context;
}

export async function requireMasterAdmin() {
  const context = await requireUser("/admin");
  if (!context) return null;

  const { data: profile, error } = await context.supabase
    .from("profiles")
    .select("is_master_admin")
    .eq("id", context.user.id)
    .single();
  if (error) throw error;

  if (!profile?.is_master_admin) redirect("/?erro=admin");
  return context;
}
