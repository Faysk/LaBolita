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
  Mail,
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
  MasterOverview,
  MasterPool,
  MasterUser,
} from "@/lib/data/admin";
import { CountryFlag } from "@/components/country-flag";
import { COUNTRIES } from "@/lib/countries";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";

export function MasterAdminConsole({ overview }: { overview: MasterOverview }) {
  const router = useRouter();
  const tab = overview.activeTab;
  const [search, setSearch] = useState(overview.search);
  const [pendingTab, setPendingTab] = useState<typeof tab | null>(null);
  const [isPending, startTransition] = useTransition();
  const isNavigating = isPending || pendingTab !== null;
  const pendingLabel =
    pendingTab === "users" ? "usuários" : pendingTab === "audit" ? "auditoria" : "bolões";

  if (!overview.isGlobalAdmin) return null;

  function navigate(nextTab: typeof tab, nextPage = 1, nextSearch = "") {
    const normalizedSearch = nextSearch.trim();
    if (
      nextTab === tab &&
      nextPage === overview.page &&
      normalizedSearch === overview.search.trim()
    ) {
      return;
    }
    const params = new URLSearchParams();
    params.set("master_tab", nextTab);
    if (normalizedSearch) params.set("master_search", normalizedSearch);
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
            {tab === "audit" && <AuditList entries={overview.audit} />}
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
      detail: `${summary.audit.resultChanges} placares · ${summary.audit.userActions} usuários`,
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
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.audit.topActions.map((action) => (
            <span
              key={action.action}
              className="rounded-full border bg-surface px-3 py-1.5 text-xs font-bold text-muted"
            >
              {auditActionLabel(action.action)} · {action.count}
            </span>
          ))}
        </div>
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
    <article className="rounded-2xl border bg-surface-muted/80 p-4 shadow-sm">
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
        <button type="button" onClick={() => setShowReport((current) => !current)} className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-brand hover:border-brand/70 hover:bg-surface-muted"><Gauge className="size-3" /> {showReport ? "Fechar relatório" : "Relatório"}</button>
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(Boolean(user.disabledAt))} className="interactive flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white shadow-sm disabled:opacity-40">{busy ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />} Salvar nome</button>
        {!user.isMasterAdmin && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(!user.disabledAt)} className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-danger-fg hover:border-danger-line hover:bg-danger-bg disabled:opacity-40"><UserRoundCog className="size-3" /> {user.disabledAt ? "Reativar conta" : "Suspender conta"}</button>}
        {!user.isMasterAdmin && <button type="button" disabled={busy || Boolean(user.disabledAt) || reason.trim().length < 3} onClick={updateAdminAccess} className="interactive flex items-center gap-1 rounded-xl border bg-surface px-3 py-2 text-xs font-black text-info-fg hover:border-info-line hover:bg-info-bg disabled:opacity-40"><ShieldPlus className="size-3" /> {user.isAdmin ? "Remover admin" : "Promover admin"}</button>}
      </div>
      {showReport && <UserReportPanel report={report} fallbackEmail={user.email} />}
      {error && <p aria-live="polite" className="mt-2 rounded-xl bg-danger-bg px-3 py-2 text-xs font-bold text-danger-fg">{error}</p>}
    </article>
  );
}

