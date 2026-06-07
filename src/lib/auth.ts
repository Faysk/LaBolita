import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getViewerState() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { isAuthenticated: true, termsAccepted: true, isDisabled: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { isAuthenticated: false, termsAccepted: false, isDisabled: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted_at, disabled_at")
    .eq("id", user.id)
    .single();

  return {
    isAuthenticated: true,
    termsAccepted: Boolean(profile?.terms_accepted_at),
    isDisabled: Boolean(profile?.disabled_at),
  };
}

export async function requireUser(nextPath: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted_at, disabled_at")
    .eq("id", user.id)
    .single();

  if (profile?.disabled_at) redirect("/conta-suspensa");
  if (!profile?.terms_accepted_at) {
    redirect(`/aceitar-termos?next=${encodeURIComponent(nextPath)}`);
  }

  return { supabase, user, profile };
}

export async function requireAdmin() {
  const context = await requireUser("/admin");
  if (!context) return null;

  const { data: profile } = await context.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", context.user.id)
    .single();

  if (!profile?.is_admin) redirect("/?erro=admin");
  return context;
}

export async function requireMasterAdmin() {
  const context = await requireUser("/admin");
  if (!context) return null;

  const { data: profile } = await context.supabase
    .from("profiles")
    .select("is_master_admin")
    .eq("id", context.user.id)
    .single();

  if (!profile?.is_master_admin) redirect("/?erro=admin");
  return context;
}
