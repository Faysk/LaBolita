import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";
import { AdminMatchQueue } from "@/components/admin-match-queue";
import { requireAdmin } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Administração",
};

export default async function AdminPage() {
  await requireAdmin();
  const matches = await getMatches();
  const databaseConfigured = hasSupabaseConfig();

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
          [RefreshCw, "Operação", "Resultados manuais", "text-brand bg-emerald-50"],
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
        <AdminMatchQueue matches={matches} />
      </section>
    </main>
  );
}
