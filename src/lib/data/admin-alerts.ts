import "server-only";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminAlertView = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "critical";
  audience: "all" | "admins" | "pool_owners" | "specific_user";
  linkHref: string | null;
  linkLabel: string | null;
  createdAt: string;
  expiresAt: string | null;
  readAt: string | null;
};

type AdminAlertRow = {
  id: string;
  title: string;
  message: string;
  severity: AdminAlertView["severity"];
  audience: AdminAlertView["audience"];
  link_href: string | null;
  link_label: string | null;
  created_at: string;
  expires_at: string | null;
  read_at: string | null;
};

export async function getAdminAlertsForCurrentUser(): Promise<AdminAlertView[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const user = await getOptionalUser(supabase);
  if (!user) return [];

  const { data, error } = await supabase.rpc("get_my_admin_alerts");
  if (error) {
    if (isMissingAlertsMigration(error)) return [];
    throw new Error("Não foi possível carregar os alertas administrativos.", {
      cause: error,
    });
  }

  return ((data ?? []) as AdminAlertRow[]).map((alert) => ({
    id: alert.id,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    audience: alert.audience,
    linkHref: alert.link_href,
    linkLabel: alert.link_label,
    createdAt: alert.created_at,
    expiresAt: alert.expires_at,
    readAt: alert.read_at,
  }));
}

function isMissingAlertsMigration(error: { code?: string; message?: string }) {
  return (
    error.code === "42883" ||
    error.code === "42P01" ||
    /get_my_admin_alerts|admin_alert/i.test(error.message ?? "")
  );
}
