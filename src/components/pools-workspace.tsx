"use client";

import {
  Archive,
  ArchiveRestore,
  Check,
  LoaderCircle,
  LogIn,
  Plus,
  Search,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import {
  EmptyCard,
  PaginationLink,
  PoolCard,
  PoolSection,
  PublicPoolCard,
  Ranking,
} from "@/components/pools/pool-display";
import { calculateDemoRanking } from "@/lib/demo-engine";
import { demoMatches, demoPools, demoRanking } from "@/lib/demo-data";
import { COUNTRIES } from "@/lib/countries";
import type { PoolsOverview } from "@/lib/data/pools";
import {
  storeLocalPool,
  useLocalPools,
  useLocalPredictions,
  useLocalResults,
} from "@/lib/local-state";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { PoolSummary, RankingEntry } from "@/lib/types";
import { friendlyServerError } from "@/lib/user-errors";

type ManagedMember = {
  user_id: string;
  display_name: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
};

export function PoolsWorkspace({
  pools: initialPools,
  publicPools,
  ranking,
  rankingName,
  rankingsByPool,
  isAuthenticated,
  currentUserId,
  publicPage,
  publicPages,
  publicSearch,
}: PoolsOverview) {
  const router = useRouter();
  const localPools = useLocalPools();
  const localPredictions = useLocalPredictions(demoMatches);
  const localResults = useLocalResults();
  const usesSupabase = Boolean(createBrowserSupabaseClient());
  const pools = [...initialPools, ...localPools].filter(
    (pool, index, all) => all.findIndex((item) => item.id === pool.id) === index,
  );
  const activePools = pools.filter((pool) => !pool.isArchived);
  const archivedPools = pools.filter((pool) => pool.isArchived);
  const firstPool = activePools[0] ?? publicPools[0];
  const [selectedPoolId, setSelectedPoolId] = useState(firstPool?.id ?? "");
  const [loadedRankings, setLoadedRankings] = useState(rankingsByPool);
  const [rankingLoadingId, setRankingLoadingId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"create" | "join" | null>(null);
  const [managedPoolId, setManagedPoolId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selectedPool =
    [...pools, ...publicPools].find((pool) => pool.id === selectedPoolId) ?? firstPool;
  const selectedIsLocal = Boolean(
    selectedPool && localPools.some((pool) => pool.id === selectedPool.id),
  );
  const newPoolRanking = demoRanking
    .filter((player) => player.isCurrentUser)
    .map((player) => ({
      ...player,
      position: 1,
      points: 0,
      exact: 0,
      correct: 0,
      trend: "—",
    }));
  const selectedBaseRanking =
    (selectedPool && loadedRankings[selectedPool.id]) ??
    (selectedIsLocal ? newPoolRanking : ranking);
  const visibleRanking = usesSupabase
    ? selectedBaseRanking
    : calculateDemoRanking(
        selectedBaseRanking.length ? selectedBaseRanking : demoRanking,
        demoMatches,
        localPredictions,
        localResults,
        selectedPool?.eligibleFrom,
      );

  function requireLogin(panelToOpen: "create" | "join") {
    if (!isAuthenticated) {
      router.push("/entrar?next=%2Fboloes");
      return;
    }
    setPanel(panel === panelToOpen ? null : panelToOpen);
  }

  async function copyCode(code?: string) {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    navigator.vibrate?.(15);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1500);
  }

  async function joinPublicPool(pool: PoolSummary) {
    if (!isAuthenticated) {
      router.push("/entrar?next=%2Fboloes");
      return;
    }
    const supabase = createBrowserSupabaseClient();
    if (!supabase || joiningId) return;
    setJoiningId(pool.id);
    setNotice(null);
    const { error } = await supabase.rpc("join_public_pool", { p_pool_id: pool.id });
    if (error) {
      setNotice(friendlyServerError(error, "Não foi possível entrar neste bolão."));
      navigator.vibrate?.([25, 30, 25]);
    } else {
      setNotice(`Você entrou no bolão ${pool.name}.`);
      navigator.vibrate?.(25);
      router.refresh();
    }
    setJoiningId(null);
  }

  async function selectPool(pool: PoolSummary) {
    setSelectedPoolId(pool.id);
    if (loadedRankings[pool.id] || !usesSupabase) return;

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    setRankingLoadingId(pool.id);
    const isMembership = pools.some((membership) => membership.id === pool.id);
    const { data, error } = isMembership
      ? await supabase.rpc("get_pool_ranking", { p_pool_id: pool.id })
      : await supabase.rpc("get_public_pool_ranking", {
          p_pool_id: pool.id,
          p_limit: 25,
          p_offset: 0,
        });
    if (error) {
      setNotice(friendlyServerError(error, "Não foi possível carregar este ranking."));
      navigator.vibrate?.([25, 30, 25]);
    } else {
      setLoadedRankings((current) => ({
        ...current,
        [pool.id]: mapRpcRanking(data, currentUserId),
      }));
    }
    setRankingLoadingId(null);
  }

  return (
    <main className="page-container py-7 md:py-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">A resenha mora aqui</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Bolões
          </h1>
          <p className="mt-3 text-sm text-muted">
            Acompanhe rankings públicos ou entre na disputa com sua turma.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => requireLogin("join")}
            className="interactive flex flex-1 items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-extrabold text-brand md:flex-none"
          >
            <LogIn className="size-4" /> Entrar com código
          </button>
          <button
            type="button"
            onClick={() => requireLogin("create")}
            className="interactive flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-brand/20 md:flex-none"
          >
            <Plus className="size-4" /> Criar bolão
          </button>
        </div>
      </div>

      {notice && (
        <p aria-live="polite" className="mt-5 rounded-2xl border bg-white px-4 py-3 text-sm font-bold text-brand">
          {notice}
        </p>
      )}

      {panel && (
        <PoolForm
          mode={panel}
          onClose={() => setPanel(null)}
          onSuccess={(pool, isRemote) => {
            if (isRemote) router.refresh();
            else storeLocalPool(pool);
            navigator.vibrate?.(25);
            setPanel(null);
          }}
        />
      )}

      {isAuthenticated && (
        <PoolSection title="Seus bolões" subtitle="Grupos em que você participa ou administra.">
          {activePools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              selected={pool.id === selectedPool?.id}
              copied={copiedCode === pool.code}
              onCopy={() => copyCode(pool.code)}
              onSelect={() => void selectPool(pool)}
              onManage={pool.isOwner ? () => setManagedPoolId(managedPoolId === pool.id ? null : pool.id) : undefined}
            />
          ))}
          {activePools.length === 0 && (
            <EmptyCard text="Você ainda não participa de nenhum bolão. Crie um grupo, use um convite ou descubra um bolão público." />
          )}
        </PoolSection>
      )}

      {managedPoolId && (
        <PoolManagement
          pool={pools.find((pool) => pool.id === managedPoolId)!}
          onClose={() => setManagedPoolId(null)}
        />
      )}

      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Aberto para a torcida</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Bolões públicos</h2>
            <p className="mt-2 text-sm text-muted">Resultados paginados para manter tudo leve e organizado.</p>
          </div>
          <form action="/boloes" className="flex gap-2">
            <label className="relative min-w-0 flex-1 md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                name="busca"
                defaultValue={publicSearch}
                maxLength={60}
                placeholder="Buscar bolão ou dono"
                className="w-full rounded-2xl border bg-white py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-brand"
              />
            </label>
            <button className="interactive rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white" type="submit">
              Buscar
            </button>
          </form>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publicPools.map((pool) => (
            <PublicPoolCard
              key={pool.id}
              pool={pool}
              selected={pool.id === selectedPool?.id}
              joining={joiningId === pool.id}
              onSelect={() => void selectPool(pool)}
              onJoin={() => joinPublicPool(pool)}
            />
          ))}
          {publicPools.length === 0 && (
            <EmptyCard text={publicSearch ? "Nenhum bolão público encontrado nesta busca." : "Ainda não há bolões públicos disponíveis."} />
          )}
        </div>
        {publicPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3 text-sm font-bold">
            <PaginationLink page={publicPage - 1} disabled={publicPage <= 1} search={publicSearch}>Anterior</PaginationLink>
            <span className="text-muted">Página {publicPage} de {publicPages}</span>
            <PaginationLink page={publicPage + 1} disabled={publicPage >= publicPages} search={publicSearch}>Próxima</PaginationLink>
          </div>
        )}
      </section>

      {archivedPools.length > 0 && (
        <details className="card mt-8 p-5">
          <summary className="cursor-pointer text-sm font-black text-muted">Bolões arquivados ({archivedPools.length})</summary>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {archivedPools.map((pool) => (
              <button
                key={pool.id}
                type="button"
                onClick={() => setManagedPoolId(pool.id)}
                className="interactive rounded-2xl border bg-surface-muted p-4 text-left"
              >
                <span className="flex items-center gap-2 font-black"><Archive className="size-4" /> {pool.name}</span>
                <span className="mt-1 block text-xs text-muted">Um administrador global pode recuperar.</span>
              </button>
            ))}
          </div>
        </details>
      )}

      <Ranking
        entries={visibleRanking}
        name={selectedPool?.name ?? rankingName}
        memberCount={selectedPool?.members ?? visibleRanking.length}
        loading={rankingLoadingId === selectedPool?.id}
      />
    </main>
  );
}

