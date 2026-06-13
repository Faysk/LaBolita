"use client";

import { useMemo, useState } from "react";
import {
  Check,
  LoaderCircle,
  LockKeyhole,
  Save,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  localSpecialDateTime,
  optionPayload,
  summarizeSpecialOption,
  type SpecialOption,
} from "@/lib/special-markets";
import type { SpecialMarketView, SpecialMarketsOverview } from "@/lib/data/specials";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";

type SyncState = {
  busy?: boolean;
  message?: string | null;
  ok?: boolean;
};

export function SpecialPredictionsBoard({
  overview,
}: {
  overview: SpecialMarketsOverview;
}) {
  if (!overview.available) {
    return (
      <section className="card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
            <LockKeyhole className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black">Palpites especiais aguardando publicação</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {overview.missingReason ??
                "Assim que o banco receber a nova migration, esta área fica disponível."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {overview.markets.map((market) => (
        <SpecialMarketCard key={market.key} market={market} />
      ))}
    </section>
  );
}

function SpecialMarketCard({ market }: { market: SpecialMarketView }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const optionByKey = useMemo(
    () => new Map(market.options.map((option) => [option.key, option])),
    [market.options],
  );
  const [selectedKeys, setSelectedKeys] = useState(() =>
    Array.from({ length: market.pickCount }, (_, index) => {
      return market.predictions[index]?.key ?? "";
    }),
  );
  const [search, setSearch] = useState("");
  const [sync, setSync] = useState<SyncState>({});
  const selectedOptions = selectedKeys
    .map((key) => optionByKey.get(key))
    .filter((option): option is SpecialOption => Boolean(option));
  const uniqueCount = new Set(selectedKeys.filter(Boolean)).size;
  const complete = selectedOptions.length === market.pickCount && uniqueCount === market.pickCount;
  const dirty =
    selectedKeys.join("|") !==
    Array.from({ length: market.pickCount }, (_, index) => market.predictions[index]?.key ?? "").join("|");
  const resultSummary =
    market.results.length > 0
      ? market.results.map((pick) => summarizeStoredPick(pick)).join(", ")
      : null;
  const visibleOptions = useMemo(
    () => visibleSpecialOptions(market.options, search, selectedKeys),
    [market.options, search, selectedKeys],
  );

  function updateSelection(index: number, key: string) {
    setSelectedKeys((current) => {
      const next = [...current];
      next[index] = key;
      return next;
    });
    setSync({});
  }

  async function save() {
    if (!supabase || !complete || market.locked || sync.busy) return;
    setSync({ busy: true });

    const payload = selectedOptions.map(optionPayload);
    const { error } = await supabase.rpc("save_special_prediction", {
      p_market_key: market.key,
      p_options: payload,
    });

    if (error) {
      setSync({
        busy: false,
        message: friendlyServerError(
          error,
          "Não foi possível salvar este palpite especial.",
        ),
      });
      navigator.vibrate?.([25, 30, 25]);
      return;
    }

    setSync({ busy: false, ok: true, message: "Palpite especial salvo." });
    navigator.vibrate?.(20);
    router.refresh();
  }

  return (
    <article className="card overflow-hidden">
      <div className="border-b bg-surface-muted/70 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{market.exactPoints} pts</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
              {market.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{market.description}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black ${
              market.status === "resolved"
                ? "status-success"
                : market.locked
                  ? "status-neutral"
                  : "status-warning"
            }`}
          >
            {market.status === "resolved" ? (
              <Check className="size-3" />
            ) : market.locked ? (
              <LockKeyhole className="size-3" />
            ) : (
              <Sparkles className="size-3" />
            )}
            {market.status === "resolved"
              ? "Resolvido"
              : market.locked
                ? "Bloqueado"
                : "Aberto"}
          </span>
        </div>
        <div className="mt-4 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
          <span>Bloqueia: {localSpecialDateTime(market.lockAt)} · BRT</span>
          <span>{market.scoringNote}</span>
        </div>
      </div>

      <div className="p-5">
        {resultSummary && (
          <div className="mb-4 rounded-2xl border bg-surface-muted p-3 text-sm">
            <p className="flex items-center gap-2 font-black text-brand">
              <Trophy className="size-4" />
              Resultado oficial
            </p>
            <p className="mt-1 text-muted">{resultSummary}</p>
          </div>
        )}

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              market.optionSource === "teams"
                ? "Buscar seleção"
                : "Buscar jogador ou seleção"
            }
            className="w-full rounded-xl border bg-surface py-3 pl-10 pr-3 text-sm font-bold outline-none placeholder:text-muted focus:border-brand"
          />
        </label>

        <div className="mt-4 grid gap-3">
          {Array.from({ length: market.pickCount }, (_, index) => (
            <label key={index} className="block text-xs font-black text-muted">
              {market.pickCount > 1 ? `${index + 1}ª escolha` : "Sua escolha"}
              <select
                value={selectedKeys[index] ?? ""}
                disabled={market.locked || sync.busy}
                onChange={(event) => updateSelection(index, event.target.value)}
                className="mt-1 w-full rounded-xl border bg-surface px-3 py-3 text-sm font-black text-foreground outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Selecione</option>
                {visibleOptions.map((option) => (
                  <option
                    key={option.key}
                    value={option.key}
                    disabled={
                      selectedKeys.includes(option.key) &&
                      selectedKeys[index] !== option.key
                    }
                  >
                    {option.label} · {option.teamName}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {selectedOptions.length > 0 && (
          <div className="mt-4 rounded-2xl border bg-surface-muted p-3 text-xs text-muted">
            <p className="font-black text-foreground">Selecionado</p>
            <p className="mt-1">
              {selectedOptions.map((option) => summarizeSpecialOption(option)).join(", ")}
            </p>
          </div>
        )}

        {!market.locked && (
          <button
            type="button"
            onClick={save}
            disabled={!complete || !dirty || sync.busy}
            className="interactive mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-black text-white shadow-lg shadow-brand/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:shadow-none"
          >
            {sync.busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar palpite especial
          </button>
        )}

        {market.locked && market.predictions.length === 0 && (
          <p className="mt-4 rounded-2xl border bg-surface-muted p-3 text-sm font-bold text-muted">
            Este palpite já bloqueou. Você não registrou uma escolha para este mercado.
          </p>
        )}

        {sync.message && (
          <p
            aria-live="polite"
            className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold ${
              sync.ok ? "status-success" : "status-danger"
            }`}
          >
            {sync.message}
          </p>
        )}
      </div>
    </article>
  );
}

function visibleSpecialOptions(
  options: SpecialOption[],
  search: string,
  selectedKeys: string[],
) {
  const normalized = normalizeSearch(search);
  const selected = new Set(selectedKeys.filter(Boolean));
  const filtered = options
    .filter((option) => {
      if (!normalized) return true;
      return normalizeSearch(`${option.label} ${option.teamName}`).includes(normalized);
    })
    .slice(0, normalized ? 120 : 70);

  for (const key of selected) {
    const option = options.find((candidate) => candidate.key === key);
    if (option && !filtered.some((candidate) => candidate.key === key)) {
      filtered.unshift(option);
    }
  }

  return filtered;
}

function summarizeStoredPick(pick: { label: string }) {
  return pick.label;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
