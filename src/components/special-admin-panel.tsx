"use client";

import { useMemo, useState } from "react";
import {
  Check,
  LoaderCircle,
  Save,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
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

export function SpecialAdminPanel({
  overview,
}: {
  overview: SpecialMarketsOverview;
}) {
  if (!overview.available) {
    return (
      <section className="card mt-7 p-5 md:p-6">
        <p className="eyebrow">Palpites especiais</p>
        <h2 className="mt-1 text-2xl font-black">Aguardando banco</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {overview.missingReason ??
            "Aplique a migration em homolog para administrar os especiais."}
        </p>
      </section>
    );
  }

  return (
    <section className="card mt-7 overflow-hidden">
      <div className="flex items-center gap-3 border-b p-5 md:p-6">
        <Trophy className="size-5 text-brand" />
        <div>
          <p className="eyebrow">Palpites especiais</p>
          <h2 className="font-black">Resultados e correções</h2>
          <p className="text-sm text-muted">
            Confirme prêmios e estatísticas especiais com motivo obrigatório.
          </p>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:p-6 xl:grid-cols-2">
        {overview.markets.map((market) => (
          <SpecialAdminMarket key={market.key} market={market} />
        ))}
      </div>
    </section>
  );
}

function SpecialAdminMarket({ market }: { market: SpecialMarketView }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const optionByKey = useMemo(
    () => new Map(market.options.map((option) => [option.key, option])),
    [market.options],
  );
  const [selectedKeys, setSelectedKeys] = useState(() =>
    Array.from({ length: market.pickCount }, (_, index) => {
      return market.results[index]?.key ?? "";
    }),
  );
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [sync, setSync] = useState<SyncState>({});
  const selectedOptions = selectedKeys
    .map((key) => optionByKey.get(key))
    .filter((option): option is SpecialOption => Boolean(option));
  const uniqueCount = new Set(selectedKeys.filter(Boolean)).size;
  const complete = selectedOptions.length === market.pickCount && uniqueCount === market.pickCount;
  const visibleOptions = useMemo(
    () => visibleSpecialOptions(market.options, search, selectedKeys),
    [market.options, search, selectedKeys],
  );
  const suggestionKeys = market.automaticSuggestions
    .slice(0, market.pickCount)
    .map((suggestion) => suggestion.key);
  const usingAutomaticSuggestion =
    suggestionKeys.length === market.pickCount &&
    suggestionKeys.join("|") === selectedKeys.join("|");

  function updateSelection(index: number, key: string) {
    setSelectedKeys((current) => {
      const next = [...current];
      next[index] = key;
      return next;
    });
    setSync({});
  }

  function useSuggestion() {
    setSelectedKeys(suggestionKeys);
    setSync({});
  }

  async function save() {
    if (!supabase || !complete || sync.busy || reason.trim().length < 3) return;
    setSync({ busy: true });
    const { error } = await supabase.rpc("set_special_market_result", {
      p_market_key: market.key,
      p_options: selectedOptions.map(optionPayload),
      p_reason: reason,
      p_source: usingAutomaticSuggestion ? "automatic_suggestion" : "manual",
    });

    if (error) {
      setSync({
        busy: false,
        message: friendlyServerError(error, "Não foi possível salvar o resultado especial."),
      });
      navigator.vibrate?.([25, 30, 25]);
      return;
    }

    setSync({ busy: false, ok: true, message: "Resultado especial salvo." });
    navigator.vibrate?.(20);
    router.refresh();
  }

  return (
    <article className="rounded-2xl border bg-surface-muted/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black">{market.title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted">{market.scoringNote}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
            market.status === "resolved" ? "status-success" : "status-warning"
          }`}
        >
          {market.status === "resolved" ? "Resolvido" : "Pendente"}
        </span>
      </div>

      {market.automaticSuggestions.length > 0 && (
        <div className="mt-3 rounded-2xl border bg-surface p-3 text-xs">
          <p className="flex items-center gap-2 font-black text-brand">
            <Sparkles className="size-4" />
            Sugestão automática
          </p>
          <p className="mt-1 text-muted">
            {market.automaticSuggestions
              .slice(0, market.pickCount)
              .map((suggestion) => `${suggestion.label} (${suggestion.description})`)
              .join(", ")}
          </p>
          <button
            type="button"
            disabled={suggestionKeys.length !== market.pickCount || sync.busy}
            onClick={useSuggestion}
            className="interactive mt-3 rounded-xl border bg-surface-muted px-3 py-2 text-xs font-black text-brand hover:border-brand/60 disabled:opacity-40"
          >
            Usar sugestão
          </button>
        </div>
      )}

      <label className="relative mt-3 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            market.optionSource === "teams" ? "Buscar seleção" : "Buscar jogador"
          }
          className="w-full rounded-xl border bg-surface py-3 pl-10 pr-3 text-sm font-bold outline-none placeholder:text-muted focus:border-brand"
        />
      </label>

      <div className="mt-3 grid gap-2">
        {Array.from({ length: market.pickCount }, (_, index) => (
          <select
            key={index}
            value={selectedKeys[index] ?? ""}
            disabled={sync.busy}
            onChange={(event) => updateSelection(index, event.target.value)}
            className="rounded-xl border bg-surface px-3 py-3 text-sm font-black text-foreground outline-none focus:border-brand disabled:opacity-60"
          >
            <option value="">
              {market.pickCount > 1 ? `${index + 1}ª escolha` : "Resultado"}
            </option>
            {visibleOptions.map((option) => (
              <option
                key={option.key}
                value={option.key}
                disabled={
                  selectedKeys.includes(option.key) && selectedKeys[index] !== option.key
                }
              >
                {option.label} · {option.teamName}
              </option>
            ))}
          </select>
        ))}
      </div>

      {selectedOptions.length > 0 && (
        <p className="mt-3 rounded-xl border bg-surface px-3 py-2 text-xs font-bold text-muted">
          Resultado selecionado:{" "}
          {selectedOptions.map((option) => summarizeSpecialOption(option)).join(", ")}
        </p>
      )}

      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Motivo ou fonte oficial"
        className="mt-3 w-full rounded-xl border bg-surface px-3 py-3 text-sm font-bold outline-none placeholder:text-muted focus:border-brand"
      />
      <button
        type="button"
        disabled={!complete || reason.trim().length < 3 || sync.busy}
        onClick={save}
        className="interactive mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
      >
        {sync.busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : market.status === "resolved" ? (
          <Check className="size-4" />
        ) : (
          <Save className="size-4" />
        )}
        {market.status === "resolved" ? "Corrigir resultado" : "Salvar resultado"}
      </button>
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

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
