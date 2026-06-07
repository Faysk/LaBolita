"use client";

import {
  Archive,
  ArchiveRestore,
  Check,
  History,
  LoaderCircle,
  Search,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MasterOverview, MasterPool, MasterUser } from "@/lib/data/admin";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";

export function MasterAdminConsole({ overview }: { overview: MasterOverview }) {
  const [tab, setTab] = useState<"pools" | "users" | "audit">("pools");
  const [search, setSearch] = useState("");

  if (!overview.isMaster) return null;

  const cleanSearch = search.trim().toLocaleLowerCase("pt-BR");
  const pools = overview.pools.filter((pool) =>
    `${pool.poolName} ${pool.ownerName} ${pool.inviteCode}`.toLocaleLowerCase("pt-BR").includes(cleanSearch),
  );
  const users = overview.users.filter((user) =>
    `${user.displayName} ${user.email}`.toLocaleLowerCase("pt-BR").includes(cleanSearch),
  );

  return (
    <section className="card mt-8 overflow-hidden">
      <div className="border-b bg-brand-strong p-5 text-white md:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-accent p-2 text-brand-strong"><ShieldCheck className="size-5" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-accent">Controle exclusivo</p>
            <h2 className="mt-1 text-2xl font-black">Administração master</h2>
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
            <TabButton active={tab === "pools"} onClick={() => setTab("pools")} icon={Archive}>Bolões ({overview.pools.length})</TabButton>
            <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users}>Usuários ({overview.users.length})</TabButton>
            <TabButton active={tab === "audit"} onClick={() => setTab("audit")} icon={History}>Auditoria ({overview.audit.length})</TabButton>
          </div>
          {tab !== "audit" && (
            <label className="relative md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nesta lista" className="w-full rounded-xl border bg-white py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-brand" />
            </label>
          )}
        </div>

        {tab === "pools" && <div className="mt-5 grid gap-4 lg:grid-cols-2">{pools.map((pool) => <MasterPoolCard key={pool.poolId} pool={pool} />)}</div>}
        {tab === "users" && <div className="mt-5 grid gap-4 lg:grid-cols-2">{users.map((user) => <MasterUserCard key={user.userId} user={user} />)}</div>}
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

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Archive; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`interactive flex whitespace-nowrap items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${active ? "bg-brand text-white" : "bg-surface-muted text-muted"}`}>
      <Icon className="size-4" /> {children}
    </button>
  );
}

function MasterPoolCard({ pool }: { pool: MasterPool }) {
  const router = useRouter();
  const [name, setName] = useState(pool.poolName);
  const [isPublic, setIsPublic] = useState(pool.isPublic);
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
    const { error: rpcError } = await supabase.rpc("update_pool", {
      p_pool_id: pool.poolId,
      p_name: name,
      p_is_public: isPublic,
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
    <article className="rounded-2xl border bg-surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-black">{pool.poolName}</p><p className="mt-1 text-xs text-muted">Dono: {pool.ownerName} · {pool.memberCount} jogadores · {pool.inviteCode}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${pool.archivedAt ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-brand"}`}>{pool.archivedAt ? "Arquivado" : "Ativo"}</span>
      </div>
      <div className="mt-4 grid gap-2">
        <input value={name} minLength={3} maxLength={60} onChange={(event) => setName(event.target.value)} aria-label={`Nome de ${pool.poolName}`} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
        <label className="flex items-center gap-2 text-xs font-bold text-muted"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="size-4 accent-[var(--brand)]" /> Listar publicamente</label>
        <input value={reason} minLength={3} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatório" aria-label={`Motivo para ajustar ${pool.poolName}`} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(Boolean(pool.archivedAt))} className="interactive flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white disabled:opacity-40">{busy ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />} Salvar</button>
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(!pool.archivedAt)} className="interactive flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-black text-red-700 disabled:opacity-40">{pool.archivedAt ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />} {pool.archivedAt ? "Recuperar" : "Arquivar"}</button>
        <button type="button" disabled={busy} onClick={loadMembers} className="interactive flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-black text-brand disabled:opacity-40"><Users className="size-3" /> Participantes</button>
      </div>
      {members && (
        <div className="mt-3 divide-y rounded-xl border bg-white">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs font-bold">{member.display_name} · {member.role}</span>
              {member.role !== "owner" && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => removeMember(member.user_id)} className="interactive rounded-lg px-2 py-1 text-[10px] font-black text-red-700 disabled:opacity-40">Remover</button>}
            </div>
          ))}
        </div>
      )}
      {error && <p aria-live="polite" className="mt-2 text-xs font-bold text-red-700">{error}</p>}
    </article>
  );
}

function MasterUserCard({ user }: { user: MasterUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.displayName);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <article className="rounded-2xl border bg-surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate font-black">{user.displayName}</p><p className="mt-1 truncate text-xs text-muted">{user.email} · {user.poolsOwned} bolões</p></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${user.isMasterAdmin ? "bg-accent text-brand-strong" : user.disabledAt ? "bg-red-100 text-red-800" : "bg-emerald-100 text-brand"}`}>{user.isMasterAdmin ? "Master" : user.disabledAt ? "Suspenso" : "Ativo"}</span>
      </div>
      <p className="mt-2 text-xs text-muted">{user.termsAcceptedAt ? "Termos aceitos" : "Termos pendentes"}</p>
      <div className="mt-4 grid gap-2">
        <input value={name} minLength={2} maxLength={60} onChange={(event) => setName(event.target.value)} aria-label={`Nome de ${user.displayName}`} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
        <input value={reason} minLength={3} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatório" aria-label={`Motivo para ajustar ${user.displayName}`} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(Boolean(user.disabledAt))} className="interactive flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white disabled:opacity-40">{busy ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />} Salvar nome</button>
        {!user.isMasterAdmin && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(!user.disabledAt)} className="interactive flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-black text-red-700 disabled:opacity-40"><UserRoundCog className="size-3" /> {user.disabledAt ? "Reativar conta" : "Suspender conta"}</button>}
      </div>
      {error && <p aria-live="polite" className="mt-2 text-xs font-bold text-red-700">{error}</p>}
    </article>
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
