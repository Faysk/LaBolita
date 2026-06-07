"use client";

import {
  Check,
  Copy,
  LogIn,
  Plus,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { calculateDemoRanking } from "@/lib/demo-engine";
import { demoMatches, demoPools, demoRanking } from "@/lib/demo-data";
import {
  storeLocalPool,
  useLocalPools,
  useLocalPredictions,
  useLocalResults,
} from "@/lib/local-state";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { PoolSummary, RankingEntry } from "@/lib/types";

export function PoolsWorkspace({
  pools: initialPools,
  ranking,
  rankingName,
  rankingsByPool,
}: {
  pools: PoolSummary[];
  ranking: RankingEntry[];
  rankingName: string;
  rankingsByPool: Record<string, RankingEntry[]>;
}) {
  const router = useRouter();
  const localPools = useLocalPools();
  const localPredictions = useLocalPredictions(demoMatches);
  const localResults = useLocalResults();
  const usesSupabase = Boolean(createBrowserSupabaseClient());
  const pools = [...initialPools, ...localPools].filter(
    (pool, index, all) => all.findIndex((item) => item.id === pool.id) === index,
  );
  const [selectedPoolId, setSelectedPoolId] = useState(initialPools[0]?.id ?? "");
  const [panel, setPanel] = useState<"create" | "join" | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const selectedPool =
    pools.find((pool) => pool.id === selectedPoolId) ?? pools[0];
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
    (selectedPool && rankingsByPool[selectedPool.id]) ??
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

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1500);
  }

  return (
    <main className="page-container py-7 md:py-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">A resenha mora aqui</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Seus bolões
          </h1>
          <p className="mt-3 text-sm text-muted">
            Participe de vários grupos sem repetir seus palpites.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPanel(panel === "join" ? null : "join")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-extrabold text-brand md:flex-none"
          >
            <LogIn className="size-4" /> Entrar
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "create" ? null : "create")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-brand/20 md:flex-none"
          >
            <Plus className="size-4" /> Criar bolão
          </button>
        </div>
      </div>

      {panel && (
        <PoolForm
          mode={panel}
          onClose={() => setPanel(null)}
          onSuccess={(pool, isRemote) => {
            if (isRemote) router.refresh();
            else storeLocalPool(pool);
            setPanel(null);
          }}
        />
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {pools.map((pool) => (
          <article
            key={pool.id}
            data-testid={`pool-${pool.id}`}
            className={`card p-5 ${
              pool.id === selectedPool?.id ? "bg-brand-strong text-white" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex size-11 items-center justify-center rounded-2xl ${
                  pool.id === selectedPool?.id
                    ? "bg-accent text-brand-strong"
                    : "bg-surface-muted text-brand"
                }`}
              >
                <Trophy className="size-5" />
              </div>
              <span className={pool.id === selectedPool?.id ? "text-xs font-bold text-white/50" : "text-xs font-bold text-muted"}>
                {pool.position}º
              </span>
            </div>
            <h2 className="mt-6 text-xl font-black tracking-tight">{pool.name}</h2>
            <div
              className={`mt-3 flex items-center gap-3 text-sm ${
                pool.id === selectedPool?.id ? "text-white/60" : "text-muted"
              }`}
            >
              <span className="flex items-center gap-1">
                <Users className="size-4" /> {pool.members}
              </span>
              <span>•</span>
              <span>{pool.position}º lugar</span>
            </div>
            <div
              className={`mt-6 flex items-center justify-between rounded-2xl p-3 ${
                pool.id === selectedPool?.id ? "bg-white/10" : "bg-surface-muted"
              }`}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-55">
                  Código
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold">{pool.code}</p>
              </div>
              <button
                type="button"
                aria-label={`Copiar código ${pool.code}`}
                onClick={() => copyCode(pool.code)}
                className="rounded-xl p-2"
              >
                {copiedCode === pool.code ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPoolId(pool.id)}
              className={`mt-3 w-full rounded-xl px-3 py-2 text-xs font-black ${
                pool.id === selectedPool?.id
                  ? "bg-accent text-brand-strong"
                  : "bg-surface-muted text-brand"
              }`}
            >
              {pool.id === selectedPool?.id ? "Ranking selecionado" : "Ver ranking"}
            </button>
          </article>
        ))}
        {pools.length === 0 && (
          <p className="card p-6 text-sm text-muted md:col-span-3">
            Você ainda não participa de nenhum bolão. Crie um grupo ou entre
            com o código de um convite.
          </p>
        )}
      </section>

      <Ranking
        entries={visibleRanking}
        name={selectedPool?.name ?? rankingName}
        memberCount={selectedPool?.members ?? visibleRanking.length}
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const pool =
        mode === "create" ? await createPool(value) : await joinPool(value);
      const isRemote = Boolean(createBrowserSupabaseClient());
      setValue("");
      onSuccess(pool, isRemote);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      data-testid={`pool-form-${mode}`}
      onSubmit={submit}
      className="card mt-6 p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{mode === "create" ? "Novo grupo" : "Convite"}</p>
          <h2 className="mt-1 text-xl font-black">
            {mode === "create" ? "Crie seu bolão" : "Entre com um código"}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="rounded-xl p-2 text-muted"
        >
          <X className="size-4" />
        </button>
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
        <button
          type="submit"
          disabled={busy}
          className="rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {busy ? "Aguarde..." : mode === "create" ? "Criar agora" : "Entrar agora"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}
    </form>
  );
}

