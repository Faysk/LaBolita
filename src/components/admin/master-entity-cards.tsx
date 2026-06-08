"use client";

import {
  Archive,
  ArchiveRestore,
  Check,
  LoaderCircle,
  ShieldPlus,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { COUNTRIES } from "@/lib/countries";
import type { MasterPool, MasterUser } from "@/lib/data/admin";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";

export function MasterPoolCard({ pool }: { pool: MasterPool }) {
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
    <article className="rounded-2xl border bg-surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3"><CountryFlag code={flagCode} size="sm" /><div><p className="font-black">{pool.poolName}</p><p className="mt-1 text-xs text-muted">Dono: {pool.ownerName} · {pool.memberCount} jogadores · {pool.inviteCode}</p></div></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${pool.archivedAt ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-brand"}`}>{pool.archivedAt ? "Arquivado" : "Ativo"}</span>
      </div>
      <div className="mt-4 grid gap-2">
        <input value={name} minLength={3} maxLength={60} onChange={(event) => setName(event.target.value)} aria-label={`Nome de ${pool.poolName}`} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
        <select value={flagCode} onChange={(event) => setFlagCode(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand">
          {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name}</option>)}
        </select>
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

export function MasterUserCard({ user }: { user: MasterUser }) {
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
    <article className="rounded-2xl border bg-surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate font-black">{user.displayName}</p><p className="mt-1 truncate text-xs text-muted">{user.email} · {user.poolsOwned} bolões</p></div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${user.isMasterAdmin ? "bg-accent text-brand-strong" : user.disabledAt ? "bg-red-100 text-red-800" : user.isAdmin ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-brand"}`}>{user.isMasterAdmin ? "Master principal" : user.disabledAt ? "Suspenso" : user.isAdmin ? "Admin" : "Ativo"}</span>
      </div>
      <p className="mt-2 text-xs text-muted">{user.termsAcceptedAt ? "Termos aceitos" : "Termos pendentes"}</p>
      <div className="mt-4 grid gap-2">
        <input value={name} minLength={2} maxLength={60} onChange={(event) => setName(event.target.value)} aria-label={`Nome de ${user.displayName}`} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
        <input value={reason} minLength={3} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatório" aria-label={`Motivo para ajustar ${user.displayName}`} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(Boolean(user.disabledAt))} className="interactive flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white disabled:opacity-40">{busy ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />} Salvar nome</button>
        {!user.isMasterAdmin && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(!user.disabledAt)} className="interactive flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-black text-red-700 disabled:opacity-40"><UserRoundCog className="size-3" /> {user.disabledAt ? "Reativar conta" : "Suspender conta"}</button>}
        {!user.isMasterAdmin && <button type="button" disabled={busy || Boolean(user.disabledAt) || reason.trim().length < 3} onClick={updateAdminAccess} className="interactive flex items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-black text-blue-800 disabled:opacity-40"><ShieldPlus className="size-3" /> {user.isAdmin ? "Remover admin" : "Promover admin"}</button>}
      </div>
      {error && <p aria-live="polite" className="mt-2 text-xs font-bold text-red-700">{error}</p>}
    </article>
  );
}
