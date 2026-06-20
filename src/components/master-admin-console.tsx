"use client";

import {
  Archive,
  ArchiveRestore,
  Activity,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  Gauge,
  History,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type {
  AdminSummary,
  AdminUserReport,
  AuditPeriod,
  AuditSource,
  MasterOverview,
  MasterPool,
  MasterUser,
} from "@/lib/data/admin";
import { CountryFlag } from "@/components/country-flag";
import { ProgressiveList } from "@/components/progressive-list";
import { COUNTRIES } from "@/lib/countries";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";

type AuditFilterNavigation = Pick<MasterOverview["auditFilters"], "source" | "period" | "query">;
type UserRiskSignal = {
  id: string;
  title: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "neutral";
};
type UserTimelineEntry = {
  id: string;
  source: string;
  title: string;
  detail: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  tone: "admin" | "activity" | "prediction" | "special";
};

const AUDIT_SOURCE_OPTIONS: { value: AuditSource; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "admin", label: "Admin" },
  { value: "activity", label: "Usuários" },
  { value: "predictions", label: "Palpites" },
  { value: "specials", label: "Especiais" },
];

const AUDIT_PERIOD_OPTIONS: { value: AuditPeriod; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Tudo" },
];

export function MasterAdminConsole({ overview }: { overview: MasterOverview }) {
  const router = useRouter();
  const tab = overview.activeTab;
  const [search, setSearch] = useState(overview.search);
  const [auditSource, setAuditSource] = useState<AuditSource>(overview.auditFilters.source);
  const [auditPeriod, setAuditPeriod] = useState<AuditPeriod>(overview.auditFilters.period);
  const [auditQuery, setAuditQuery] = useState(overview.auditFilters.query);
  const [pendingTab, setPendingTab] = useState<typeof tab | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNavigating = isPending || pendingTab !== null;
  const pendingLabel =
    pendingTab === "users" ? "usuários" : pendingTab === "audit" ? "auditoria" : "bolões";

  if (!overview.isGlobalAdmin) return null;

  function navigate(
    nextTab: typeof tab,
    nextPage = 1,
    nextSearch = "",
    nextAudit: AuditFilterNavigation = overview.auditFilters,
  ) {
    const normalizedSearch = nextSearch.trim();
    const normalizedAuditQuery = nextAudit.query.trim();
    const sameAuditFilters =
      nextTab !== "audit" ||
      (nextAudit.source === overview.auditFilters.source &&
        nextAudit.period === overview.auditFilters.period &&
        normalizedAuditQuery === overview.auditFilters.query.trim());
    if (
      nextTab === tab &&
      nextPage === overview.page &&
      normalizedSearch === overview.search.trim() &&
      sameAuditFilters
    ) {
      return;
    }
    const params = new URLSearchParams();
    params.set("master_tab", nextTab);
    if (nextTab === "audit") {
      if (nextAudit.source !== "all") params.set("master_audit_source", nextAudit.source);
      if (nextAudit.period !== "7d") params.set("master_audit_period", nextAudit.period);
      if (normalizedAuditQuery) params.set("master_audit_query", normalizedAuditQuery);
    } else if (normalizedSearch) {
      params.set("master_search", normalizedSearch);
    }
    if (nextPage > 1) params.set("master_page", String(nextPage));
    setPendingTab(nextTab);
    startTransition(() => {
      router.push(`/admin?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <section className="card mt-8 overflow-hidden">
      <div className="border-b bg-brand-strong p-5 text-white md:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-accent p-2 text-brand-strong"><ShieldCheck className="size-5" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-accent">{overview.isMaster ? "Master principal" : "Administrador promovido"}</p>
            <h2 className="mt-1 text-2xl font-black">Administração global</h2>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          Ajustes globais são reversíveis e registrados no histórico de auditoria.
        </p>
        <TermsEnforcementControl enabled={overview.termsEnforcementEnabled} />
        <AdminAlertComposer />
      </div>
      <AdminCommandCenter summary={overview.summary} />
      <div className="bg-surface/35 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            <TabButton active={tab === "pools"} pending={pendingTab === "pools"} disabled={isNavigating} onClick={() => navigate("pools")} icon={Archive}>Bolões</TabButton>
            <TabButton active={tab === "users"} pending={pendingTab === "users"} disabled={isNavigating} onClick={() => navigate("users")} icon={Users}>Usuários</TabButton>
            <TabButton active={tab === "audit"} pending={pendingTab === "audit"} disabled={isNavigating} onClick={() => navigate("audit")} icon={History}>Auditoria</TabButton>
          </div>
          {tab !== "audit" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                navigate(tab, 1, search);
              }}
              className="flex gap-2 md:w-[24rem]"
            >
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no servidor" className="w-full rounded-xl border bg-surface py-3 pl-10 pr-3 text-sm font-bold outline-none placeholder:text-muted focus:border-brand" />
              </label>
              <button type="submit" disabled={isNavigating} className="interactive rounded-xl bg-brand px-4 text-xs font-black text-white shadow-sm disabled:opacity-60">
                {pendingTab === tab ? "Buscando..." : "Buscar"}
              </button>
            </form>
          )}
        </div>
        {tab === "audit" && (
          <AuditFilterBar
            source={auditSource}
            period={auditPeriod}
            query={auditQuery}
            filters={overview.auditFilters}
            disabled={isNavigating}
            onSourceChange={setAuditSource}
            onPeriodChange={setAuditPeriod}
            onQueryChange={setAuditQuery}
            onSubmit={() =>
              navigate("audit", 1, "", {
                source: auditSource,
                period: auditPeriod,
                query: auditQuery,
              })
            }
            onReset={() => {
              setAuditSource("all");
              setAuditPeriod("7d");
              setAuditQuery("");
              navigate("audit", 1, "", { source: "all", period: "7d", query: "" });
            }}
          />
        )}

        <div className="relative" aria-busy={isNavigating}>
          {isNavigating && (
            <div className="absolute inset-x-0 top-4 z-10 flex justify-center px-4" aria-live="polite">
              <div className="flex items-center gap-2 rounded-full border border-brand/25 bg-surface px-4 py-2 text-xs font-black text-brand shadow-lg shadow-black/10">
                <LoaderCircle className="size-4 animate-spin" />
                Carregando {pendingLabel}
              </div>
            </div>
          )}
          <div className={isNavigating ? "pointer-events-none opacity-45 transition-opacity" : "transition-opacity"}>
            {tab === "pools" && <div className="mt-5 grid gap-4 lg:grid-cols-2">{overview.pools.map((pool) => <MasterPoolCard key={pool.poolId} pool={pool} />)}</div>}
            {tab === "users" && <div className="mt-5 grid gap-4 lg:grid-cols-2">{overview.users.map((user) => <MasterUserCard key={user.userId} user={user} report={overview.userReports[user.userId]} />)}</div>}
            {tab === "audit" && <AuditList entries={overview.audit} filters={overview.auditFilters} />}
            {((tab === "pools" && overview.pools.length === 0) ||
              (tab === "users" && overview.users.length === 0)) && (
              <p className="mt-5 rounded-2xl border bg-surface-muted p-5 text-sm text-muted">
                Nenhum resultado encontrado nesta página.
              </p>
            )}
            {(overview.hasPreviousPage || overview.hasNextPage) && (
              <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
                <button
                  type="button"
                  disabled={!overview.hasPreviousPage || isNavigating}
                  onClick={() => navigate(tab, overview.page - 1, overview.search)}
                  className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-brand hover:border-brand/70 hover:bg-surface-muted disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" /> Anterior
                </button>
                <span className="text-xs font-bold text-muted">Página {overview.page}</span>
                <button
                  type="button"
                  disabled={!overview.hasNextPage || isNavigating}
                  onClick={() => navigate(tab, overview.page + 1, overview.search)}
                  className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-brand hover:border-brand/70 hover:bg-surface-muted disabled:opacity-40"
                >
                  Próxima <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AuditFilterBar({
  source,
  period,
  query,
  filters,
  disabled,
  onSourceChange,
  onPeriodChange,
  onQueryChange,
  onSubmit,
  onReset,
}: {
  source: AuditSource;
  period: AuditPeriod;
  query: string;
  filters: MasterOverview["auditFilters"];
  disabled: boolean;
  onSourceChange: (source: AuditSource) => void;
  onPeriodChange: (period: AuditPeriod) => void;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  const total = filters.sourceSummary.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mt-4 rounded-2xl border bg-surface p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="grid gap-3 lg:grid-cols-[10rem_10rem_minmax(14rem,1fr)_auto_auto] lg:items-end"
      >
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-muted">
          Origem
          <select
            value={source}
            disabled={disabled}
            onChange={(event) => onSourceChange(event.target.value as AuditSource)}
            className="rounded-xl border bg-surface px-3 py-3 text-sm font-black normal-case tracking-normal text-foreground outline-none focus:border-brand disabled:opacity-60"
          >
            {AUDIT_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-muted">
          Período
          <select
            value={period}
            disabled={disabled}
            onChange={(event) => onPeriodChange(event.target.value as AuditPeriod)}
            className="rounded-xl border bg-surface px-3 py-3 text-sm font-black normal-case tracking-normal text-foreground outline-none focus:border-brand disabled:opacity-60"
          >
            {AUDIT_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-muted">
          Busca
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              disabled={disabled}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Ação, usuário, jogo, bolão..."
              className="w-full rounded-xl border bg-surface py-3 pl-10 pr-3 text-sm font-bold normal-case tracking-normal outline-none placeholder:text-muted focus:border-brand disabled:opacity-60"
            />
          </span>
        </label>
        <button
          type="submit"
          disabled={disabled}
          className="interactive rounded-xl bg-brand px-4 py-3 text-xs font-black text-white shadow-sm disabled:opacity-60"
        >
          Buscar
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          className="interactive rounded-xl border bg-surface px-4 py-3 text-xs font-black text-brand hover:border-brand/70 hover:bg-surface-muted disabled:opacity-60"
        >
          Limpar
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border bg-surface-muted px-3 py-1 text-[11px] font-black text-muted">
          {formatNumber(total)} eventos filtrados
        </span>
        {filters.sourceSummary.map((item) => (
          <span
            key={item.source}
            className={`rounded-full border px-3 py-1 text-[11px] font-black ${auditSourceTone(item.source)}`}
          >
            {item.label}: {formatNumber(item.count)}
          </span>
        ))}
      </div>
    </div>
  );
}

function AdminCommandCenter({ summary }: { summary: AdminSummary }) {
  const metrics = [
    {
      icon: Users,
      label: "Usuários",
      value: formatNumber(summary.users.total),
      detail: `${summary.users.active} ativos · ${summary.users.admins} admin`,
      tone: summary.users.disabled > 0 || summary.users.termsPending > 0 ? "warn" : "ok",
    },
    {
      icon: Archive,
      label: "Bolões",
      value: formatNumber(summary.pools.total),
      detail: `${summary.pools.memberships} vínculos · ${summary.pools.public} públicos`,
      tone: summary.pools.archived > 0 ? "warn" : "ok",
    },
    {
      icon: Gauge,
      label: "Palpites",
      value: formatNumber(summary.predictions.matchPredictions),
      detail: `${summary.predictions.changedMatchPredictions} alterados · ${summary.predictions.specialPredictions} especiais`,
      tone: summary.predictions.specialPredictions > 0 ? "ok" : "warn",
    },
    {
      icon: History,
      label: "Auditoria 24h",
      value: formatNumber(summary.audit.recentTotal),
      detail: `${summary.audit.resultChanges} placares · ${summary.audit.userActivityEvents} eventos`,
      tone: summary.audit.recentTotal > 0 ? "warn" : "ok",
    },
  ] as const;

  return (
    <div className="border-b bg-surface p-5 md:p-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <div className="rounded-2xl border bg-surface-muted/55 p-4">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-brand" />
            <h3 className="text-sm font-black">Conexões</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.connections.map((connection) => (
              <ConnectionPill key={connection.key} connection={connection} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-surface-muted/55 p-4">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-brand" />
            <h3 className="text-sm font-black">Próximas ações</h3>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {summary.nextActions.map((action) => (
              <div
                key={`${action.label}-${action.detail}`}
                className={`rounded-xl border px-3 py-2 ${
                  action.tone === "danger"
                    ? "status-danger"
                    : action.tone === "warn"
                      ? "status-warning"
                      : "status-success"
                }`}
              >
                <p className="text-xs font-black">{action.label}</p>
                <p className="mt-1 text-[11px] leading-4">{action.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {summary.audit.topActions.length > 0 && (
        <ProgressiveList
          initialCount={4}
          step={4}
          moreLabel="Ver mais ações"
          className="mt-4 flex flex-wrap gap-2"
          buttonClassName="interactive mt-3 inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1.5 text-[10px] font-black text-brand hover:border-brand/60"
        >
          {summary.audit.topActions.map((action) => (
            <span
              key={action.action}
              className="rounded-full border bg-surface px-3 py-1.5 text-xs font-bold text-muted"
            >
              {auditActionLabel(action.action)} · {action.count}
            </span>
          ))}
        </ProgressiveList>
      )}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="rounded-2xl border bg-surface-muted/70 p-4">
      <span
        className={`inline-flex rounded-xl p-2 ${
          tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-brand"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-xs font-bold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}

function ConnectionPill({
  connection,
}: {
  connection: AdminSummary["connections"][number];
}) {
  const Icon =
    connection.key === "service_role"
      ? KeyRound
      : connection.key === "auth"
        ? ShieldCheck
        : connection.key === "database"
          ? Database
          : connection.key === "results_feed"
            ? Activity
            : Clock3;
  const tone =
    connection.status === "danger"
      ? "status-danger"
      : connection.status === "warn"
        ? "status-warning"
        : "status-success";

  return (
    <span
      title={connection.detail}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${tone}`}
    >
      <Icon className="size-3.5" />
      {connection.label}
    </span>
  );
}

function TermsEnforcementControl({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || busy || reason.trim().length < 3) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("master_set_terms_enforcement", {
      p_enabled: !enabled,
      p_reason: reason,
    });
    if (rpcError) setError(friendlyServerError(rpcError, "Não foi possível alterar a exigência."));
    else {
      navigator.vibrate?.(25);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="mt-5 grid gap-2 rounded-2xl border border-white/15 bg-white/10 p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-white/60">Aceite no banco</p>
        <p className="mt-1 text-sm font-bold">{enabled ? "Exigência ativa" : "Aguardando publicação da interface nova"}</p>
      </div>
      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatório" className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-accent" />
      <button type="button" disabled={busy || reason.trim().length < 3} onClick={toggle} className="interactive flex items-center justify-center gap-1 rounded-xl bg-accent px-3 py-2 text-xs font-black text-brand-strong disabled:opacity-40">
        {busy && <LoaderCircle className="size-3 animate-spin" />} {enabled ? "Desativar" : "Ativar após deploy"}
      </button>
      {error && <p className="text-xs font-bold text-red-200 md:col-span-3">{error}</p>}
    </div>
  );
}

function AdminAlertComposer() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"info" | "success" | "warning" | "critical">("info");
  const [audience, setAudience] = useState<"all" | "admins" | "pool_owners" | "specific_user">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);

    const expiresAt =
      expiresInHours === "never"
        ? null
        : new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000).toISOString();

    const { error: rpcError } = await supabase.rpc("create_admin_alert", {
      p_title: title,
      p_message: message,
      p_severity: severity,
      p_audience: audience,
      p_target_user_id: audience === "specific_user" ? targetUserId.trim() : null,
      p_link_href: linkHref.trim() || null,
      p_link_label: linkLabel.trim() || null,
      p_expires_at: expiresAt,
      p_reason: reason,
    });

    if (rpcError) {
      setError(friendlyServerError(rpcError, "Não foi possível publicar o alerta."));
    } else {
      setTitle("");
      setMessage("");
      setTargetUserId("");
      setLinkHref("");
      setLinkLabel("");
      setReason("");
      setSuccess("Alerta publicado.");
      navigator.vibrate?.(25);
      router.refresh();
    }
    setBusy(false);
  }

  const targetMissing = audience === "specific_user" && targetUserId.trim().length < 30;
  const invalidLink = linkHref.trim().length > 0 && !linkHref.trim().startsWith("/");
  const disabled =
    busy ||
    title.trim().length < 3 ||
    message.trim().length < 3 ||
    reason.trim().length < 3 ||
    targetMissing ||
    invalidLink;

  return (
    <form
      onSubmit={publish}
      className="mt-4 grid gap-3 rounded-2xl border border-white/15 bg-white/10 p-3"
    >
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-accent" />
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-white/60">
            Alertas
          </p>
          <p className="text-sm font-bold">Publicar aviso no app</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          minLength={3}
          maxLength={80}
          placeholder="Título"
          className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-accent"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={audience}
            onChange={(event) => setAudience(event.target.value as typeof audience)}
            className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none focus:border-accent"
          >
            <option value="all">Todos</option>
            <option value="admins">Admins</option>
            <option value="pool_owners">Donos de bolão</option>
            <option value="specific_user">Usuário</option>
          </select>
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as typeof severity)}
            className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none focus:border-accent"
          >
            <option value="info">Info</option>
            <option value="success">Sucesso</option>
            <option value="warning">Atenção</option>
            <option value="critical">Crítico</option>
          </select>
        </div>
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        minLength={3}
        maxLength={360}
        rows={3}
        placeholder="Mensagem"
        className="resize-none rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-accent"
      />

      <div className="grid gap-2 md:grid-cols-[1fr_1fr_8rem]">
        <input
          value={audience === "specific_user" ? targetUserId : ""}
          disabled={audience !== "specific_user"}
          onChange={(event) => setTargetUserId(event.target.value)}
          placeholder="ID do usuário"
          className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-accent disabled:opacity-45"
        />
        <input
          value={linkHref}
          onChange={(event) => setLinkHref(event.target.value)}
          placeholder="Link interno, ex.: /especiais"
          className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-accent"
        />
        <input
          value={linkLabel}
          onChange={(event) => setLinkLabel(event.target.value)}
          placeholder="Botão"
          className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-accent"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-[9rem_1fr_auto]">
        <select
          value={expiresInHours}
          onChange={(event) => setExpiresInHours(event.target.value)}
          className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none focus:border-accent"
        >
          <option value="24">24h</option>
          <option value="72">3 dias</option>
          <option value="168">7 dias</option>
          <option value="never">Sem expirar</option>
        </select>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={200}
          placeholder="Motivo obrigatório"
          className="rounded-xl border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-accent"
        />
        <button
          type="submit"
          disabled={disabled}
          className="interactive flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-black text-brand-strong disabled:opacity-40"
        >
          {busy && <LoaderCircle className="size-3 animate-spin" />}
          Publicar
        </button>
      </div>
      {invalidLink && <p className="text-xs font-bold text-red-200">Use apenas caminhos internos iniciando com /.</p>}
      {error && <p className="text-xs font-bold text-red-200">{error}</p>}
      {success && <p className="text-xs font-bold text-emerald-100">{success}</p>}
    </form>
  );
}

function TabButton({ active, pending, disabled, onClick, icon: Icon, children }: { active: boolean; pending: boolean; disabled: boolean; onClick: () => void; icon: typeof Archive; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`interactive flex whitespace-nowrap items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black disabled:cursor-wait disabled:opacity-65 ${active || pending ? "bg-brand text-white shadow-sm" : "border bg-surface text-muted hover:text-foreground"}`}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />} {pending ? "Carregando..." : children}
    </button>
  );
}

function MasterPoolCard({ pool }: { pool: MasterPool }) {
  const router = useRouter();
  const [name, setName] = useState(pool.poolName);
  const [isPublic, setIsPublic] = useState(pool.isPublic);
  const [flagCode, setFlagCode] = useState(pool.flagCode);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<
    { user_id: string; display_name: string; role: "owner" | "admin" | "member" }[] | null
  >(null);

  async function update(archived: boolean) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("update_pool_with_flag", {
      p_pool_id: pool.poolId,
      p_name: name,
      p_is_public: isPublic,
      p_flag_code: flagCode,
      p_archived: archived,
      p_reason: reason,
    });
    if (rpcError) {
      setError(friendlyServerError(rpcError, "Não foi possível aplicar o ajuste master."));
      navigator.vibrate?.([25, 30, 25]);
    } else {
      navigator.vibrate?.(25);
      router.refresh();
    }
    setBusy(false);
  }

  async function loadMembers() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || busy) return;
    setBusy(true);
    const { data, error: rpcError } = await supabase.rpc("get_managed_pool_members", {
      p_pool_id: pool.poolId,
    });
    if (rpcError) setError(friendlyServerError(rpcError, "Não foi possível carregar os participantes."));
    else setMembers((data ?? []) as typeof members);
    setBusy(false);
  }

  async function removeMember(userId: string) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || busy || reason.trim().length < 3) return;
    setBusy(true);
    const { error: rpcError } = await supabase.rpc("remove_pool_member", {
      p_pool_id: pool.poolId,
      p_user_id: userId,
      p_reason: reason,
    });
    if (rpcError) setError(friendlyServerError(rpcError, "Não foi possível remover o participante."));
    else {
      setMembers((current) => current?.filter((member) => member.user_id !== userId) ?? []);
      navigator.vibrate?.(25);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <article className="rounded-2xl border bg-surface-muted/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3"><CountryFlag code={flagCode} size="sm" /><div><p className="font-black">{pool.poolName}</p><p className="mt-1 text-xs text-muted">Dono: {pool.ownerName} · {pool.memberCount} jogadores · {pool.inviteCode}</p></div></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${pool.archivedAt ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-brand"}`}>{pool.archivedAt ? "Arquivado" : "Ativo"}</span>
      </div>
      <div className="mt-4 grid gap-2">
        <input value={name} minLength={3} maxLength={60} onChange={(event) => setName(event.target.value)} aria-label={`Nome de ${pool.poolName}`} className="rounded-xl border bg-surface px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
        <select value={flagCode} onChange={(event) => setFlagCode(event.target.value)} className="rounded-xl border bg-surface px-3 py-2.5 text-sm font-bold outline-none focus:border-brand">
          {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs font-bold text-muted"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="size-4 accent-[var(--brand)]" /> Listar publicamente</label>
        <input value={reason} minLength={3} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatório" aria-label={`Motivo para ajustar ${pool.poolName}`} className="rounded-xl border bg-surface px-3 py-2.5 text-sm font-bold outline-none placeholder:text-muted focus:border-brand" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(Boolean(pool.archivedAt))} className="interactive flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white shadow-sm disabled:opacity-40">{busy ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />} Salvar</button>
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(!pool.archivedAt)} className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-danger-fg hover:border-danger-line hover:bg-danger-bg disabled:opacity-40">{pool.archivedAt ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />} {pool.archivedAt ? "Recuperar" : "Arquivar"}</button>
        <button type="button" disabled={busy} onClick={loadMembers} className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-brand hover:border-brand/70 hover:bg-surface-muted disabled:opacity-40"><Users className="size-3" /> Participantes</button>
      </div>
      {members && (
        <div className="mt-3 divide-y rounded-xl border bg-surface">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs font-bold">{member.display_name} · {member.role}</span>
              {member.role !== "owner" && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => removeMember(member.user_id)} className="interactive rounded-lg px-2 py-1 text-[10px] font-black text-danger-fg hover:bg-danger-bg disabled:opacity-40">Remover</button>}
            </div>
          ))}
        </div>
      )}
      {error && <p aria-live="polite" className="mt-2 rounded-xl bg-danger-bg px-3 py-2 text-xs font-bold text-danger-fg">{error}</p>}
    </article>
  );
}

function MasterUserCard({
  user,
  report,
}: {
  user: MasterUser;
  report?: AdminUserReport;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.displayName);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  async function update(disabled: boolean) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("master_update_user", {
      p_user_id: user.userId,
      p_display_name: name,
      p_disabled: disabled,
      p_reason: reason,
    });
    if (rpcError) {
      setError(friendlyServerError(rpcError, "Não foi possível atualizar este usuário."));
      navigator.vibrate?.([25, 30, 25]);
    } else {
      navigator.vibrate?.(25);
      router.refresh();
    }
    setBusy(false);
  }

  async function updateAdminAccess() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || busy || user.isMasterAdmin || reason.trim().length < 3) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("admin_update_user_access", {
      p_user_id: user.userId,
      p_is_admin: !user.isAdmin,
      p_reason: reason,
    });
    if (rpcError) setError(friendlyServerError(rpcError, "Não foi possível alterar o acesso administrativo."));
    else {
      navigator.vibrate?.(25);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <article
      data-testid="master-user-card"
      className={`rounded-2xl border bg-surface-muted/80 p-4 shadow-sm ${showReport ? "lg:col-span-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate font-black">{user.displayName}</p><p className="mt-1 truncate text-xs text-muted">{user.email} · {user.poolsOwned} bolões</p></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${user.isMasterAdmin ? "bg-accent text-brand-strong" : user.disabledAt ? "bg-red-100 text-red-800" : user.isAdmin ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-brand"}`}>{user.isMasterAdmin ? "Master principal" : user.disabledAt ? "Suspenso" : user.isAdmin ? "Admin" : "Ativo"}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-muted">
        <span>{user.termsAcceptedAt ? "Termos aceitos" : "Termos pendentes"}</span>
        {report?.identity.lastSignInAt && <span>Último login {formatDateTime(report.identity.lastSignInAt)}</span>}
        {report && <span>{report.stats.matchPredictions} palpites · {report.stats.poolMemberships} bolões</span>}
      </div>
      <div className="mt-4 grid gap-2">
        <input value={name} minLength={2} maxLength={60} onChange={(event) => setName(event.target.value)} aria-label={`Nome de ${user.displayName}`} className="rounded-xl border bg-surface px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
        <input value={reason} minLength={3} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatório" aria-label={`Motivo para ajustar ${user.displayName}`} className="rounded-xl border bg-surface px-3 py-2.5 text-sm font-bold outline-none placeholder:text-muted focus:border-brand" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" data-testid="master-user-report-toggle" onClick={() => setShowReport((current) => !current)} className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-brand hover:border-brand/70 hover:bg-surface-muted"><Gauge className="size-3" /> {showReport ? "Fechar relatório" : "Relatório"}</button>
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(Boolean(user.disabledAt))} className="interactive flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white shadow-sm disabled:opacity-40">{busy ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />} Salvar nome</button>
        {!user.isMasterAdmin && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(!user.disabledAt)} className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-danger-fg hover:border-danger-line hover:bg-danger-bg disabled:opacity-40"><UserRoundCog className="size-3" /> {user.disabledAt ? "Reativar conta" : "Suspender conta"}</button>}
        {!user.isMasterAdmin && <button type="button" disabled={busy || Boolean(user.disabledAt) || reason.trim().length < 3} onClick={updateAdminAccess} className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-info-fg hover:border-info-line hover:bg-info-bg disabled:opacity-40"><ShieldPlus className="size-3" /> {user.isAdmin ? "Remover admin" : "Promover admin"}</button>}
      </div>
      {showReport && <UserReportPanel report={report} user={user} />}
      {error && <p aria-live="polite" className="mt-2 rounded-xl bg-danger-bg px-3 py-2 text-xs font-bold text-danger-fg">{error}</p>}
    </article>
  );
}