async function createPool(name: string): Promise<PoolSummary> {
  const cleanName = name.trim();
  if (cleanName.length < 3) throw new Error("Use pelo menos 3 caracteres.");

  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("create_pool", {
      p_name: cleanName,
      p_is_public: false,
    });
    if (error) throw new Error(error.message);
    const pool = normalizeRpcPool(data);
    return { id: pool.id, name: pool.name, code: pool.invite_code, members: 1, position: 1 };
  }

  return {
    id: crypto.randomUUID(),
    name: cleanName,
    code: createInviteCode(),
    members: 1,
    position: 1,
    eligibleFrom: new Date().toISOString(),
  };
}

async function joinPool(inviteCode: string): Promise<PoolSummary> {
  const code = inviteCode.trim().toUpperCase();
  if (code.length < 4) throw new Error("Informe um código válido.");

  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("join_pool", {
      p_invite_code: code,
    });
    if (error) throw new Error(error.message);
    const pool = normalizeRpcPool(data);
    return { id: pool.id, name: pool.name, code: pool.invite_code, members: 1, position: 1 };
  }

  const knownPool = demoPools.find((pool) => pool.code === code);
  if (knownPool) return knownPool;

  return {
    id: `joined-${code}`,
    name: `Bolão ${code}`,
    code,
    members: 1,
    position: 1,
    eligibleFrom: new Date().toISOString(),
  };
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeRpcPool(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    !("name" in value) ||
    !("invite_code" in value)
  ) {
    throw new Error("O servidor não retornou os dados do bolão.");
  }

  return value as { id: string; name: string; invite_code: string };
}

function Ranking({
  entries,
  name,
  memberCount,
}: {
  entries: RankingEntry[];
  name: string;
  memberCount: number;
}) {
  return (
    <section data-testid="pool-ranking" className="card mt-8 overflow-hidden">
      <div className="flex items-center justify-between border-b p-5 md:p-6">
        <div>
          <p className="eyebrow">{name}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Classificação</h2>
        </div>
        <div className="rounded-2xl bg-accent px-3 py-2 text-xs font-black text-brand-strong">
          {memberCount} jogadores
        </div>
      </div>
      <div className="divide-y">
        {entries.map((player) => (
          <div
            key={player.position}
            data-testid={player.isCurrentUser ? "ranking-current-user" : undefined}
            className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-4 md:grid-cols-[3rem_1fr_6rem_6rem_6rem] md:px-6 ${
              player.isCurrentUser ? "bg-accent/20" : ""
            }`}
          >
            <span className="text-center text-sm font-black text-muted">{player.position}</span>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                {player.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{player.name}</p>
                <p className="text-xs text-muted md:hidden">{player.exact} cravadas</p>
              </div>
            </div>
            <span className="text-right text-sm font-black text-brand">{player.points} pts</span>
            <span className="hidden text-center text-sm text-muted md:block">
              {player.exact} exatos
            </span>
            <span className="hidden text-center text-sm text-muted md:block">
              {player.correct} resultados
            </span>
            <span className="hidden text-center text-sm font-bold text-brand md:block">
              {player.trend}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">
            O ranking aparece assim que o bolão tiver participantes.
          </p>
        )}
      </div>
    </section>
  );
}
