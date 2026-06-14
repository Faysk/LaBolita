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
      <section className="card-dark overflow-hidden rounded-[2rem] p-4 text-white md:p-5 lg:p-6">
        <Link
          href="/especiais"
          className="interactive inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white/80"
        >
          <LinkPendingLabel pendingLabel="Voltando...">
            <ArrowLeft className="size-3.5" />
            Voltar aos especiais
          </LinkPendingLabel>
        </Link>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:items-center">
          <div className="flex flex-col justify-center py-1">
            <div className="inline-flex self-start items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-accent">
              <Icon className="size-4" />
              {display.eyebrow}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.06em] md:text-5xl xl:text-6xl">
              {display.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 md:text-base">
              {display.teaser} Você pode alterar até {SPECIAL_LOCK_DATE_LABEL}.
            </p>
          </div>
          <div className="flex flex-col rounded-[1.7rem] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/10 md:p-5">
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
            <div className="mt-4 flex-1">
              {selectedOptions.length > 0 ? (
                <div className="grid gap-3">
                  {selectedOptions.map((option) => (
                    <SelectedOptionRow
                      key={option.key}
                      option={option}
                      locked={market.locked || Boolean(sync.busy)}
                      onRemove={() => removeOption(option.key)}
                      featured={market.pickCount === 1}
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
            Resultado confirmado. Se houver correção oficial, a pontuação pode ser atualizada.
          </p>
        </section>
      )}

      <section className="grid items-start gap-5 lg:grid-cols-[1.25fr_0.95fr]">
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
          <div className="mt-4 grid gap-3">
            {highlighted.map((option) => (
              <OptionCard
                key={option.key}
                option={option}
                selected={selectedKeys.includes(option.key)}
                disabled={market.locked || Boolean(sync.busy)}
                density="highlight"
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
  density = "default",
  onSelect,
}: {
  option: SpecialOption;
  selected: boolean;
  disabled: boolean;
  density?: "default" | "highlight";
  onSelect: () => void;
}) {
  const highlight = density === "highlight";
  const layoutClass = highlight
    ? "min-h-24 grid-cols-[3rem_minmax(0,1fr)_auto] gap-4 p-3"
    : "min-h-32 grid-cols-[6rem_minmax(0,1fr)] gap-4 p-3 pr-10 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:pr-3";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`interactive relative grid w-full items-center overflow-hidden rounded-2xl border text-left disabled:cursor-not-allowed disabled:opacity-60 ${layoutClass} ${
        selected
          ? "border-brand bg-success-bg text-success-fg"
          : "bg-surface-muted hover:border-brand/70"
      }`}
    >
      <SpecialOptionSticker
        option={option}
        variant={highlight ? "avatar" : "thumb"}
        selected={selected}
      />
      <span className="min-w-0 flex-1">
        <span className={`${highlight ? "line-clamp-1" : "line-clamp-2"} text-sm font-black leading-tight text-foreground`}>
          {option.label}
        </span>
        <span className={`${highlight ? "mt-0.5" : "mt-1"} block line-clamp-2 text-xs font-bold leading-4 text-muted`}>
          {option.description}
        </span>
        <span className={`${highlight ? "mt-1.5" : "mt-2"} flex flex-wrap gap-1.5`}>
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
        <CheckCircle2
          className={`size-5 shrink-0 text-brand ${
            highlight
              ? ""
              : "absolute right-3 top-1/2 -translate-y-1/2 sm:static sm:translate-y-0"
          }`}
        />
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
      <div className="relative grid gap-4 rounded-[1.35rem] border border-white/15 bg-black/10 p-3 pr-12 sm:grid-cols-[auto_1fr] sm:items-center">
        <SpecialOptionSticker option={option} variant="card" selected />
        <div className="min-w-0">
          <p className="text-lg font-black leading-tight">{option.label}</p>
          <p className="mt-1 text-sm font-bold text-white/62">
            {summarizeSpecialOption(option)}
          </p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-accent">
            {option.position ? `${positionLabel(option.position)} · camisa ${option.number}` : "Seleção"}
          </p>
          <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/62">
            {option.position ? shortPlayerInsight(option) : shortTeamInsight(option)}
          </p>
        </div>
        {!locked && (
          <button
            type="button"
            onClick={onRemove}
            className="interactive absolute right-3 top-3 rounded-full border border-white/15 bg-white/10 p-2 text-white/75"
            aria-label={`Remover ${option.label}`}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative grid gap-3 rounded-[1.35rem] border border-white/15 bg-black/10 p-3 pr-12 sm:grid-cols-[auto_1fr] sm:items-center">
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
          className="interactive absolute right-3 top-3 rounded-full border border-white/15 bg-white/10 p-2 text-white/75"
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
      <div className="rounded-[1.5rem] border bg-surface-muted p-4 md:p-5">
        <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          <div className="flex justify-center lg:block">
            <SpecialOptionSticker option={option} variant="feature" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">
              Seleção escolhida
            </p>
            <h3 className="mt-1 text-2xl font-black md:text-3xl">{option.teamName}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              {teamInsight(option)}
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

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border bg-surface px-2 py-0.5 text-[10px] font-black text-muted">
      {children}
    </span>
  );
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

function teamInsight(option: SpecialOption) {
  const stats = option.teamStats;
  const group = option.groupName ? `${option.groupName}. ` : "";
  const squadContext = [
    option.squadTopScorer && option.squadTopScorerGoals !== undefined
      ? `Principal artilheiro do elenco: ${option.squadTopScorer}, ${option.squadTopScorerGoals} gols.`
      : null,
    option.squadMostCapped && option.squadMostCappedCaps !== undefined
      ? `Mais experiente: ${option.squadMostCapped}, ${option.squadMostCappedCaps} jogos.`
      : null,
    option.squadAverageAge && option.squadAverageHeight
      ? `Média do elenco: ${option.squadAverageAge} anos e ${option.squadAverageHeight} cm.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
  if (!stats || stats.played === 0) {
    return `${group}${option.teamName} ainda começa sua campanha nesta Copa. ${squadContext} Para especiais de ataque, defesa e caminho até a final, o valor está no potencial antes da tendência ficar clara.`;
  }
  return `${group}${option.teamName} soma ${stats.points} ponto(s), ${stats.goalsFor} gol(s) pró e ${stats.goalsAgainst} contra em ${stats.played} jogo(s). ${squadContext} Esse recorte ajuda a ler ataque, defesa e força de campanha antes do resultado final.`;
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
