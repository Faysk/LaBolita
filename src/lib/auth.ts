import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser(nextPath: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  return { supabase, user };
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
