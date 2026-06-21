"use client";

import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Save,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { CarouselRail } from "@/components/carousel-rail";
import {
  SpecialOptionAvatar,
  SpecialOptionSticker,
} from "@/components/special-sticker";
import { EmptyState } from "@/components/empty-state";
import { LinkPendingLabel } from "@/components/link-pending-feedback";
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
import { playerDetailInsight } from "@/lib/player-insights";
import { teamDetailInsight } from "@/lib/team-insights";
import type { SpecialMarketView } from "@/lib/data/specials";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";

type SyncState = {
  busy?: boolean;
  message?: string | null;
  ok?: boolean;
};

type NextMarketLink = {
  href: string;
  label: string;
} | null;

type DeckDrag = {
  pointerId?: number;
  startX?: number;
  offsetX?: number;
};

type SpecialOptionFilter = {
  value: string;
  label: string;
  count: number;
};

const INITIAL_VISIBLE_OPTIONS = 36;
const OPTIONS_PAGE_SIZE = 36;

export function SpecialMarketPicker({
  market,
  nextMarket = null,
}: {
  market: SpecialMarketView;
  nextMarket?: NextMarketLink;
}) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const display = specialMarketDisplay(market.key);
  const Icon = display.icon;
  const initialSelection = Array.from({ length: market.pickCount }, (_, index) => {
    return market.predictions[index]?.key ?? "";
  });
  const initialActiveKey =
    initialSelection.find(Boolean) ??
    highlightSpecialOptions(market.key, market.options, 1)[0]?.key ??
    market.options[0]?.key ??
    "";
  const optionByKey = useMemo(
    () => new Map(market.options.map((option) => [option.key, option])),
    [market.options],
  );
  const [selectedKeys, setSelectedKeys] = useState(initialSelection);
  const [activeKey, setActiveKey] = useState(initialActiveKey);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_OPTIONS);
  const [sync, setSync] = useState<SyncState>({});
  const [drag, setDrag] = useState<DeckDrag>({});
  const optionsSentinelRef = useRef<HTMLDivElement>(null);

  const selectedOptions = selectedKeys
    .map((key) => optionByKey.get(key))
    .filter((option): option is SpecialOption => Boolean(option));
  const complete = selectedOptions.length === market.pickCount;
  const dirty = selectedKeys.join("|") !== initialSelection.join("|");
  const highlighted = useMemo(
    () => highlightSpecialOptions(market.key, market.options, 18),
    [market.key, market.options],
  );
  const filterOptions = useMemo(
    () => specialFilterOptions(market.options, selectedKeys),
    [market.options, selectedKeys],
  );
  const effectiveFilter = filterOptions.some((option) => option.value === filter)
    ? filter
    : "all";
  const filteredOptions = useMemo(
    () => visibleSpecialOptions(market.options, search, selectedKeys, market.key, effectiveFilter),
    [effectiveFilter, market.key, market.options, search, selectedKeys],
  );
  const deckOptions = useMemo(() => {
    if (search.trim()) return filteredOptions;
    if (effectiveFilter !== "all") return filteredOptions;
    return highlighted.length > 0 ? highlighted : filteredOptions;
  }, [effectiveFilter, filteredOptions, highlighted, search]);
  const activeIndex = deckOptions.findIndex((option) => option.key === activeKey);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeOption = deckOptions[safeActiveIndex] ?? null;
  const activeSelected = activeOption
    ? selectedKeys.includes(activeOption.key)
    : false;
  const deckCanMove = deckOptions.length > 1;
  const dragOffset = drag.offsetX ?? 0;
  const dragRotation = Math.max(-10, Math.min(10, dragOffset / 12));
  const visibleOptions = filteredOptions.slice(0, visibleCount);
  const hiddenOptionCount = Math.max(0, filteredOptions.length - visibleOptions.length);
  const saveLabel = market.predictions.length > 0 ? "Salvar alteração" : "Salvar palpite";
  const canSave = complete && dirty && !market.locked && !sync.busy;
  const showStickySave = !market.locked && selectedOptions.length > 0;
  const showContinueLink = complete && !dirty && Boolean(nextMarket);
  const stickyOption = selectedOptions[0];
  const remainingChoices = Math.max(market.pickCount - selectedOptions.length, 0);
  const stickySummary = complete
    ? selectedOptions.map((option) => option.label).join(", ")
    : `${remainingChoices} escolha${remainingChoices === 1 ? "" : "s"} pendente${
        remainingChoices === 1 ? "" : "s"
      }`;
  const stickyTitle = !dirty && complete
    ? "Palpite salvo"
    : complete
      ? "Pronto para salvar"
      : "Complete o palpite";
  const deckRailOptions = nearbyDeckOptions(deckOptions, safeActiveIndex, 7);
  const loadMoreOptions = useCallback(() => {
    setVisibleCount((current) =>
      current >= filteredOptions.length
        ? current
        : Math.min(filteredOptions.length, current + OPTIONS_PAGE_SIZE),
    );
  }, [filteredOptions.length]);

  useEffect(() => {
    if (visibleOptions.length >= filteredOptions.length || !optionsSentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreOptions();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(optionsSentinelRef.current);
    return () => observer.disconnect();
  }, [filteredOptions.length, loadMoreOptions, visibleOptions.length]);

  function chooseOption(option: SpecialOption) {
    if (market.locked || sync.busy) return;
    setActiveKey(option.key);
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

  function moveDeck(direction: -1 | 1) {
    if (deckOptions.length === 0) return;
    const nextIndex = wrapIndex(safeActiveIndex + direction, deckOptions.length);
    setActiveKey(deckOptions[nextIndex].key);
    setDrag({});
  }

  function resetVisibleOptions() {
    setVisibleCount(INITIAL_VISIBLE_OPTIONS);
  }

  function clearSearch() {
    setSearch("");
    resetVisibleOptions();
  }

  function handleDeckKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveDeck(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveDeck(1);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && activeOption) {
      event.preventDefault();
      chooseOption(activeOption);
    }
  }

  function startDeckDrag(event: PointerEvent<HTMLDivElement>) {
    if (!deckCanMove) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ pointerId: event.pointerId, startX: event.clientX, offsetX: 0 });
  }

  function updateDeckDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.pointerId !== event.pointerId || drag.startX === undefined) return;
    setDrag((current) => {
      if (current.pointerId !== event.pointerId || current.startX === undefined) return current;
      return { ...current, offsetX: event.clientX - current.startX };
    });
  }

  function endDeckDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.pointerId !== event.pointerId) return;
    const offset = drag.offsetX ?? 0;
    setDrag({});
    if (Math.abs(offset) < 72) return;
    moveDeck(offset < 0 ? 1 : -1);
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
          "Não foi possível salvar este palpite final.",
        ),
      });
      navigator.vibrate?.([25, 30, 25]);
      return;
    }

    setSync({ busy: false, ok: true, message: "Palpite final salvo." });
    navigator.vibrate?.(20);
    router.refresh();
  }

  return (
    <div
      data-testid="special-market-picker"
      className={showStickySave ? "space-y-7 pb-32 md:pb-28" : "space-y-7"}
    >
      <section className="card-dark overflow-hidden rounded-[2rem] p-4 text-white md:p-5 lg:p-6">
        <Link
          href="/especiais"
          prefetch={false}
          className="interactive inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white/80"
        >
          <LinkPendingLabel pendingLabel="Voltando...">
            <ArrowLeft className="size-3.5" />
            Todos os finais
          </LinkPendingLabel>
        </Link>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="flex flex-col pt-1 lg:pt-2">
            <div className="inline-flex self-start items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-accent">
              <Icon className="size-4" />
              {display.eyebrow}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.06em] md:text-5xl xl:text-6xl">
              {display.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 md:text-base">
              {display.teaser} Passe as cartas, busque pelo nome e salve sua
              escolha até {SPECIAL_LOCK_DATE_LABEL}.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                {display.pickLabel}
              </p>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black ${
                market.locked ? "status-neutral" : complete ? "status-success" : "status-warning"
              }`}>
                {market.locked ? "Bloqueado" : complete ? "Completo" : "Pendente"}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${Math.round((selectedOptions.length / market.pickCount) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-bold text-white/70">
              {selectedOptions.length}/{market.pickCount} carta
              {market.pickCount === 1 ? "" : "s"} escolhida
              {market.pickCount === 1 ? "" : "s"}
            </p>
            {!complete ? (
              <p className="mt-1 text-xs font-bold text-white/55">
                {remainingChoices === 1 ? "Falta" : "Faltam"} {remainingChoices} carta
                {remainingChoices === 1 ? "" : "s"}.
              </p>
            ) : null}
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
            Resultado confirmado. Se houver correção oficial, a pontuação pode ser atualizada.
          </p>
        </section>
      )}

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="card overflow-hidden p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="eyebrow">
                {search.trim() ? "Resultado da busca" : "Baralho de destaques"}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                Passe as figurinhas
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveDeck(-1)}
                disabled={deckOptions.length < 2}
                className="interactive inline-flex size-11 items-center justify-center rounded-2xl border bg-surface text-brand disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Carta anterior"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => moveDeck(1)}
                disabled={deckOptions.length < 2}
                className="interactive inline-flex size-11 items-center justify-center rounded-2xl border bg-surface text-brand disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Próxima carta"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          {activeOption ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(15rem,0.9fr)_minmax(0,1fr)] lg:items-stretch">
              <div className="relative min-h-[24rem] overflow-hidden rounded-[1.7rem] border border-white/15 bg-brand-strong p-4 text-white">
                <div className="absolute left-5 top-6 h-72 w-44 rotate-[-10deg] rounded-[1.5rem] border border-white/10 bg-white/8" />
                <div className="absolute right-5 top-9 h-72 w-44 rotate-[10deg] rounded-[1.5rem] border border-white/10 bg-white/8" />
                <div
                  data-testid="special-active-card"
                  className="relative z-10 flex h-full min-h-[22rem] touch-pan-y select-none flex-col items-center justify-center gap-4 outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  tabIndex={0}
                  role="group"
                  aria-label={`Carta ${safeActiveIndex + 1} de ${Math.max(deckOptions.length, 1)}: ${activeOption.label}`}
                  onPointerDown={startDeckDrag}
                  onPointerMove={updateDeckDrag}
                  onPointerUp={endDeckDrag}
                  onPointerCancel={() => setDrag({})}
                  onKeyDown={handleDeckKeyDown}
                >
                  <span
                    aria-live="polite"
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-accent"
                  >
                    {safeActiveIndex + 1}/{Math.max(deckOptions.length, 1)}
                  </span>
                  <div
                    className="flex w-full max-w-[22rem] justify-center transition-transform duration-150 ease-out"
                    style={{
                      transform: `translateX(${dragOffset}px) rotate(${dragRotation}deg)`,
                      transitionDuration: drag.pointerId ? "0ms" : "150ms",
                    }}
                  >
                    <SpecialOptionSticker
                      option={activeOption}
                      variant="feature"
                      selected={activeSelected}
                    />
                  </div>
                  {activeSelected ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-black text-brand-strong">
                      <CheckCircle2 className="size-4" />
                      Na sua seleção
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col rounded-[1.5rem] border bg-surface-muted p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
                      {optionTypeLabel(activeOption)}
                    </p>
                    <h3 className="mt-1 text-3xl font-black leading-tight tracking-tight">
                      {activeOption.fullName ?? activeOption.label}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-muted">
                      {summarizeSpecialOption(activeOption)}
                    </p>
                  </div>
                  <Sparkles className="size-5 shrink-0 text-brand" />
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">
                  {activeOption.position
                    ? shortPlayerInsight(activeOption)
                    : shortTeamInsight(activeOption)}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <DeckMetric label="Seleção" value={activeOption.teamName} />
                  <DeckMetric
                    label={activeOption.position ? "Posição" : "Grupo"}
                    value={
                      activeOption.position
                        ? positionLabel(activeOption.position)
                        : activeOption.groupName ?? "—"
                    }
                  />
                  <DeckMetric
                    label={activeOption.position ? "Camisa" : "Gols pró"}
                    value={activeOption.position ? `#${activeOption.number ?? "—"}` : activeOption.teamStats?.goalsFor ?? "—"}
                  />
                  <DeckMetric
                    label={activeOption.position ? "Experiência" : "Pontos"}
                    value={activeOption.position ? `${activeOption.caps ?? 0} jogos` : activeOption.teamStats?.points ?? "—"}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => chooseOption(activeOption)}
                  disabled={market.locked || Boolean(sync.busy)}
                  className={`interactive mt-auto inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55 ${
                    activeSelected
                      ? "border bg-surface text-danger-fg"
                      : "bg-accent text-brand-strong shadow-lg shadow-black/10"
                  }`}
                >
                  {activeSelected ? <X className="size-4" /> : <CheckCircle2 className="size-4" />}
                  {choiceButtonLabel({
                    activeSelected,
                    complete,
                    pickCount: market.pickCount,
                    selectedCount: selectedOptions.length,
                  })}
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Nenhuma carta disponível"
              description="Ainda não há opções publicadas para este palpite final neste ambiente."
              className="mt-4"
            />
          )}

          {deckRailOptions.length > 1 ? (
            <DeckRail
              options={deckRailOptions}
              activeKey={activeOption?.key ?? ""}
              selectedKeys={selectedKeys}
              onSelect={(option) => setActiveKey(option.key)}
            />
          ) : null}
        </div>

        <aside className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Sua seleção</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                {complete ? "Pronta para salvar" : `${remainingChoices} pendente${remainingChoices === 1 ? "" : "s"}`}
              </h2>
            </div>
            <span className="rounded-full border bg-surface-muted px-3 py-1 text-xs font-black text-muted">
              {selectedOptions.length}/{market.pickCount}
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {Array.from({ length: market.pickCount }, (_, index) => {
              const option = selectedOptions[index];
              return option ? (
                <SelectedOptionRow
                  key={option.key}
                  option={option}
                  locked={market.locked || Boolean(sync.busy)}
                  onRemove={() => removeOption(option.key)}
                  featured={market.pickCount === 1}
                />
              ) : (
                <EmptySelectionSlot key={`empty-${index}`} index={index} displayLabel={display.pickLabel} />
              );
            })}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="interactive mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-brand-strong shadow-lg shadow-black/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:shadow-none"
          >
            {sync.busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saveLabel}
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
          {sync.ok && nextMarket ? (
            <Link
              href={nextMarket.href}
              prefetch={false}
              className="interactive mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border bg-surface px-4 text-sm font-black text-brand hover:border-brand/70"
            >
              <LinkPendingLabel pendingLabel="Abrindo próximo...">
                Próximo final: {nextMarket.label}
                <ArrowRight className="size-4" />
              </LinkPendingLabel>
            </Link>
          ) : null}
          {showContinueLink && nextMarket && !sync.ok ? (
            <Link
              href={nextMarket.href}
              prefetch={false}
              className="interactive mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border bg-surface px-4 text-sm font-black text-brand hover:border-brand/70"
            >
              <LinkPendingLabel pendingLabel="Abrindo próximo...">
                Continuar: {nextMarket.label}
                <ArrowRight className="size-4" />
              </LinkPendingLabel>
            </Link>
          ) : null}
        </aside>
      </section>

      <section className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Busca rápida</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Todas as figurinhas
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Mostrando {visibleOptions.length} de {filteredOptions.length} opções.
            </p>
          </div>
          <div className="text-xs font-bold text-muted">
            Bloqueia: {localSpecialDateTime(market.lockAt)} · BRT
          </div>
        </div>
        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            data-testid="special-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetVisibleOptions();
            }}
            placeholder={display.searchPlaceholder}
            className="w-full rounded-2xl border bg-surface py-3 pl-10 pr-12 text-sm font-bold outline-none placeholder:text-muted focus:border-brand"
          />
          {search.trim() ? (
            <button
              type="button"
              onClick={clearSearch}
              className="interactive absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted hover:bg-surface-muted hover:text-brand"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </label>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <QuickSearchMetric label="Visíveis" value={visibleOptions.length} />
          <QuickSearchMetric label="Selecionadas" value={selectedOptions.length} />
          <QuickSearchMetric label="Escondidas" value={hiddenOptionCount} />
        </div>
        <CarouselRail
          ariaLabel="Filtros de cartas especiais"
          centerMode={false}
          className="-mx-1 mt-3 px-1"
          trackClassName="auto-cols-max gap-2"
        >
          {filterOptions.map((option) => {
            const active = option.value === effectiveFilter;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setFilter(option.value);
                  resetVisibleOptions();
                }}
                aria-pressed={active}
                className={`interactive inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-black ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "bg-surface text-muted hover:border-brand/70 hover:text-brand"
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    active ? "bg-white/20 text-white" : "bg-surface-muted text-muted"
                  }`}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </CarouselRail>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleOptions.map((option) => (
            <OptionCard
              key={option.key}
              option={option}
              selected={selectedKeys.includes(option.key)}
              disabled={market.locked || Boolean(sync.busy)}
              onSelect={() => {
                setActiveKey(option.key);
                chooseOption(option);
              }}
            />
          ))}
        </div>
        {visibleOptions.length < filteredOptions.length ? (
          <div ref={optionsSentinelRef} aria-hidden="true" className="h-px" />
        ) : null}
        {filteredOptions.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhuma figurinha encontrada"
            description="Limpe a busca ou escolha outro filtro para voltar ao baralho completo."
            className="mt-4"
          >
            <button
              type="button"
              onClick={clearSearch}
              className="interactive inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-black text-white"
            >
              Limpar busca
            </button>
          </EmptyState>
        ) : null}
        {visibleOptions.length < filteredOptions.length && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={loadMoreOptions}
              className="interactive min-h-11 rounded-2xl border bg-surface px-5 text-sm font-black text-brand hover:border-brand/70"
            >
              Mostrar mais figurinhas ({hiddenOptionCount})
            </button>
          </div>
        )}
      </section>

      {selectedOptions.length > 0 ? (
        <section className="card p-5">
          <p className="eyebrow">Análise das cartas escolhidas</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Detalhes do seu palpite
          </h2>
          <div className="mt-4 grid gap-3">
            {selectedOptions.map((option) => (
              <OptionDetail key={option.key} marketKey={market.key} option={option} />
            ))}
          </div>
        </section>
      ) : null}

      {showStickySave && stickyOption ? (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-40 px-4 md:bottom-5 md:left-auto md:right-5 md:w-[min(34rem,calc(100vw-2rem))]">
          <div className="rounded-[1.4rem] border border-white/15 bg-brand-strong/95 p-3 text-white shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <SpecialOptionAvatar option={stickyOption} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-accent">
                  {stickyTitle}
                </p>
                <p className="truncate text-sm font-black">{stickySummary}</p>
              </div>
              <button
                type="button"
                onClick={save}
                disabled={!canSave}
                className="interactive inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-xs font-black text-brand-strong shadow-lg shadow-black/15 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/45 disabled:shadow-none"
              >
                {sync.busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar
              </button>
            </div>
            {sync.message ? (
              <p
                aria-live="polite"
                className={`mt-2 text-xs font-bold ${sync.ok ? "text-accent" : "text-orange-200"}`}
              >
                {sync.message}
              </p>
            ) : null}
            {sync.ok && nextMarket ? (
              <Link
                href={nextMarket.href}
                prefetch={false}
                className="interactive mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-black text-white"
              >
                <LinkPendingLabel pendingLabel="Abrindo próximo...">
                  Ir para {nextMarket.label}
                  <ArrowRight className="size-3.5" />
                </LinkPendingLabel>
              </Link>
            ) : null}
            {showContinueLink && nextMarket && !sync.ok ? (
              <Link
                href={nextMarket.href}
                prefetch={false}
                className="interactive mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-black text-white"
              >
                <LinkPendingLabel pendingLabel="Abrindo próximo...">
                  Continuar: {nextMarket.label}
                  <ArrowRight className="size-3.5" />
                </LinkPendingLabel>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuickSearchMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-surface-muted px-3 py-2">
      <p className="text-lg font-black text-brand">{value}</p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
    </div>
  );
}

function DeckRail({
  options,
  activeKey,
  selectedKeys,
  onSelect,
}: {
  options: SpecialOption[];
  activeKey: string;
  selectedKeys: string[];
  onSelect: (option: SpecialOption) => void;
}) {
  return (
    <CarouselRail
      ariaLabel="Baralho de opções especiais"
      className="-mx-4 mt-4 px-4 md:-mx-5 md:px-5"
      trackClassName="auto-cols-[7rem] gap-2"
    >
      {options.map((option) => {
        const active = option.key === activeKey;
        const selected = selectedKeys.includes(option.key);
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option)}
            aria-current={active ? "true" : undefined}
            className={`interactive grid w-28 shrink-0 gap-2 rounded-2xl border p-2 text-left ${
              active
                ? "border-brand bg-surface text-brand shadow-sm"
                : selected
                  ? "border-success-line bg-success-bg text-success-fg"
                  : "bg-surface-muted text-muted hover:border-brand/70"
            }`}
          >
            <span className="flex justify-center">
              <SpecialOptionAvatar option={option} size="md" />
            </span>
            <span className="line-clamp-2 min-h-8 text-center text-[11px] font-black leading-4">
              {option.label}
            </span>
          </button>
        );
      })}
    </CarouselRail>
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
      className={`interactive relative grid min-h-32 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-2xl border p-3 pr-10 text-left disabled:cursor-not-allowed disabled:opacity-60 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:pr-3 ${
        selected
          ? "border-brand bg-success-bg text-success-fg"
          : "bg-surface-muted hover:border-brand/70"
      }`}
    >
      <SpecialOptionSticker
        option={option}
        variant="thumb"
        selected={selected}
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-black leading-tight text-foreground">
          {option.label}
        </span>
        <span className="mt-1 block line-clamp-2 text-xs font-bold leading-4 text-muted">
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
      {selected && (
        <CheckCircle2 className="absolute right-3 top-1/2 size-5 shrink-0 -translate-y-1/2 text-brand sm:static sm:translate-y-0" />
      )}
    </button>
  );
}