function UserReportPanel({
  report,
  user,
}: {
  report?: AdminUserReport;
  user: MasterUser;
}) {
  if (!report) {
    return (
      <div className="mt-4 rounded-2xl border bg-surface px-4 py-3">
        <div className="flex items-start gap-2">
          <CircleAlert className="mt-0.5 size-4 text-amber-700" />
          <div>
            <p className="text-sm font-black">Relatório limitado</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {user.email} está visível, mas dados de Auth, auditoria completa e
              histórico global exigem service role server-side.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const accountSignals = [
    {
      label: "Conta",
      value: user.disabledAt ? "Suspensa" : "Ativa",
      detail: user.disabledAt
        ? `Suspensa em ${formatDateTime(user.disabledAt)}`
        : "Acesso liberado",
      tone: user.disabledAt ? "danger" : "ok",
    },
    {
      label: "Termos",
      value: user.termsAcceptedAt ? "Aceitos" : "Pendente",
      detail: user.termsAcceptedAt
        ? formatDateTime(user.termsAcceptedAt)
        : "Precisa aceitar para jogar",
      tone: user.termsAcceptedAt ? "ok" : "warn",
    },
    {
      label: "Acesso",
      value: user.isMasterAdmin ? "Master" : user.isAdmin ? "Admin" : "Jogador",
      detail: user.isMasterAdmin
        ? "Administrador principal"
        : user.isAdmin
          ? "Pode operar o painel"
          : "Sem permissão administrativa",
      tone: user.isMasterAdmin || user.isAdmin ? "warn" : "neutral",
    },
    {
      label: "Login",
      value: report.identity.lastSignInAt ? "Registrado" : "Sem registro",
      detail: formatDateTime(report.identity.lastSignInAt),
      tone: report.identity.lastSignInAt ? "ok" : "warn",
    },
  ] as const;
  const stats = [
    ["Palpites", report.stats.matchPredictions, `${report.stats.changedPredictions} alterações`],
    ["Pontos", report.stats.totalPoints, `${report.stats.exactScores} exatos`],
    ["Especiais", report.stats.specialPicks, `${report.specialMarkets.length} mercados`],
    ["Eventos", report.stats.activityEvents, `${report.stats.matchPredictionChanges + report.stats.specialPredictionChanges} mudanças`],
    ["Auditoria", report.stats.adminActionsAsActor + report.stats.adminActionsAsTarget, `${report.stats.resultChanges} placares`],
  ] as const;
  const predictionHistory = [
    ...report.predictionChanges.map((change) => ({
      id: `match-${change.id}`,
      kind: "Jogo",
      title: change.matchLabel,
      action: change.action,
      previous: predictionJsonScore(change.previousPrediction),
      next: predictionJsonScore(change.newPrediction),
      createdAt: change.createdAt,
    })),
    ...report.specialPredictionChanges.map((change) => ({
      id: `special-${change.id}`,
      kind: "Especial",
      title: change.marketTitle,
      action: change.action,
      previous: optionsSummary(change.previousOptions),
      next: optionsSummary(change.newOptions),
      createdAt: change.createdAt,
    })),
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const changedPredictionRate =
    report.stats.matchPredictions > 0
      ? report.stats.changedPredictions / report.stats.matchPredictions
      : 0;
  const riskSignals = [
    user.disabledAt
      ? {
          id: "disabled",
          title: "Conta suspensa",
          detail: `Acesso bloqueado desde ${formatDateTime(user.disabledAt)}.`,
          tone: "danger",
        }
      : null,
    !user.termsAcceptedAt
      ? {
          id: "terms",
          title: "Termos pendentes",
          detail: "Usuário precisa aceitar os termos para participar normalmente.",
          tone: "warn",
        }
      : null,
    !report.identity.lastSignInAt
      ? {
          id: "login",
          title: "Sem login registrado",
          detail: "Auth ainda não retornou último acesso para esta conta.",
          tone: "warn",
        }
      : null,
    report.stats.poolMemberships === 0
      ? {
          id: "pools",
          title: "Fora dos bolões",
          detail: "Não há vínculo ativo de bolão para acompanhar ranking.",
          tone: "warn",
        }
      : null,
    report.stats.matchPredictions === 0
      ? {
          id: "predictions",
          title: "Sem palpites",
          detail: "Nenhum palpite de jogo aparece no relatório.",
          tone: "warn",
        }
      : null,
    changedPredictionRate >= 0.35 && report.stats.changedPredictions >= 3
      ? {
          id: "changes",
          title: "Muitas alterações",
          detail: `${report.stats.changedPredictions} alterações em ${report.stats.matchPredictions} palpites.`,
          tone: "warn",
        }
      : null,
    report.stats.adminActionsAsTarget > 0
      ? {
          id: "admin-target",
          title: "Ações administrativas",
          detail: `${report.stats.adminActionsAsTarget} ação(ões) administrativas sobre esta conta.`,
          tone: "neutral",
        }
      : null,
    report.stats.resultChanges > 0
      ? {
          id: "result-changes",
          title: "Operou placares",
          detail: `${report.stats.resultChanges} alteração(ões) de resultado atribuídas ao usuário.`,
          tone: "neutral",
        }
      : null,
  ].filter((signal): signal is UserRiskSignal => Boolean(signal));
  const operationalTimeline: UserTimelineEntry[] = [
    ...report.activity.map((event) => ({
      id: `activity-${event.id}`,
      source: "Atividade",
      title: activityEventLabel(event.eventType),
      detail: `${entityTypeLabel(event.entityType)} · ${shortId(event.entityId)}`,
      createdAt: event.createdAt,
      metadata: event.metadata,
      tone: "activity" as const,
    })),
    ...report.auditTrail.map((entry) => ({
      id: `audit-${entry.id}`,
      source: "Admin",
      title: auditActionLabel(entry.action),
      detail: `${entityTypeLabel(entry.entityType)} · ${shortId(entry.entityId)}`,
      createdAt: entry.createdAt,
      metadata: entry.metadata,
      tone: "admin" as const,
    })),
    ...predictionHistory.map((change) => ({
      id: `change-${change.id}`,
      source: change.kind,
      title: `${change.kind} ${historyActionLabel(change.action)}`,
      detail: `${change.title} · ${change.previous} -> ${change.next}`,
      createdAt: change.createdAt,
      metadata: {
        action: historyActionLabel(change.action),
        previous: change.previous,
        next: change.next,
      },
      tone: change.kind === "Especial" ? ("special" as const) : ("prediction" as const),
    })),
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  return (
    <div data-testid="master-user-report" className="mt-4 space-y-3 rounded-2xl border bg-surface p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <div className="rounded-2xl border bg-surface-muted/60 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Relatório completo</p>
              <h3 className="mt-1 truncate text-xl font-black">{user.displayName}</h3>
              <p className="mt-1 truncate text-xs font-bold text-muted">
                {report.identity.email}
              </p>
            </div>
            <span className="rounded-full border bg-surface px-2.5 py-1 text-[10px] font-black text-muted">
              ID {shortId(report.userId)}
            </span>
          </div>
          <p className="mt-3 break-all rounded-xl border bg-surface px-3 py-2 text-[11px] font-bold text-muted">
            {report.userId}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(report.identity.providers.length > 0 ? report.identity.providers : ["sem provedor"]).map((provider) => (
              <span key={provider} className="rounded-full border bg-surface px-2 py-1 text-[10px] font-black text-muted">
                {provider}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <AccessMoment label="Criado" value={report.identity.createdAt} />
            <AccessMoment label="Confirmado" value={report.identity.confirmedAt} />
            <AccessMoment label="Último login" value={report.identity.lastSignInAt} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {accountSignals.map((signal) => (
            <AccountSignal key={signal.label} {...signal} />
          ))}
        </div>
      </div>

      <div data-testid="master-user-risk-signals" className="rounded-2xl border bg-surface-muted/50 p-4">
        <div className="flex items-center gap-2">
          <CircleAlert className="size-4 text-amber-700" />
          <h3 className="text-sm font-black">Sinais de atenção</h3>
        </div>
        {riskSignals.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {riskSignals.map((signal) => (
              <AccountSignal
                key={signal.id}
                label={signal.title}
                value={riskToneLabel(signal.tone)}
                detail={signal.detail}
                tone={signal.tone}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-xl border bg-surface px-3 py-2">
            <ShieldCheck className="mt-0.5 size-4 text-brand" />
            <p className="text-xs font-bold text-muted">
              Nenhum bloqueio, pendência ou padrão incomum apareceu nos dados carregados.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_minmax(18rem,0.8fr)]">
        <div className="grid grid-cols-2 gap-2">
          {stats.map(([label, value, detail]) => (
            <div key={label} className="rounded-xl border bg-surface-muted/60 p-3">
              <p className="text-[11px] font-bold text-muted">{label}</p>
              <p className="mt-1 text-xl font-black">{formatNumber(value)}</p>
              <p className="mt-0.5 text-[11px] text-muted">{detail}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-surface-muted/60 p-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-brand" />
            <p className="text-xs font-black uppercase text-muted">Resumo operacional</p>
          </div>
          <div className="mt-3 grid gap-2 text-xs font-bold text-muted">
            <p>{formatNumber(report.stats.scoredPredictions)} palpites já pontuaram.</p>
            <p>{formatNumber(report.stats.correctResults)} acertos de resultado no histórico.</p>
            <p>{formatNumber(report.stats.adminActionsAsActor)} ações como operador.</p>
            <p>{formatNumber(report.stats.adminActionsAsTarget)} ações administrativas sobre esta conta.</p>
          </div>
        </div>
      </div>

      <ReportSection icon={History} title="Linha do tempo operacional">
        {operationalTimeline.length > 0 ? (
          <ProgressiveList
            initialCount={8}
            step={8}
            moreLabel="Ver mais eventos"
            className="divide-y rounded-xl border"
          >
            {operationalTimeline.map((event) => {
              const summary = metadataSummary(event.metadata);
              return (
                <details key={event.id} className="group bg-surface">
                  <summary className="grid cursor-pointer list-none gap-2 px-3 py-3 transition-colors hover:bg-surface-muted/70 md:grid-cols-[8rem_minmax(0,1fr)_9rem] md:items-center [&::-webkit-details-marker]:hidden">
                    <span className={`w-fit rounded-full border px-2 py-1 text-[10px] font-black ${timelineToneClass(event.tone)}`}>
                      {event.source}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black">{event.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {event.detail}
                        {summary ? ` · ${summary}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-muted md:justify-end">
                      <span>{formatDateTime(event.createdAt)}</span>
                      <ChevronRight className="size-4 shrink-0 text-brand transition-transform group-open:rotate-90" />
                    </div>
                  </summary>
                  <pre className="mx-3 mb-3 max-h-64 overflow-auto rounded-xl border bg-surface-muted/50 p-3 text-[11px] leading-5 text-muted">
                    {metadataDetails(event.metadata)}
                  </pre>
                </details>
              );
            })}
          </ProgressiveList>
        ) : (
          <EmptyReportLine>Eventos de atividade, auditoria e mudanças passam a aparecer aqui.</EmptyReportLine>
        )}
      </ReportSection>

      <ReportSection icon={Archive} title="Bolões">
        {report.pools.length > 0 ? (
          <ProgressiveList
            initialCount={6}
            step={6}
            moreLabel="Ver mais bolões"
            className="grid gap-2 md:grid-cols-2"
          >
            {report.pools.map((pool) => (
              <div key={`${pool.poolId}-${pool.role}`} className="rounded-xl border bg-surface-muted/45 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-black">{pool.poolName}</p>
                  <span className="text-[10px] font-black text-muted">{roleLabel(pool.role)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {pool.isPublic ? "Público" : "Privado"} · entrou {formatDateTime(pool.joinedAt)}
                </p>
                <p className="mt-1 text-[10px] font-bold text-muted">
                  Elegível desde {formatDateTime(pool.eligibleFrom)}
                  {pool.archivedAt ? ` · arquivado ${formatDateTime(pool.archivedAt)}` : ""}
                </p>
              </div>
            ))}
          </ProgressiveList>
        ) : (
          <EmptyReportLine>Sem vínculo de bolão registrado.</EmptyReportLine>
        )}
      </ReportSection>

      <ReportSection icon={Gauge} title="Palpites recentes">
        {report.recentPredictions.length > 0 ? (
          <ProgressiveList
            initialCount={6}
            step={6}
            moreLabel="Ver mais palpites"
            className="divide-y rounded-xl border"
          >
            {report.recentPredictions.map((prediction) => (
              <div key={`${prediction.matchId}-${prediction.updatedAt}`} className="grid gap-2 px-3 py-2 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{prediction.matchLabel}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {prediction.stageLabel} · {scoreText(prediction.prediction)}
                    {prediction.result ? ` · resultado ${scoreText(prediction.result)}` : ""}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-muted">
                    Enviado {formatDateTime(prediction.submittedAt)} · atualizado {formatDateTime(prediction.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  {prediction.changed && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">alterado</span>}
                  {prediction.points !== null && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-brand">{prediction.points} pts</span>}
                  {prediction.category && <span className="rounded-full border px-2 py-1 text-[10px] font-black text-muted">{scoreCategoryLabel(prediction.category)}</span>}
                </div>
              </div>
            ))}
          </ProgressiveList>
        ) : (
          <EmptyReportLine>Nenhum palpite de jogo encontrado.</EmptyReportLine>
        )}
      </ReportSection>

      <ReportSection icon={History} title="Histórico de alterações">
        {predictionHistory.length > 0 ? (
          <ProgressiveList
            initialCount={6}
            step={6}
            moreLabel="Ver mais alterações"
            className="divide-y rounded-xl border"
          >
            {predictionHistory.map((change) => (
              <div key={change.id} className="grid gap-2 px-3 py-2 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border bg-surface px-2 py-0.5 text-[10px] font-black text-muted">
                      {change.kind}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                      {historyActionLabel(change.action)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-black">{change.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">
                    {change.previous} → {change.next}
                  </p>
                </div>
                <p className="text-[10px] font-bold text-muted md:text-right">
                  {formatDateTime(change.createdAt)}
                </p>
              </div>
            ))}
          </ProgressiveList>
        ) : (
          <EmptyReportLine>Alterações novas passam a aparecer aqui a partir desta rodada.</EmptyReportLine>
        )}
      </ReportSection>

      <div className="grid gap-3 xl:grid-cols-2">
        <ReportSection icon={Sparkles} title="Especiais">
          {report.specialMarkets.length > 0 ? (
            <ProgressiveList
              initialCount={6}
              step={6}
              moreLabel="Ver mais especiais"
              className="space-y-2"
            >
              {report.specialMarkets.map((market) => (
                <div key={`${market.marketKey}-${market.updatedAt}`} className="rounded-xl border bg-surface-muted/45 px-3 py-2">
                  <p className="text-xs font-black">{market.marketTitle}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted">{market.picks.join(", ")}</p>
                  <p className="mt-1 text-[10px] font-bold text-muted">
                    Atualizado {formatDateTime(market.updatedAt)}
                  </p>
                </div>
              ))}
            </ProgressiveList>
          ) : (
            <EmptyReportLine>Sem especiais preenchidos.</EmptyReportLine>
          )}
        </ReportSection>

        <ReportSection icon={ShieldAlert} title="Auditoria">
          {report.auditTrail.length > 0 ? (
            <ProgressiveList
              initialCount={6}
              step={6}
              moreLabel="Ver mais auditoria"
              className="divide-y rounded-xl border"
            >
              {report.auditTrail.map((entry) => {
                const summary = metadataSummary(entry.metadata);
                return (
                  <div key={entry.id} className="px-3 py-2">
                    <p className="text-xs font-black">{auditActionLabel(entry.action)}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {entry.entityType} · {formatDateTime(entry.createdAt)}
                    </p>
                    {summary ? (
                      <p className="mt-0.5 line-clamp-2 text-[10px] font-bold text-muted">
                        {summary}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </ProgressiveList>
          ) : (
            <EmptyReportLine>Sem ações administrativas vinculadas.</EmptyReportLine>
          )}
        </ReportSection>

        <ReportSection icon={Activity} title="Atividade recente">
          {report.activity.length > 0 ? (
            <ProgressiveList
              initialCount={6}
              step={6}
              moreLabel="Ver mais atividade"
              className="divide-y rounded-xl border"
            >
              {report.activity.map((event) => {
                const summary = metadataSummary(event.metadata);
                return (
                  <div key={event.id} className="px-3 py-2">
                    <p className="text-xs font-black">{activityEventLabel(event.eventType)}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {event.entityType} · {formatDateTime(event.createdAt)}
                    </p>
                    {summary ? (
                      <p className="mt-0.5 line-clamp-2 text-[10px] font-bold text-muted">
                        {summary}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </ProgressiveList>
          ) : (
            <EmptyReportLine>Eventos do usuário passam a aparecer aqui daqui em diante.</EmptyReportLine>
          )}
        </ReportSection>
      </div>
    </div>
  );
}

function ReportSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Gauge;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-brand" />
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function EmptyReportLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border bg-surface-muted/45 px-3 py-2 text-xs text-muted">
      {children}
    </p>
  );
}

function riskToneLabel(tone: UserRiskSignal["tone"]) {
  return (
    {
      ok: "OK",
      warn: "Atenção",
      danger: "Crítico",
      neutral: "Info",
    }[tone] ?? "Info"
  );
}

function timelineToneClass(tone: UserTimelineEntry["tone"]) {
  return (
    {
      admin: "border-brand/25 bg-brand/10 text-brand",
      activity: "border-sky-200 bg-sky-50 text-sky-700",
      prediction: "border-emerald-200 bg-emerald-50 text-emerald-700",
      special: "border-amber-200 bg-amber-50 text-amber-700",
    }[tone] ?? "border-slate-200 bg-slate-50 text-slate-700"
  );
}

function AccountSignal({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "danger"
      ? "status-danger"
      : tone === "warn"
        ? "status-warning"
        : tone === "ok"
          ? "status-success"
          : "bg-surface-muted";

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-muted">{detail}</p>
    </div>
  );
}

function AccessMoment({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border bg-surface px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 text-xs font-black">{formatDateTime(value)}</p>
    </div>
  );
}

function AuditList({
  entries,
  filters,
}: {
  entries: MasterOverview["audit"];
  filters: MasterOverview["auditFilters"];
}) {
  const formatted = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        date: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt)),
        summary: metadataSummary(entry.metadata),
        details: metadataDetails(entry.metadata),
      })),
    [entries],
  );
  const hasActiveFilters = filters.source !== "all" || filters.period !== "7d" || Boolean(filters.query);

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border bg-surface">
      {formatted.map((entry) => {
        const actor = entry.actorId
          ? `Admin ${shortId(entry.actorId)}`
          : entry.userId
            ? `Usuário ${shortId(entry.userId)}`
            : "Sistema";
        return (
          <details key={entry.id} className="group border-b last:border-b-0">
            <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 transition-colors hover:bg-surface-muted/65 md:grid-cols-[8rem_minmax(0,1fr)_12rem] md:items-center [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-muted md:block">
                <ChevronRight className="size-4 shrink-0 text-brand transition-transform group-open:rotate-90 md:hidden" />
                <span>{entry.date}</span>
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${auditSourceTone(entry.source)}`}>
                    {auditSourceLabel(entry.source)}
                  </span>
                  <span className="min-w-0 truncate text-sm font-black text-brand">{entry.title || auditActionLabel(entry.action)}</span>
                </div>
                <p className="mt-1 min-w-0 truncate text-xs text-muted">
                  {entityTypeLabel(entry.entityType)} · {shortId(entry.entityId)}
                  {entry.summary ? ` · ${entry.summary}` : ""}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted md:justify-end">
                <span className="truncate">{actor}</span>
                <ChevronRight className="hidden size-4 shrink-0 text-brand transition-transform group-open:rotate-90 md:block" />
              </div>
            </summary>
            <div className="border-t bg-surface-muted/45 px-4 py-4">
              <div className="grid gap-2 md:grid-cols-4">
                <AuditDetail label="Origem" value={auditSourceLabel(entry.source)} />
                <AuditDetail label="Ator" value={actor} />
                <AuditDetail label="Entidade" value={`${entityTypeLabel(entry.entityType)} · ${shortId(entry.entityId)}`} />
                <AuditDetail label="Registro" value={`#${entry.numericId}`} />
              </div>
              <pre className="mt-3 max-h-72 overflow-auto rounded-xl border bg-surface p-3 text-[11px] leading-5 text-muted">
                {entry.details}
              </pre>
            </div>
          </details>
        );
      })}
      {entries.length === 0 && (
        <p className="p-5 text-sm text-muted">
          {hasActiveFilters
            ? "Nenhum evento encontrado com esses filtros."
            : "Nenhuma ação administrativa registrada."}
        </p>
      )}
    </div>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-surface px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 truncate text-xs font-black">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "sem registro";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function auditSourceLabel(source: AuditSource) {
  return (
    {
      all: "Todas",
      admin: "Admin",
      activity: "Usuários",
      predictions: "Palpites",
      specials: "Especiais",
    }[source] ?? source
  );
}

function auditSourceTone(source: AuditSource) {
  return (
    {
      all: "border-slate-200 bg-slate-50 text-slate-700",
      admin: "border-brand/25 bg-brand/10 text-brand",
      activity: "border-sky-200 bg-sky-50 text-sky-700",
      predictions: "border-emerald-200 bg-emerald-50 text-emerald-700",
      specials: "border-amber-200 bg-amber-50 text-amber-700",
    }[source] ?? "border-slate-200 bg-slate-50 text-slate-700"
  );
}

function entityTypeLabel(entityType: string) {
  return (
    {
      match: "Jogo",
      user: "Usuário",
      pool: "Bolão",
      pool_member: "Participante",
      special_market: "Especial",
      admin_alert: "Alerta",
      terms: "Termos",
      route: "Tela",
    }[entityType] ?? entityType
  );
}

function metadataSummary(metadata: Record<string, unknown>) {
  const preferredKeys = [
    "reason",
    "source",
    "old_name",
    "new_name",
    "old_display_name",
    "new_display_name",
    "pool_name",
    "target_user_id",
    "match_id",
    "previous",
    "next",
  ];
  const parts = preferredKeys
    .map((key) => metadataPart(key, metadata[key]))
    .filter((part): part is string => Boolean(part))
    .slice(0, 3);

  if (parts.length > 0) return parts.join(" · ");

  return Object.entries(metadata)
    .map(([key, value]) => metadataPart(key, value))
    .filter((part): part is string => Boolean(part))
    .slice(0, 3)
    .join(" · ");
}

function metadataDetails(metadata: Record<string, unknown>) {
  if (Object.keys(metadata).length === 0) return "Sem detalhes adicionais.";
  return JSON.stringify(metadata, null, 2);
}

function metadataPart(key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return null;
  return `${metadataLabel(key)}: ${String(value)}`;
}

function metadataLabel(key: string) {
  return (
    {
      reason: "motivo",
      source: "fonte",
      method: "entrada",
      next_path: "destino",
      match_number: "jogo",
      market_title: "especial",
      old_name: "nome anterior",
      new_name: "novo nome",
      old_display_name: "nome anterior",
      new_display_name: "novo nome",
      pool_name: "bolão",
      target_user_id: "usuário",
      match_id: "jogo",
      previous: "anterior",
      next: "novo",
    }[key] ?? key
  );
}

function predictionJsonScore(value: Record<string, unknown> | null) {
  if (!value) return "primeiro envio";
  const home = value.home_score ?? value.homeScore;
  const away = value.away_score ?? value.awayScore;
  if (typeof home === "number" && typeof away === "number") {
    const advancingTeam = value.advancing_team_id ?? value.advancingTeamId;
    return advancingTeam ? `${home} x ${away} · classificado ${shortId(String(advancingTeam))}` : `${home} x ${away}`;
  }
  return "palpite registrado";
}

function optionsSummary(options: unknown[]) {
  if (options.length === 0) return "primeiro envio";
  const labels = options
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const label = (option as { label?: unknown }).label;
      return typeof label === "string" ? label : null;
    })
    .filter((label): label is string => Boolean(label));
  return labels.length > 0 ? labels.join(", ") : `${options.length} opção(ões)`;
}

function scoreText(prediction: { homeScore: number; awayScore: number }) {
  return `${prediction.homeScore} x ${prediction.awayScore}`;
}

function roleLabel(role: string) {
  return (
    {
      owner: "dono",
      admin: "admin",
      member: "membro",
    }[role] ?? role
  );
}

function scoreCategoryLabel(category: string) {
  return (
    {
      exact: "exato",
      refined: "refinado",
      result: "resultado",
      "one-score": "um placar",
      miss: "erro",
    }[category] ?? category
  );
}

function historyActionLabel(action: string) {
  return action === "created" ? "criado" : action === "updated" ? "alterado" : action;
}

function activityEventLabel(eventType: string) {
  return (
    {
      login_completed: "Login concluído",
      terms_accepted: "Termos aceitos",
      match_prediction_created: "Palpite criado",
      match_prediction_updated: "Palpite alterado",
      special_prediction_created: "Especial criado",
      special_prediction_updated: "Especial alterado",
      pool_created: "Bolão criado",
      pool_joined: "Entrou no bolão",
      admin_alert_dismissed: "Alerta dispensado",
    }[eventType] ?? eventType
  );
}

function auditActionLabel(action: string) {
  return (
    {
      finalize_match: "Resultado finalizado",
      update_match_result: "Resultado corrigido",
      assign_match_teams: "Mata-mata definido",
      update_user: "Usuário alterado",
      disable_user: "Conta suspensa",
      restore_user: "Conta reativada",
      promote_admin: "Admin promovido",
      remove_admin: "Admin removido",
      update_pool: "Bolão alterado",
      archive_pool: "Bolão arquivado",
      restore_pool: "Bolão recuperado",
      remove_pool_member: "Membro removido",
      set_terms_enforcement: "Termos alterados",
      resolve_special_market: "Especial resolvido",
      create_admin_alert: "Alerta criado",
    }[action] ?? action
  );
}