function UserReportPanel({
  report,
  fallbackEmail,
}: {
  report?: AdminUserReport;
  fallbackEmail: string;
}) {
  if (!report) {
    return (
      <div className="mt-4 rounded-2xl border bg-surface px-4 py-3">
        <div className="flex items-start gap-2">
          <CircleAlert className="mt-0.5 size-4 text-amber-700" />
          <div>
            <p className="text-sm font-black">Relatório limitado</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {fallbackEmail} está visível, mas dados de Auth, auditoria completa e
              histórico global exigem service role server-side.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    ["Palpites", report.stats.matchPredictions, `${report.stats.changedPredictions} alterações`],
    ["Pontos", report.stats.totalPoints, `${report.stats.exactScores} exatos`],
    ["Especiais", report.stats.specialPicks, `${report.specialMarkets.length} mercados`],
    ["Auditoria", report.stats.adminActionsAsActor + report.stats.adminActionsAsTarget, `${report.stats.resultChanges} placares`],
  ] as const;

  return (
    <div className="mt-4 space-y-3 rounded-2xl border bg-surface p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-surface-muted/60 p-3">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-brand" />
            <p className="text-xs font-black uppercase text-muted">Identidade</p>
          </div>
          <p className="mt-2 truncate text-sm font-black">{report.identity.email}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Criado {formatDateTime(report.identity.createdAt)} · Login {formatDateTime(report.identity.lastSignInAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(report.identity.providers.length > 0 ? report.identity.providers : ["sem provedor"]).map((provider) => (
              <span key={provider} className="rounded-full border bg-surface px-2 py-1 text-[10px] font-black text-muted">
                {provider}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {stats.map(([label, value, detail]) => (
            <div key={label} className="rounded-xl border bg-surface-muted/60 p-3">
              <p className="text-[11px] font-bold text-muted">{label}</p>
              <p className="mt-1 text-xl font-black">{formatNumber(value)}</p>
              <p className="mt-0.5 text-[11px] text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      <ReportSection icon={Archive} title="Bolões">
        {report.pools.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {report.pools.map((pool) => (
              <div key={`${pool.poolId}-${pool.role}`} className="rounded-xl border bg-surface-muted/45 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-black">{pool.poolName}</p>
                  <span className="text-[10px] font-black text-muted">{roleLabel(pool.role)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {pool.isPublic ? "Público" : "Privado"} · entrou {formatDateTime(pool.joinedAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyReportLine>Sem vínculo de bolão registrado.</EmptyReportLine>
        )}
      </ReportSection>

      <ReportSection icon={Gauge} title="Palpites recentes">
        {report.recentPredictions.length > 0 ? (
          <div className="divide-y rounded-xl border">
            {report.recentPredictions.map((prediction) => (
              <div key={`${prediction.matchId}-${prediction.updatedAt}`} className="grid gap-2 px-3 py-2 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{prediction.matchLabel}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {prediction.stageLabel} · {scoreText(prediction.prediction)}
                    {prediction.result ? ` · resultado ${scoreText(prediction.result)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  {prediction.changed && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">alterado</span>}
                  {prediction.points !== null && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-brand">{prediction.points} pts</span>}
                  {prediction.category && <span className="rounded-full border px-2 py-1 text-[10px] font-black text-muted">{scoreCategoryLabel(prediction.category)}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyReportLine>Nenhum palpite de jogo encontrado.</EmptyReportLine>
        )}
      </ReportSection>

      <div className="grid gap-3 xl:grid-cols-2">
        <ReportSection icon={Sparkles} title="Especiais">
          {report.specialMarkets.length > 0 ? (
            <div className="space-y-2">
              {report.specialMarkets.map((market) => (
                <div key={`${market.marketKey}-${market.updatedAt}`} className="rounded-xl border bg-surface-muted/45 px-3 py-2">
                  <p className="text-xs font-black">{market.marketTitle}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted">{market.picks.join(", ")}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyReportLine>Sem especiais preenchidos.</EmptyReportLine>
          )}
        </ReportSection>

        <ReportSection icon={ShieldAlert} title="Auditoria">
          {report.auditTrail.length > 0 ? (
            <div className="divide-y rounded-xl border">
              {report.auditTrail.map((entry) => (
                <div key={entry.id} className="px-3 py-2">
                  <p className="text-xs font-black">{auditActionLabel(entry.action)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {entry.entityType} · {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyReportLine>Sem ações administrativas vinculadas.</EmptyReportLine>
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

function AuditList({ entries }: { entries: MasterOverview["audit"] }) {
  const formatted = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        date: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt)),
      })),
    [entries],
  );

  return (
    <div className="mt-5 divide-y rounded-2xl border">
      {formatted.map((entry) => (
        <div key={entry.id} className="grid gap-1 px-4 py-3 md:grid-cols-[10rem_10rem_1fr] md:items-center">
          <span className="text-xs font-bold text-muted">{entry.date}</span>
          <span className="text-sm font-black text-brand">{entry.action}</span>
          <span className="truncate text-xs text-muted">{entry.entityType} · {entry.entityId}</span>
        </div>
      ))}
      {entries.length === 0 && <p className="p-5 text-sm text-muted">Nenhuma ação administrativa registrada.</p>}
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
    }[action] ?? action
  );
}