function SelectedOptionRow({
  option,
  locked,
  onRemove,
  featured = false,
}: {
  option: SpecialOption;
  locked: boolean;
  onRemove: () => void;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <div className="relative grid gap-3 rounded-[1.35rem] border bg-surface-muted p-3 pr-12 sm:grid-cols-[auto_1fr] sm:items-center">
        <SpecialOptionSticker option={option} variant="card" selected />
        <div className="min-w-0">
          <p className="text-lg font-black leading-tight">{option.label}</p>
          <p className="mt-1 text-sm font-bold text-muted">
            {summarizeSpecialOption(option)}
          </p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
            {option.position ? `${positionLabel(option.position)} · camisa ${option.number}` : "Seleção"}
          </p>
          <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted">
            {option.position ? shortPlayerInsight(option) : shortTeamInsight(option)}
          </p>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            className="interactive absolute right-3 top-3 rounded-full border bg-surface p-2 text-muted"
            aria-label={`Remover ${option.label}`}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative grid gap-3 rounded-[1.35rem] border bg-surface-muted p-3 pr-12 sm:grid-cols-[auto_1fr] sm:items-center">
      <SpecialOptionAvatar option={option} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{option.label}</p>
        <p className="truncate text-xs text-muted">{summarizeSpecialOption(option)}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
          {option.position ? `${positionLabel(option.position)} · camisa ${option.number}` : "Seleção"}
        </p>
      </div>
      {!locked && (
        <button
          type="button"
          onClick={onRemove}
          className="interactive absolute right-3 top-3 rounded-full border bg-surface p-2 text-muted"
          aria-label={`Remover ${option.label}`}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function EmptySelectionSlot({
  index,
  displayLabel,
}: {
  index: number;
  displayLabel: string;
}) {
  return (
    <div className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[1.35rem] border border-dashed bg-surface-muted p-3">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl border bg-surface text-sm font-black text-muted">
        {index + 1}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-muted">Escolha pendente</p>
        <p className="truncate text-xs font-bold text-muted">{displayLabel}</p>
      </div>
    </div>
  );
}

function OptionDetail({
  marketKey,
  option,
}: {
  marketKey: string;
  option: SpecialOption;
}) {
  if (!option.position) {
    return (
      <div className="rounded-[1.5rem] border bg-surface-muted p-4 md:p-5">
        <div className="grid gap-5">
          <div className="w-full">
            <SpecialOptionSticker option={option} variant="feature" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">
              Seleção escolhida
            </p>
            <h3 className="mt-1 text-2xl font-black md:text-3xl">{option.teamName}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              {teamDetailInsight(option, marketKey)}
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border bg-surface p-3 md:p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
            Dados da seleção nesta Copa
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <DetailStat label="Pontos" value={option.teamStats?.points ?? 0} compact />
            <DetailStat label="Jogos" value={option.teamStats?.played ?? 0} compact />
            <DetailStat label="Gols pró" value={option.teamStats?.goalsFor ?? 0} compact />
            <DetailStat label="Gols contra" value={option.teamStats?.goalsAgainst ?? 0} compact />
            <DetailStat label="Saldo" value={option.teamStats?.goalDifference ?? 0} compact />
            <DetailStat label="Vitórias" value={option.teamStats?.wins ?? 0} compact />
            <DetailStat label="Empates" value={option.teamStats?.draws ?? 0} compact />
            <DetailStat label="Derrotas" value={option.teamStats?.losses ?? 0} compact />
          </div>
        </div>
        <div className="mt-3 rounded-2xl border bg-surface p-3 md:p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
            Elenco oficial
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <DetailStat label="Grupo" value={option.groupName ?? "—"} compact />
            <DetailStat
              label="Artilheiro elenco"
              value={
                option.squadTopScorer && option.squadTopScorerGoals !== undefined
                  ? `${option.squadTopScorer} · ${option.squadTopScorerGoals}`
                  : "—"
              }
              compact
            />
            <DetailStat
              label="Mais jogos"
              value={
                option.squadMostCapped && option.squadMostCappedCaps !== undefined
                  ? `${option.squadMostCapped} · ${option.squadMostCappedCaps}`
                  : "—"
              }
              compact
            />
            <DetailStat
              label="Médias"
              value={
                option.squadAverageAge && option.squadAverageHeight
                  ? `${option.squadAverageAge} anos · ${option.squadAverageHeight} cm`
                  : "—"
              }
              compact
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border bg-surface-muted p-4 md:p-5">
      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <div className="flex justify-center lg:block">
          <SpecialOptionSticker option={option} variant="feature" selected />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">
            {positionLabel(option.position)} · camisa {option.number}
          </p>
          <h3 className="mt-1 text-2xl font-black leading-tight md:text-3xl">
            {option.fullName ?? option.label}
          </h3>
          <p className="mt-1 text-sm font-bold text-muted">{option.club}</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {playerDetailInsight(option)}
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border bg-surface p-3 md:p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
          Dados do atleta
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <DetailStat label="Seleção" value={option.teamName} compact />
          <DetailStat label="Idade" value={option.age ? `${option.age} anos` : "—"} compact />
          <DetailStat label="Altura" value={option.heightCm ? `${option.heightCm} cm` : "—"} compact />
          <DetailStat label="Gols seleção" value={option.goals ?? 0} compact />
          <DetailStat label="Jogos seleção" value={option.caps ?? 0} compact />
          <DetailStat label="Clube" value={option.club ?? "—"} compact />
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
      <p className="mt-1 break-words text-sm font-black leading-tight">{value}</p>
    </div>
  );
}

function DeckMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-surface p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-black leading-tight">{value}</p>
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

function choiceButtonLabel({
  activeSelected,
  complete,
  pickCount,
  selectedCount,
}: {
  activeSelected: boolean;
  complete: boolean;
  pickCount: number;
  selectedCount: number;
}) {
  if (activeSelected) return "Remover carta";
  if (pickCount === 1 && selectedCount > 0) return "Trocar por esta carta";
  if (complete) return "Trocar última por esta carta";
  return "Escolher esta carta";
}

function optionTypeLabel(option: SpecialOption) {
  if (!option.position) return "Seleção";
  return positionLabel(option.position);
}

function shortPlayerInsight(option: SpecialOption) {
  if (!option.position) return shortTeamInsight(option);
  const goals = option.goals ?? 0;
  const caps = option.caps ?? 0;
  const group = option.groupName ? `${option.groupName}. ` : "";
  if (option.position === "GK") {
    return `${group}${option.heightCm ?? "—"} cm, ${caps} jogos pela seleção. Boa leitura para Luva de Ouro.`;
  }
  return `${group}${goals} gols e ${caps} jogos pela seleção. ${positionLabel(option.position)} com peso no palpite.`;
}

function shortTeamInsight(option: SpecialOption) {
  const stats = option.teamStats;
  const group = option.groupName ? `${option.groupName}. ` : "";
  if (!stats || stats.played === 0) {
    return `${group}${option.squadTopScorer ? `${option.squadTopScorer} lidera o elenco em gols.` : "Campanha a começar."}`;
  }
  return `${group}${stats.goalsFor} gols pró, ${stats.goalsAgainst} contra e ${stats.points} ponto(s).`;
}

function visibleSpecialOptions(
  options: SpecialOption[],
  search: string,
  selectedKeys: string[],
  marketKey: string,
  filter: string,
) {
  const normalized = normalizeSearch(search);
  const selected = new Set(selectedKeys.filter(Boolean));
  const ordered = normalized ? options : highlightSpecialOptions(marketKey, options, options.length);
  const filtered = ordered.filter((option) => {
    if (!matchesSpecialFilter(option, filter, selected)) return false;
    if (!normalized) return true;
    return normalizeSearch(
      `${option.label} ${option.fullName ?? ""} ${option.teamName} ${option.club ?? ""}`,
    ).includes(normalized);
  });

  for (const key of filter === "all" && !normalized ? selected : []) {
    const option = options.find((candidate) => candidate.key === key);
    if (option && !filtered.some((candidate) => candidate.key === key)) {
      filtered.unshift(option);
    }
  }

  return filtered;
}

function specialFilterOptions(
  options: SpecialOption[],
  selectedKeys: string[],
): SpecialOptionFilter[] {
  const selectedCount = selectedKeys.filter(Boolean).length;
  const filters: SpecialOptionFilter[] = [
    { value: "all", label: "Todos", count: options.length },
  ];

  if (selectedCount > 0) {
    filters.push({ value: "selected", label: "Escolhidos", count: selectedCount });
  }

  const positionCounts = new Map<NonNullable<SpecialOption["position"]>, number>();
  const groupCounts = new Map<string, number>();
  for (const option of options) {
    if (option.position) {
      positionCounts.set(option.position, (positionCounts.get(option.position) ?? 0) + 1);
    } else if (option.groupName) {
      groupCounts.set(option.groupName, (groupCounts.get(option.groupName) ?? 0) + 1);
    }
  }

  for (const position of ["GK", "DF", "MF", "FW"] as const) {
    const count = positionCounts.get(position);
    if (count) {
      filters.push({
        value: `position:${position}`,
        label: positionLabel(position),
        count,
      });
    }
  }

  for (const [groupName, count] of [...groupCounts].sort((left, right) =>
    left[0].localeCompare(right[0], "pt-BR"),
  )) {
    filters.push({
      value: `group:${groupName}`,
      label: groupName.replace("Grupo ", "G"),
      count,
    });
  }

  return filters;
}

function matchesSpecialFilter(
  option: SpecialOption,
  filter: string,
  selected: Set<string>,
) {
  if (filter === "all") return true;
  if (filter === "selected") return selected.has(option.key);
  if (filter.startsWith("position:")) {
    return option.position === filter.replace("position:", "");
  }
  if (filter.startsWith("group:")) {
    return option.groupName === filter.replace("group:", "");
  }
  return true;
}

function nearbyDeckOptions(
  options: SpecialOption[],
  activeIndex: number,
  limit: number,
) {
  if (options.length <= limit) return options;
  const safeIndex = Math.max(0, Math.min(activeIndex, options.length - 1));
  const radius = Math.floor(limit / 2);
  let start = Math.max(0, safeIndex - radius);
  let end = start + limit;
  if (end > options.length) {
    end = options.length;
    start = Math.max(0, end - limit);
  }
  return options.slice(start, end);
}

function compactSelection(keys: string[], pickCount: number) {
  return [...keys.filter(Boolean), ...Array.from({ length: pickCount }, () => "")]
    .slice(0, pickCount);
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
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
