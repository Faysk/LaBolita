"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Save,
  Search,
  X,
} from "lucide-react";
import {
  SpecialOptionAvatar,
  SpecialOptionSticker,
} from "@/components/special-sticker";
import {
  highlightSpecialOptions,
  localSpecialDateTime,
  optionPayload,
  summarizeSpecialOption,
  type SpecialOption,
} from "@/lib/special-markets";
import {
  SPECIAL_LOCK_DATE_LABEL,
  specialMarketDisplay,
} from "@/lib/special-market-display";
import type { SpecialMarketView } from "@/lib/data/specials";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";

type SyncState = {
  busy?: boolean;
  message?: string | null;
  ok?: boolean;
};

export function SpecialMarketPicker({ market }: { market: SpecialMarketView }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const display = specialMarketDisplay(market.key);
  const Icon = display.icon;
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
  const [visibleCount, setVisibleCount] = useState(60);
  const [sync, setSync] = useState<SyncState>({});
  const selectedOptions = selectedKeys
    .map((key) => optionByKey.get(key))
    .filter((option): option is SpecialOption => Boolean(option));
  const complete = selectedOptions.length === market.pickCount;
  const dirty =
    selectedKeys.join("|") !==
    Array.from({ length: market.pickCount }, (_, index) => market.predictions[index]?.key ?? "").join("|");
  const highlighted = useMemo(
    () => highlightSpecialOptions(market.key, market.options, 12),
    [market.key, market.options],
  );
  const filteredOptions = useMemo(
    () => visibleSpecialOptions(market.options, search, selectedKeys, market.key),
    [market.key, market.options, search, selectedKeys],
  );
  const visibleOptions = filteredOptions.slice(0, visibleCount);

  function chooseOption(option: SpecialOption) {
    if (market.locked || sync.busy) return;
    setSelectedKeys((current) => {
      const next = [...current];
      const selectedIndex = next.indexOf(option.key);
      if (selectedIndex >= 0) {
        next[selectedIndex] = "";
        return compactSelection(next, market.pickCount);
      }
      if (market.pickCount === 1) {
        return [option.key];
      }
      const emptyIndex = next.findIndex((key) => !key);
      if (emptyIndex >= 0) {
        next[emptyIndex] = option.key;
        return compactSelection(next, market.pickCount);
      }
      next[market.pickCount - 1] = option.key;
      return compactSelection(next, market.pickCount);
    });
    setSync({});
  }

  function removeOption(key: string) {
    setSelectedKeys((current) =>
      compactSelection(
        current.map((candidate) => (candidate === key ? "" : candidate)),
        market.pickCount,
      ),
    );
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
    <div className="space-y-7">
      <section className="card-dark overflow-hidden rounded-[2rem] p-5 text-white md:p-8">
        <Link
          href="/especiais"
          className="interactive inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white/80"
        >
          <ArrowLeft className="size-3.5" />
          Voltar aos especiais
        </Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.78fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-accent">
              <Icon className="size-4" />
              {display.eyebrow}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.06em] md:text-6xl">
              {display.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 md:text-base">
              {display.teaser} Você pode alterar até {SPECIAL_LOCK_DATE_LABEL}.
            </p>
          </div>
          <div className="rounded-[1.7rem] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
                {display.pickLabel}
              </span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black ${
                market.locked ? "status-neutral" : complete ? "status-success" : "status-warning"
              }`}>
                {market.locked ? "Bloqueado" : complete ? "Pronto" : "Pendente"}
              </span>
            </div>
            <div className="mt-4 min-h-32">
              {selectedOptions.length > 0 ? (
                <div className="grid gap-3">
                  {selectedOptions.map((option) => (
                    <SelectedOptionRow
                      key={option.key}
                      option={option}
                      locked={market.locked || Boolean(sync.busy)}
                      onRemove={() => removeOption(option.key)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-white/15 bg-black/10 p-4">
                  <p className="text-sm leading-6 text-white/68">{display.emptyDetail}</p>
                  <p className="mt-3 text-xs font-bold text-white/45">
                    Você salva agora e ainda pode trocar até {SPECIAL_LOCK_DATE_LABEL}.
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!complete || !dirty || market.locked || sync.busy}
              className="interactive mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-brand-strong shadow-lg shadow-black/10 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/45 disabled:shadow-none"
            >
              {sync.busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {market.predictions.length > 0 ? "Salvar alteração" : "Salvar palpite"}
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
          </div>
        </div>
      </section>

      {market.results.length > 0 && (
        <section className="card p-5">
          <p className="eyebrow">Resultado oficial</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {market.results.map((pick) => pick.label).join(", ")}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Resultado já confirmado pelo admin. Correções continuam auditadas.
          </p>
        </section>
      )}

      <section className="grid items-start gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card self-start p-5">
          <p className="eyebrow">Escolha com contexto</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {selectedOptions.length > 0 ? "Detalhes da sua escolha" : "Aguardando seleção"}
          </h2>
          <div className="mt-4 grid gap-3">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <OptionDetail key={option.key} option={option} />
              ))
            ) : (
              <p className="rounded-2xl border bg-surface-muted p-4 text-sm leading-6 text-muted">
                {display.emptyDetail}
              </p>
            )}
          </div>
        </div>

        <div className="card self-start p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="max-w-xl text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-brand">
                {display.dataNote}
              </p>
              <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight">
                {display.highlightTitle}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-[10px] font-black text-brand-strong">
              {highlighted.length} destaques
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {highlighted.map((option) => (
              <OptionCard
                key={option.key}
                option={option}
                selected={selectedKeys.includes(option.key)}
                disabled={market.locked || Boolean(sync.busy)}
                onSelect={() => chooseOption(option)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Lista completa</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Figurinhas disponíveis
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Mostrando {visibleOptions.length} de {filteredOptions.length} opções.
              Use a busca para ir direto ao jogador ou seleção.
            </p>
          </div>
          <div className="text-xs font-bold text-muted">
            Bloqueia: {localSpecialDateTime(market.lockAt)} · BRT
          </div>
        </div>
        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={display.searchPlaceholder}
            className="w-full rounded-2xl border bg-surface py-3 pl-10 pr-3 text-sm font-bold outline-none placeholder:text-muted focus:border-brand"
          />
        </label>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleOptions.map((option) => (
            <OptionCard
              key={option.key}
              option={option}
              selected={selectedKeys.includes(option.key)}
              disabled={market.locked || Boolean(sync.busy)}
              onSelect={() => chooseOption(option)}
            />
          ))}
        </div>
        {visibleOptions.length < filteredOptions.length && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + 60)}
              className="interactive min-h-11 rounded-2xl border bg-surface px-5 text-sm font-black text-brand hover:border-brand/70"
            >
              Mostrar mais figurinhas
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function OptionCard({
  option,
  selected,
  disabled,
  onSelect,
}: {
  option: SpecialOption;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`interactive flex min-h-36 w-full items-center gap-4 overflow-hidden rounded-2xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-brand bg-success-bg text-success-fg"
          : "bg-surface-muted hover:border-brand/70"
      }`}
    >
      <SpecialOptionSticker option={option} variant="thumb" selected={selected} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-black leading-tight text-foreground">
          {option.label}
        </span>
        <span className="mt-1 block line-clamp-1 text-xs font-bold text-muted">
          {option.description}
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {option.position && (
            <Chip>{positionLabel(option.position)}</Chip>
          )}
          {option.number !== undefined && <Chip>#{option.number}</Chip>}
          {option.goals !== undefined && <Chip>{option.goals} gols</Chip>}
          {option.caps !== undefined && <Chip>{option.caps} jogos</Chip>}
          {option.heightCm !== undefined && <Chip>{option.heightCm} cm</Chip>}
          {option.teamStats && option.teamStats.played > 0 && (
            <Chip>{option.teamStats.goalsFor} GP</Chip>
          )}
        </span>
      </span>
      {selected && <CheckCircle2 className="size-5 shrink-0 text-brand" />}
    </button>
  );
}

function SelectedOptionRow({
  option,
  locked,
  onRemove,
}: {
  option: SpecialOption;
  locked: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-[1.35rem] border border-white/15 bg-black/10 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <SpecialOptionAvatar option={option} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{option.label}</p>
        <p className="truncate text-xs text-white/58">{summarizeSpecialOption(option)}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-accent/85">
          {option.position ? `${positionLabel(option.position)} · camisa ${option.number}` : "Seleção"}
        </p>
      </div>
      {!locked && (
        <button
          type="button"
          onClick={onRemove}
          className="interactive rounded-full border border-white/15 bg-white/10 p-2 text-white/75"
          aria-label={`Remover ${option.label}`}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function OptionDetail({ option }: { option: SpecialOption }) {
  if (!option.position) {
    return (
      <div className="grid gap-4 rounded-[1.5rem] border bg-surface-muted p-4 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center md:block">
          <SpecialOptionSticker option={option} variant="feature" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">
            Seleção escolhida
          </p>
          <h3 className="mt-1 text-2xl font-black">{option.teamName}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            A figurinha da seleção usa a bandeira e a campanha atual. Para
            especiais de ataque/defesa, a confirmação final segue corrigível no admin.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <DetailStat label="Pontos" value={option.teamStats?.points ?? 0} />
            <DetailStat label="Jogos" value={option.teamStats?.played ?? 0} />
            <DetailStat label="Gols pró" value={option.teamStats?.goalsFor ?? 0} />
            <DetailStat label="Gols contra" value={option.teamStats?.goalsAgainst ?? 0} />
            <DetailStat label="Saldo" value={option.teamStats?.goalDifference ?? 0} />
            <DetailStat label="Vitórias" value={option.teamStats?.wins ?? 0} />
            <DetailStat label="Empates" value={option.teamStats?.draws ?? 0} />
            <DetailStat label="Derrotas" value={option.teamStats?.losses ?? 0} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border bg-surface-muted p-4">
      <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-start">
        <div className="flex justify-center md:block">
          <SpecialOptionSticker option={option} variant="feature" selected />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">
            {positionLabel(option.position)} · camisa {option.number}
          </p>
          <h3 className="mt-1 text-2xl font-black leading-tight">
            {option.fullName ?? option.label}
          </h3>
          <p className="mt-1 text-sm font-bold text-muted">{option.club}</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Figurinha autoral criada a partir do elenco oficial, sem foto real.
            Os dados históricos ajudam a escolher; eventos desta Copa entram
            quando forem confirmados.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <DetailStat label="Seleção" value={option.teamName} />
            <DetailStat label="Idade" value={option.age ? `${option.age} anos` : "—"} />
            <DetailStat label="Altura" value={option.heightCm ? `${option.heightCm} cm` : "—"} />
            <DetailStat label="Gols seleção" value={option.goals ?? 0} />
            <DetailStat label="Jogos seleção" value={option.caps ?? 0} />
            <DetailStat label="Clube" value={option.club ?? "—"} />
          </div>
        </div>
      </div>
      <CurrentPlayerStats />
      {option.teamStats && (
        <div className="mt-3 rounded-2xl border bg-surface p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
            Seleção nesta Copa
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <DetailStat label="Pontos" value={option.teamStats.points} compact />
            <DetailStat label="Jogos" value={option.teamStats.played} compact />
            <DetailStat label="Gols pró" value={option.teamStats.goalsFor} compact />
            <DetailStat label="Saldo" value={option.teamStats.goalDifference} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function CurrentPlayerStats() {
  return (
    <div className="mt-3 rounded-2xl border bg-surface p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
          Nesta Copa
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
          Aguardando eventos individuais
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <DetailStat label="Gols" value="—" compact />
        <DetailStat label="Assist." value="—" compact />
        <DetailStat label="Cartões" value="—" compact />
        <DetailStat label="Faltas" value="—" compact />
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-surface ${compact ? "p-2.5" : "p-3"}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border bg-surface px-2 py-0.5 text-[10px] font-black text-muted">
      {children}
    </span>
  );
}

function visibleSpecialOptions(
  options: SpecialOption[],
  search: string,
  selectedKeys: string[],
  marketKey: string,
) {
  const normalized = normalizeSearch(search);
  const selected = new Set(selectedKeys.filter(Boolean));
  const ordered = normalized ? options : highlightSpecialOptions(marketKey, options, options.length);
  const filtered = ordered.filter((option) => {
    if (!normalized) return true;
    return normalizeSearch(
      `${option.label} ${option.fullName ?? ""} ${option.teamName} ${option.club ?? ""}`,
    ).includes(normalized);
  });

  for (const key of selected) {
    const option = options.find((candidate) => candidate.key === key);
    if (option && !filtered.some((candidate) => candidate.key === key)) {
      filtered.unshift(option);
    }
  }

  return filtered;
}

function compactSelection(keys: string[], pickCount: number) {
  return [...keys.filter(Boolean), ...Array.from({ length: pickCount }, () => "")]
    .slice(0, pickCount);
}

function positionLabel(position: NonNullable<SpecialOption["position"]>) {
  return {
    GK: "Goleiro",
    DF: "Defensor",
    MF: "Meia",
    FW: "Atacante",
  }[position];
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
