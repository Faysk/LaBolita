import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";
import { AdminMatchQueue } from "@/components/admin-match-queue";
import { MasterAdminConsole } from "@/components/master-admin-console";
import { SpecialAdminPanel } from "@/components/special-admin-panel";
import { requireAdmin } from "@/lib/auth";
import { getMasterOverview } from "@/lib/data/admin";
import type { MasterTab } from "@/lib/data/admin";
import { getMatches, getResultsSyncState, getTeams } from "@/lib/data/matches";
import { getSpecialMarketsOverview } from "@/lib/data/specials";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ master_tab?: string; master_search?: string; master_page?: string }>;
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

      <MasterAdminConsole
        key={`${masterOverview.activeTab}-${masterOverview.page}-${masterOverview.search}`}
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
