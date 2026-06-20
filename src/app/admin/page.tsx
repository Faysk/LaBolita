import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Database,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AdminMatchQueue } from "@/components/admin-match-queue";
import { MasterAdminConsole } from "@/components/master-admin-console";
import { SpecialAdminPanel } from "@/components/special-admin-panel";
import { requireAdmin } from "@/lib/auth";
import { getMasterOverview } from "@/lib/data/admin";
import type { MasterTab } from "@/lib/data/admin";
import { getMatches, getResultsSyncState, getTeams } from "@/lib/data/matches";
import { getSpecialMarketsOverview, type SpecialMarketsOverview } from "@/lib/data/specials";
import {
  SPECIAL_LOCK_DATE_LABEL,
  specialProgress,
} from "@/lib/special-market-display";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import type { DemoMatch } from "@/lib/types";

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    master_tab?: string;
    master_search?: string;
    master_page?: string;
    master_audit_source?: string;
    master_audit_period?: string;
    master_audit_query?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const masterTab: MasterTab =
    params.master_tab === "users" || params.master_tab === "audit"
      ? params.master_tab
      : "pools";
  const [matches, teams, resultsSyncState, masterOverview] = await Promise.all([
    getMatches(),
    getTeams(),
    getResultsSyncState(),
    getMasterOverview({
      activeTab: masterTab,
      search: params.master_search ?? "",
      page: Number(params.master_page ?? 1),
      auditSource: params.master_audit_source,
      auditPeriod: params.master_audit_period,
      auditQuery: params.master_audit_query ?? "",
    }),
  ]);
  const specialsOverview = await getSpecialMarketsOverview({
    matches,
    teams,
    includeAutomatic: true,
  });
  const databaseConfigured = hasSupabaseConfig();
  const resultsSyncConfigured = Boolean(
    process.env.RESULTS_FEED_URL &&
      process.env.CRON_SECRET &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const syncHealthy = resultsSyncConfigured && resultsSyncState?.status === "ok";
  const syncSummary = !resultsSyncConfigured
    ? "Resultados manuais"
    : resultsSyncState?.status === "error"
      ? "Falha na última tentativa"
      : resultsSyncState?.fallbackUsed
        ? "Contingência ESPN ativa"
        : resultsSyncState?.status === "ok"
          ? "Feed principal saudável"
          : "Aguardando primeira execução";

  return (
    <main className="page-container py-7 md:py-10">
      <div className="mb-8">
        <p className="eyebrow">Operação</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
          Painel administrativo
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Resultados finalizados aqui recalculam os rankings e deixam histórico
          de auditoria.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          [
            Database,
            "Banco de dados",
            databaseConfigured ? "Supabase conectado" : "Modo demonstração",
            databaseConfigured ? "text-brand bg-emerald-50" : "text-amber-700 bg-amber-50",
          ],
          [
            RefreshCw,
            "Sincronização",
            syncSummary,
            syncHealthy ? "text-brand bg-emerald-50" : "text-amber-700 bg-amber-50",
          ],
          [
            CheckCircle2,
            "Partidas carregadas",
            String(matches.length),
            "text-brand bg-emerald-50",
          ],
        ].map(([Icon, label, value, style]) => {
          const ItemIcon = Icon as typeof Database;
          return (
            <article key={label as string} className="card p-5">
              <span className={`inline-flex rounded-xl p-2 ${style as string}`}>
                <ItemIcon className="size-4" />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">
                {label as string}
              </p>
              <p className="mt-1 text-lg font-black">{value as string}</p>
            </article>
          );
        })}
      </section>

      <OperationalReadinessPanel
        matches={matches}
        specialsOverview={specialsOverview}
        syncSummary={syncSummary}
        syncHealthy={syncHealthy}
        resultsSyncConfigured={resultsSyncConfigured}
      />

      <MasterAdminConsole
        key={`${masterOverview.activeTab}-${masterOverview.page}-${masterOverview.search}-${masterOverview.auditFilters.source}-${masterOverview.auditFilters.period}-${masterOverview.auditFilters.query}`}
        overview={masterOverview}
      />

      <SpecialAdminPanel overview={specialsOverview} />

      <section className="card mt-7 overflow-hidden">
        <div className="flex items-center gap-3 border-b p-5 md:p-6">
          <AlertTriangle className="size-5 text-amber-600" />
          <div>
            <h2 className="font-black">Fila de resultados</h2>
            <p className="text-sm text-muted">
              Confirme o resultado antes de pontuar os bolões.
            </p>
          </div>
        </div>
        <AdminMatchQueue matches={matches} teams={teams} />
      </section>
    </main>
  );
}

