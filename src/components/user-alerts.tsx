"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Info,
  LoaderCircle,
  Megaphone,
  ShieldAlert,
  X,
} from "lucide-react";
import type { AdminAlertView } from "@/lib/data/admin-alerts";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function UserAlerts({
  alerts,
  compact = false,
}: {
  alerts: AdminAlertView[];
  compact?: boolean;
}) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => !alert.readAt && !hiddenIds.has(alert.id)),
    [alerts, hiddenIds],
  );

  if (visibleAlerts.length === 0) return null;

  async function dismiss(alertId: string) {
    if (pendingId) return;
    setPendingId(alertId);
    setHiddenIds((current) => new Set(current).add(alertId));

    const supabase = createBrowserSupabaseClient();
    if (supabase) {
      const { error } = await supabase.rpc("dismiss_admin_alert", {
        p_alert_id: alertId,
      });
      if (error) {
        setHiddenIds((current) => {
          const next = new Set(current);
          next.delete(alertId);
          return next;
        });
      }
    }

    setPendingId(null);
  }

  return (
    <section className={compact ? "mt-5 space-y-2" : "mt-6 space-y-3"}>
      {visibleAlerts.map((alert) => (
        <article
          key={alert.id}
          className={`rounded-2xl border p-4 shadow-sm ${alertToneClass(alert.severity)}`}
        >
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface/75">
              <AlertIcon severity={alert.severity} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider opacity-75">
                    {audienceLabel(alert.audience)}
                  </p>
                  <h2 className="mt-1 text-base font-black">{alert.title}</h2>
                </div>
                <button
                  type="button"
                  disabled={pendingId === alert.id}
                  onClick={() => dismiss(alert.id)}
                  aria-label={`Dispensar alerta ${alert.title}`}
                  className="interactive inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-surface/70 hover:bg-surface disabled:opacity-50"
                >
                  {pendingId === alert.id ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm leading-6">{alert.message}</p>
              {alert.linkHref && (
                <Link
                  href={alert.linkHref}
                  className="interactive mt-3 inline-flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs font-black text-brand shadow-sm"
                >
                  {alert.linkLabel ?? "Abrir"}
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function AlertIcon({ severity }: { severity: AdminAlertView["severity"] }) {
  if (severity === "critical") return <ShieldAlert className="size-5 text-danger-fg" />;
  if (severity === "warning") return <CircleAlert className="size-5 text-warning-fg" />;
  if (severity === "success") return <CheckCircle2 className="size-5 text-brand" />;
  if (severity === "info") return <Info className="size-5 text-info-fg" />;
  return <Megaphone className="size-5 text-brand" />;
}

function alertToneClass(severity: AdminAlertView["severity"]) {
  return (
    {
      critical: "status-danger",
      warning: "status-warning",
      success: "status-success",
      info: "status-info",
    }[severity] ?? "status-info"
  );
}

function audienceLabel(audience: AdminAlertView["audience"]) {
  return (
    {
      all: "Aviso geral",
      admins: "Aviso para admins",
      pool_owners: "Aviso para donos de bolão",
      specific_user: "Aviso direto",
    }[audience] ?? "Aviso"
  );
}