function PoolForm({
  mode,
  onClose,
  onSuccess,
}: {
  mode: "create" | "join";
  onClose: () => void;
  onSuccess: (pool: PoolSummary, isRemote: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [flagCode, setFlagCode] = useState("br");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const pool =
        mode === "create" ? await createPool(value, isPublic, flagCode) : await joinPool(value);
      const isRemote = Boolean(createBrowserSupabaseClient());
      setValue("");
      onSuccess(pool, isRemote);
    } catch (caught) {
      setError(friendlyServerError(caught, "Não foi possível concluir."));
      navigator.vibrate?.([25, 30, 25]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form data-testid={`pool-form-${mode}`} onSubmit={submit} className="card mt-6 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{mode === "create" ? "Novo grupo" : "Convite"}</p>
          <h2 className="mt-1 text-xl font-black">{mode === "create" ? "Crie seu bolão" : "Entre com um código"}</h2>
        </div>
        <button type="button" aria-label="Fechar" onClick={onClose} className="interactive rounded-xl p-2 text-muted"><X className="size-4" /></button>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          required
          minLength={mode === "create" ? 3 : 4}
          maxLength={60}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={mode === "create" ? "Ex.: Família Faysk" : "Ex.: FYSK26"}
          className="min-w-0 flex-1 rounded-2xl border bg-white px-4 py-3 text-sm font-bold outline-none focus:border-brand"
        />
        <button type="submit" disabled={busy} aria-busy={busy} className="interactive flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60">
          {busy && <LoaderCircle className="size-4 animate-spin" />}
          {busy ? "Processando..." : mode === "create" ? "Criar agora" : "Entrar agora"}
        </button>
      </div>
      {mode === "create" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FlagPicker value={flagCode} onChange={setFlagCode} />
          <label className="flex items-center gap-2 rounded-xl border bg-surface-muted px-3 py-3 text-sm font-bold text-muted">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="size-4 accent-[var(--brand)]" />
            Exibir este bolão na lista pública
          </label>
        </div>
      )}
      {error && <p aria-live="polite" className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </form>
  );
}

function PoolManagement({ pool, onClose }: { pool: PoolSummary; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(pool.name);
  const [isPublic, setIsPublic] = useState(Boolean(pool.isPublic));
  const [flagCode, setFlagCode] = useState(pool.flagCode ?? "br");
  const [reason, setReason] = useState("");
  const [members, setMembers] = useState<ManagedMember[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  async function loadMembers() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc("get_managed_pool_members", { p_pool_id: pool.id });
    if (rpcError) setError(friendlyServerError(rpcError, "Não foi possível carregar os participantes."));
    else setMembers((data ?? []) as ManagedMember[]);
  }

  async function update(archived: boolean) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("update_pool_with_flag", {
      p_pool_id: pool.id,
      p_name: name,
      p_is_public: isPublic,
      p_flag_code: flagCode,
      p_archived: archived,
      p_reason: reason,
    });
    if (rpcError) {
      setError(friendlyServerError(rpcError, "Não foi possível atualizar o bolão."));
      navigator.vibrate?.([25, 30, 25]);
    } else {
      navigator.vibrate?.(25);
      onClose();
      router.refresh();
    }
    setBusy(false);
  }

  async function removeMember(member: ManagedMember) {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || !reason.trim() || busy) return;
    setBusy(true);
    const { error: rpcError } = await supabase.rpc("remove_pool_member", {
      p_pool_id: pool.id,
      p_user_id: member.user_id,
      p_reason: reason,
    });
    if (rpcError) setError(friendlyServerError(rpcError, "Não foi possível remover o participante."));
    else {
      setMembers((current) => current?.filter((item) => item.user_id !== member.user_id) ?? []);
      navigator.vibrate?.(25);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-strong/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
    <section role="dialog" aria-modal="true" aria-labelledby="pool-management-title" className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 pb-28 shadow-2xl sm:rounded-[1.5rem] sm:pb-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="eyebrow">Gestão do bolão</p><h2 id="pool-management-title" className="mt-1 text-xl font-black">{pool.name}</h2></div>
        <button type="button" aria-label="Fechar gestão" onClick={onClose} className="interactive rounded-xl p-2 text-muted"><X className="size-4" /></button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-bold text-muted">Nome
          <input value={name} minLength={3} maxLength={60} onChange={(event) => setName(event.target.value)} className="mt-1 block w-full rounded-xl border bg-white px-3 py-3 text-sm font-bold outline-none focus:border-brand" />
        </label>
        <label className="flex items-center gap-2 self-end rounded-xl border bg-surface-muted px-3 py-3 text-sm font-bold text-muted">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="size-4 accent-[var(--brand)]" /> Listar publicamente
        </label>
        <FlagPicker value={flagCode} onChange={setFlagCode} />
        <label className="text-xs font-bold text-muted md:col-span-2">Motivo da alteração
          <input value={reason} minLength={3} maxLength={200} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: atualização solicitada pelo grupo" className="mt-1 block w-full rounded-xl border bg-white px-3 py-3 text-sm font-bold outline-none focus:border-brand" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => update(Boolean(pool.isArchived))} className="interactive flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black text-white disabled:opacity-50">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Salvar ajustes
        </button>
        {!pool.isArchived && (
          <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => setConfirmArchive(true)} className="interactive flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-black text-red-700 disabled:opacity-50">
            <Archive className="size-4" /> Arquivar bolão
          </button>
        )}
        <button type="button" disabled={busy} onClick={loadMembers} className="interactive flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-black text-brand">
          <Users className="size-4" /> Ver participantes
        </button>
      </div>
      {confirmArchive && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-black text-red-800">Arquivar {pool.name}?</p>
          <p className="mt-1 text-xs leading-5 text-red-700">Ele deixará de aparecer para participantes e na lista pública. O histórico será preservado.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void update(true)} className="interactive rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Confirmar arquivamento</button>
            <button type="button" disabled={busy} onClick={() => setConfirmArchive(false)} className="interactive rounded-xl border bg-white px-4 py-2 text-xs font-black text-muted">Cancelar</button>
          </div>
        </div>
      )}
      {members && (
        <div className="mt-5 divide-y rounded-2xl border">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{member.display_name} <span className="text-xs text-muted">· {member.role}</span></span>
              {member.role !== "owner" && (
                <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => removeMember(member)} className="interactive flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-red-700 disabled:opacity-40">
                  <UserMinus className="size-3" /> Remover
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {pool.isArchived && <p className="mt-4 flex items-center gap-2 text-sm font-bold text-amber-700"><ArchiveRestore className="size-4" /> A recuperação fica disponível no painel de administração global.</p>}
      {error && <p aria-live="polite" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
    </section>
    </div>
  );
}

async function createPool(name: string, isPublic: boolean, flagCode: string): Promise<PoolSummary> {
  const cleanName = name.trim();
  if (cleanName.length < 3) throw new Error("Use pelo menos 3 caracteres.");
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("create_pool_with_flag", {
      p_name: cleanName,
      p_is_public: isPublic,
      p_flag_code: flagCode,
    });
    if (error) throw error;
    const pool = normalizeRpcPool(data);
    return { id: pool.id, name: pool.name, flagCode, code: pool.invite_code, members: 1, position: 1, isPublic, isOwner: true };
  }
  return { id: crypto.randomUUID(), name: cleanName, flagCode, code: createInviteCode(), members: 1, position: 1, eligibleFrom: new Date().toISOString(), isOwner: true, isPublic };
}

function FlagPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold text-muted">
      Bandeira do bolão
      <span className="mt-1 flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
        <CountryFlag code={value} size="sm" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-1 text-sm font-bold text-foreground outline-none"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

async function joinPool(inviteCode: string): Promise<PoolSummary> {
  const code = inviteCode.trim().toUpperCase();
  if (code.length < 4) throw new Error("Informe um código válido.");
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("join_pool", { p_invite_code: code });
    if (error) throw error;
    const pool = normalizeRpcPool(data);
    return { id: pool.id, name: pool.name, code: pool.invite_code, members: 1, position: 1 };
  }
  const knownPool = demoPools.find((pool) => pool.code === code);
  if (knownPool) return knownPool;
  return { id: `joined-${code}`, name: `Bolão ${code}`, code, members: 1, position: 1, eligibleFrom: new Date().toISOString() };
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeRpcPool(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object" || !("id" in value) || !("name" in value) || !("invite_code" in value)) {
    throw new Error("O servidor não retornou os dados do bolão.");
  }
  return value as { id: string; name: string; invite_code: string };
}

function mapRpcRanking(data: unknown, currentUserId?: string): RankingEntry[] {
  if (!Array.isArray(data)) return [];
  return data.map((entry) => {
    const row = entry as {
      rank_position: number;
      display_name: string;
      total_points: number;
      exact_scores: number;
      correct_results: number;
      user_id: string | null;
      avatar_url?: string | null;
    };
    return {
      position: Number(row.rank_position),
      name: row.display_name,
      initials: row.display_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
      points: Number(row.total_points),
      exact: Number(row.exact_scores),
      correct: Number(row.correct_results),
      trend: "—",
      isCurrentUser: row.user_id === currentUserId,
      avatarUrl: row.avatar_url ?? undefined,
    };
  });
}