function OperationalReadinessPanel({
  matches,
  specialsOverview,
  syncSummary,
  syncHealthy,
  resultsSyncConfigured,
}: {
  matches: DemoMatch[];
  specialsOverview: SpecialMarketsOverview;
  syncSummary: string;
  syncHealthy: boolean;
  resultsSyncConfigured: boolean;
}) {
  const liveCount = matches.filter(
    (match) => match.providerStatus === "live" && !match.result,
  ).length;
  const awaitingConfirmation = matches.filter(
    (match) => match.providerStatus === "finished" && !match.result,
  ).length;
  const divergences = matches.filter(
    (match) =>
      match.result &&
      match.liveResult &&
      (match.result.homeScore !== match.liveResult.homeScore ||
        match.result.awayScore !== match.liveResult.awayScore),
  ).length;
  const pendingKnockoutTeams = matches.filter(
    (match) =>
      match.stage !== "group" &&
      (!isUuid(match.homeTeam.id) || !isUuid(match.awayTeam.id)),
  ).length;
  const specialsProgress = specialsOverview.available
    ? specialProgress(specialsOverview.markets)
    : null;
  const hasAction =
    liveCount > 0 ||
    awaitingConfirmation > 0 ||
    divergences > 0 ||
    pendingKnockoutTeams > 0 ||
    Boolean(specialsProgress?.openPending.length);

  return (
    <section className="card mt-7 overflow-hidden">
      <div className="flex flex-col gap-3 border-b bg-surface-muted/70 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="eyebrow">Prontidão operacional</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {hasAction ? "Acompanhar agora" : "Operação em dia"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Sinais para priorizar confirmação de placares, divergências,
            participantes do mata-mata e prazo dos especiais.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${
            hasAction ? "status-warning" : "status-success"
          }`}
        >
          <ListChecks className="size-4" />
          {hasAction ? "Há pontos para revisar" : "Sem urgências visíveis"}
        </span>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        <ReadinessItem
          icon={Activity}
          label="Ao vivo"
          value={String(liveCount)}
          detail="Jogos em andamento sem resultado oficial"
          tone={liveCount > 0 ? "live" : "ok"}
        />
        <ReadinessItem
          icon={CalendarClock}
          label="Aguardam confirmação"
          value={String(awaitingConfirmation)}
          detail="Provedor marcou como finalizado"
          tone={awaitingConfirmation > 0 ? "warn" : "ok"}
        />
        <ReadinessItem
          icon={ShieldAlert}
          label="Divergências"
          value={String(divergences)}
          detail="Resultado salvo difere do provedor"
          tone={divergences > 0 ? "danger" : "ok"}
        />
        <ReadinessItem
          icon={ListChecks}
          label="Mata-mata"
          value={String(pendingKnockoutTeams)}
          detail="Partidas ainda sem participantes definidos"
          tone={pendingKnockoutTeams > 0 ? "warn" : "ok"}
        />
        <ReadinessItem
          icon={Sparkles}
          label="Especiais"
          value={
            specialsProgress
              ? `${specialsProgress.completed}/${specialsProgress.total}`
              : "—"
          }
          detail={
            specialsProgress
              ? `${specialsProgress.openPending.length} pendentes abertos até ${SPECIAL_LOCK_DATE_LABEL}`
              : specialsOverview.missingReason ?? "Mercados indisponíveis"
          }
          tone={specialsProgress?.openPending.length ? "warn" : "ok"}
        />
        <ReadinessItem
          icon={RefreshCw}
          label="Sincronização"
          value={resultsSyncConfigured ? syncSummary : "Manual"}
          detail={
            resultsSyncConfigured
              ? "Feed configurado para atualização"
              : "Resultados dependem do painel"
          }
          tone={syncHealthy || !resultsSyncConfigured ? "ok" : "warn"}
        />
      </div>
    </section>
  );
}

function ReadinessItem({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "live";
}) {
  const toneClass = {
    ok: "text-brand bg-emerald-50",
    warn: "text-amber-700 bg-amber-50",
    danger: "text-red-700 bg-red-50",
    live: "text-sky-700 bg-sky-50",
  }[tone];

  return (
    <article className="rounded-2xl border bg-surface p-4">
      <span className={`inline-flex rounded-xl p-2 ${toneClass}`}>
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-black">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
    </article>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
