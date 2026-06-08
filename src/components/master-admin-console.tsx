"use client";

import {
  Archive,
  History,
  LoaderCircle,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  MasterPoolCard,
  MasterUserCard,
} from "@/components/admin/master-entity-cards";
import type { MasterOverview } from "@/lib/data/admin";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";

export function MasterAdminConsole({ overview }: { overview: MasterOverview }) {
  if (!overview.isGlobalAdmin) return null;
  const tab = overview.activeTab;

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
      </div>
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            <TabLink active={tab === "pools"} href={adminHref(overview, "pools")} icon={Archive}>Bolões ({overview.poolTotal})</TabLink>
            <TabLink active={tab === "users"} href={adminHref(overview, "users")} icon={Users}>Usuários ({overview.userTotal})</TabLink>
            <TabLink active={tab === "audit"} href={adminHref(overview, "audit")} icon={History}>Auditoria</TabLink>
          </div>
          {tab !== "audit" && (
            <SearchForm overview={overview} tab={tab} />
          )}
        </div>

        {tab === "pools" && <><div className="mt-5 grid gap-4 lg:grid-cols-2">{overview.pools.map((pool) => <MasterPoolCard key={pool.poolId} pool={pool} />)}</div><Pagination overview={overview} tab="pools" /></>}
        {tab === "users" && <><div className="mt-5 grid gap-4 lg:grid-cols-2">{overview.users.map((user) => <MasterUserCard key={user.userId} user={user} />)}</div><Pagination overview={overview} tab="users" /></>}
        {tab === "audit" && <AuditList entries={overview.audit} />}
      </div>
    </section>
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

function TabLink({ active, href, icon: Icon, children }: { active: boolean; href: string; icon: typeof Archive; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false} className={`interactive flex whitespace-nowrap items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${active ? "bg-brand text-white" : "bg-surface-muted text-muted"}`}>
      <Icon className="size-4" /> {children}
    </Link>
  );
}

function SearchForm({ overview, tab }: { overview: MasterOverview; tab: "pools" | "users" }) {
  const name = tab === "pools" ? "busca_boloes" : "busca_usuarios";
  const value = tab === "pools" ? overview.poolSearch : overview.userSearch;

  return (
    <form action="/admin" className="flex gap-2 md:w-96">
      <input type="hidden" name="aba" value={tab} />
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Buscar nesta lista</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name={name} defaultValue={value} maxLength={100} placeholder="Buscar nesta lista" className="w-full rounded-xl border bg-white py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-brand" />
      </label>
      <button type="submit" className="interactive rounded-xl bg-brand px-3 text-xs font-black text-white">Buscar</button>
    </form>
  );
}

function Pagination({ overview, tab }: { overview: MasterOverview; tab: "pools" | "users" }) {
  const page = tab === "pools" ? overview.poolPage : overview.userPage;
  const pages = tab === "pools" ? overview.poolPages : overview.userPages;
  if (pages <= 1) return null;

  return (
    <nav aria-label={`Paginação de ${tab === "pools" ? "bolões" : "usuários"}`} className="mt-5 flex items-center justify-between gap-3">
      <Link aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined} href={adminHref(overview, tab, page - 1)} scroll={false} className={`interactive rounded-xl border bg-white px-3 py-2 text-xs font-black ${page === 1 ? "pointer-events-none opacity-40" : "text-brand"}`}>Anterior</Link>
      <span className="text-xs font-bold text-muted">Página {page} de {pages}</span>
      <Link aria-disabled={page === pages} tabIndex={page === pages ? -1 : undefined} href={adminHref(overview, tab, page + 1)} scroll={false} className={`interactive rounded-xl border bg-white px-3 py-2 text-xs font-black ${page === pages ? "pointer-events-none opacity-40" : "text-brand"}`}>Próxima</Link>
    </nav>
  );
}

function adminHref(overview: MasterOverview, tab: MasterOverview["activeTab"], page?: number) {
  const params = new URLSearchParams({ aba: tab });
  if (tab === "pools") {
    if (overview.poolSearch) params.set("busca_boloes", overview.poolSearch);
    if ((page ?? overview.poolPage) > 1) params.set("pagina_boloes", String(page ?? overview.poolPage));
  }
  if (tab === "users") {
    if (overview.userSearch) params.set("busca_usuarios", overview.userSearch);
    if ((page ?? overview.userPage) > 1) params.set("pagina_usuarios", String(page ?? overview.userPage));
  }
  return `/admin?${params}`;
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
