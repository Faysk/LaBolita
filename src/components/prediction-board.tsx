"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Layers3,
  ListChecks,
  Target,
  Trophy,
} from "lucide-react";
import { MatchCard, predictionMatchCardId } from "@/components/match-card";
import { PoolFlag } from "@/components/pool-flag";
import { ProgressiveList } from "@/components/progressive-list";
import { TeamFlag } from "@/components/team-flag";
import { UserAvatar } from "@/components/user-avatar";
import { useLocalPredictions, useLocalResults } from "@/lib/local-state";
import {
  initialPredictionFilter,
  isLiveMatch,
  type PredictionFilter,
} from "@/lib/match-display";
import {
  buildDemoMatchComparisons,
  predictionLabel,
  type MatchPoolComparison,
  type PredictionComparisonOverview,
  type PredictionComparisonEntry,
} from "@/lib/prediction-comparisons";
import { calculateScore } from "@/lib/scoring";
import type { DemoMatch, MatchResult, ScoreBreakdown, ScorePrediction } from "@/lib/types";

export function PredictionBoard({
  matches,
  comparisonOverview,
  focusMatchId,
}: {
  matches: DemoMatch[];
  comparisonOverview: PredictionComparisonOverview;
  focusMatchId?: string;
}) {
  const predictions = useLocalPredictions(matches);
  const results = useLocalResults();
  const focusedMatch = focusMatchId
    ? matches.find((match) => match.id === focusMatchId)
    : undefined;
  const resolvedFocusMatchId = focusedMatch?.id;
  const [filter, setFilter] = useState<PredictionFilter>(() =>
    focusedMatch ? "all" : initialPredictionFilter(matches),
  );
  const [grouping, setGrouping] = useState<"stage" | "date">("date");
  const isComplete = (match: DemoMatch) =>
    Boolean(match.prediction) || Boolean(predictions[match.id]);
  const resultForMatch = (match: DemoMatch) => results[match.id] ?? match.result;
  const openMatches = matches.filter(
    (match) => !match.locked && !match.result && !results[match.id],
  );
  const pendingMatches = openMatches.filter((match) => !isComplete(match));
  const liveMatches = matches.filter(isLiveMatch);
  const finishedMatches = matches.filter(
    (match) =>
      match.locked ||
      Boolean(resultForMatch(match)) ||
      match.providerStatus === "finished",
  );
  const focusedFinishedMatch = focusedMatch
    ? finishedMatches.find((match) => match.id === focusedMatch.id)
    : undefined;
  const focusedFinishedMatchId = focusedFinishedMatch?.id ?? null;
  const [selectedFinishedMatchId, setSelectedFinishedMatchId] = useState(
    () => focusedFinishedMatchId ?? finishedMatches[0]?.id ?? "",
  );
  const selectedFinishedMatch =
    finishedMatches.find((match) => match.id === selectedFinishedMatchId) ??
    finishedMatches[0] ??
    null;
  const selectedFinishedPrediction = selectedFinishedMatch
    ? predictions[selectedFinishedMatch.id] ?? selectedFinishedMatch.prediction ?? null
    : null;
  const selectedFinishedResult = selectedFinishedMatch
    ? resultForMatch(selectedFinishedMatch) ?? selectedFinishedMatch.liveResult ?? undefined
    : undefined;
  const selectedComparisons = useMemo(() => {
    if (!selectedFinishedMatch) return [];
    const serverComparisons =
      comparisonOverview.comparisonsByMatch[selectedFinishedMatch.id] ?? [];
    if (comparisonOverview.source === "supabase") return serverComparisons;
    return buildDemoMatchComparisons({
      match: selectedFinishedMatch,
      result: selectedFinishedResult,
      currentPrediction: selectedFinishedPrediction,
    });
  }, [
    comparisonOverview,
    selectedFinishedMatch,
    selectedFinishedPrediction,
    selectedFinishedResult,
  ]);
  const filters: [PredictionFilter, string][] = [
    ...(liveMatches.length > 0 ? [["live", "Ao vivo"] as [PredictionFilter, string]] : []),
    ["pending", "Pendentes"],
    ["all", "Todos"],
    ["saved", "Salvos"],
    ["group", "Grupos"],
    ["knockout", "Mata-mata"],
    ["locked", "Finalizados"],
  ];

  const visibleMatches = matches.filter((match) => {
    if (filter === "live") return isLiveMatch(match);
    if (filter === "pending") {
      return (
        !isComplete(match) &&
        !match.locked &&
        !match.result &&
        !results[match.id]
      );
    }
    if (filter === "saved") return isComplete(match);
    if (filter === "group") return match.stage === "group";
    if (filter === "knockout") return match.stage !== "group";
    if (filter === "locked") {
      return match.locked || Boolean(match.result) || Boolean(results[match.id]);
    }
    return true;
  });
  const groups = groupMatches(visibleMatches, grouping);

  useEffect(() => {
    if (!resolvedFocusMatchId) return;

    let scrollFrame: number | undefined;
    const filterFrame = window.requestAnimationFrame(() => {
      if (focusedFinishedMatchId) {
        setSelectedFinishedMatchId(focusedFinishedMatchId);
      }
      setFilter((currentFilter) =>
        currentFilter === "all" ? currentFilter : "all",
      );
      scrollFrame = window.requestAnimationFrame(() => {
        const element = document.getElementById(
          predictionMatchCardId(resolvedFocusMatchId),
        );
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
        element?.focus({ preventScroll: true });
      });
    });

    return () => {
      window.cancelAnimationFrame(filterFrame);
      if (scrollFrame !== undefined) {
        window.cancelAnimationFrame(scrollFrame);
      }
    };
  }, [focusedFinishedMatchId, resolvedFocusMatchId]);

  return (
    <>
      {finishedMatches.length > 0 && selectedFinishedMatch ? (
        <FinishedMatchesReview
          matches={finishedMatches}
          selectedMatch={selectedFinishedMatch}
          selectedPrediction={selectedFinishedPrediction}
          selectedResult={selectedFinishedResult}
          comparisons={selectedComparisons}
          comparisonSource={comparisonOverview.source}
          onSelectMatch={setSelectedFinishedMatchId}
        />
      ) : null}

      <section className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="card flex gap-2 overflow-x-auto p-2" aria-label="Filtros de palpites">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${
                filter === value ? "bg-brand text-white" : "text-muted hover:bg-surface-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="card flex items-center gap-3 px-4 py-3 text-sm">
          <CircleDashed className="size-4 text-amber-600" />
          <span className="font-bold">{pendingMatches.length} pendentes</span>
          <span className="text-muted">de {openMatches.length} abertos</span>
        </div>
      </section>

      <div className="mb-4 flex items-center gap-2 text-xs font-bold text-muted">
        <CheckCircle2 className="size-4 text-brand" />
        Revise o placar e toque em salvar. Assim nenhuma digitação parcial vira palpite.
      </div>
      <div className="mb-5 flex justify-end gap-2">
        <ViewButton active={grouping === "date"} onClick={() => setGrouping("date")} icon={CalendarDays}>
          Por data
        </ViewButton>
        <ViewButton active={grouping === "stage"} onClick={() => setGrouping("stage")} icon={Layers3}>
          Por fase
        </ViewButton>
      </div>
      <div className="grid gap-7">
        {groups.map(([label, groupedMatches]) => (
          <section key={label}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight">{label}</h2>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-muted">
                {groupedMatches.length} jogos
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {groupedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  isAuthenticated
                  termsAccepted
                  highlighted={match.id === resolvedFocusMatchId}
                />
              ))}
            </div>
          </section>
        ))}
        {visibleMatches.length === 0 && (
          <p className="card p-6 text-sm text-muted">
            Nenhuma partida encontrada neste filtro.
          </p>
        )}
      </div>
    </>
  );
}

export function FinishedMatchesReview({
  matches,
  selectedMatch,
  selectedPrediction,
  selectedResult,
  comparisons,
  comparisonSource,
  onSelectMatch,
  eyebrow = "Finalizados e bloqueados",
  title = "Comparar palpites do bolão",
}: {
  matches: DemoMatch[];
  selectedMatch: DemoMatch;
  selectedPrediction: ScorePrediction | null;
  selectedResult?: MatchResult;
  comparisons: MatchPoolComparison[];
  comparisonSource: PredictionComparisonOverview["source"];
  onSelectMatch: (matchId: string) => void;
  eyebrow?: string;
  title?: string;
}) {
  const userScore =
    selectedResult && selectedPrediction
      ? calculateScore(selectedPrediction, selectedResult, selectedMatch.stage)
      : null;
  const totals = summarizeComparisonTotals(comparisons);

  return (
    <section className="mb-7 overflow-hidden rounded-[1.5rem] border bg-surface/90 shadow-lg shadow-brand/5">
      <div className="border-b p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              {title}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <ReviewPill icon={ListChecks} label="Jogos" value={matches.length} />
            <ReviewPill icon={Layers3} label="Bolões" value={comparisons.length} />
            <ReviewPill icon={Target} label="Visíveis" value={totals.predictionCount} />
          </div>
        </div>
        <ProgressiveList
          initialCount={10}
          step={10}
          moreLabel="Ver mais jogos"
          className="mt-4 flex gap-3 overflow-x-auto pb-1"
        >
          {matches.map((match) => (
            <FinishedMatchButton
              key={match.id}
              match={match}
              selected={match.id === selectedMatch.id}
              result={selectedResultForButton(match, selectedMatch, selectedResult)}
              onClick={() => onSelectMatch(match.id)}
            />
          ))}
        </ProgressiveList>
      </div>

      <div className="grid gap-4 p-4 md:p-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div
          data-testid="finished-review-selected-match"
          className="rounded-[1.25rem] border bg-surface-muted p-4"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
            {selectedMatch.stageLabel}
          </p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <CompactTeam team={selectedMatch.homeTeam} />
            <div className="rounded-2xl border bg-surface px-4 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                {selectedResult ? "Resultado" : "Status"}
              </p>
              <p className="mt-1 whitespace-nowrap text-2xl font-black">
                {selectedResult
                  ? `${selectedResult.homeScore} x ${selectedResult.awayScore}`
                  : "bloqueado"}
              </p>
            </div>
            <CompactTeam team={selectedMatch.awayTeam} align="right" />
          </div>
          <div className="mt-4 grid gap-2">
            <ReviewStat label="Seu palpite" value={predictionLabel(selectedPrediction)} />
            <ReviewStat
              label="Sua pontuação"
              value={userScore ? `${userScore.totalPoints} pts` : "aguardando resultado"}
              tone={userScore?.category === "exact" ? "success" : "neutral"}
            />
            <ReviewStat
              label="Tipo de acerto"
              value={userScore ? scoreCategoryLabel(userScore.category) : "sem placar final"}
            />
            <ReviewStat
              label="Iguais ao seu"
              value={
                selectedPrediction
                  ? `${totals.samePredictionCount} palpite${totals.samePredictionCount === 1 ? "" : "s"}`
                  : "sem palpite"
              }
            />
          </div>
        </div>

        <div className="grid gap-3">
          {comparisons.length > 0 ? (
            comparisons.map((comparison) => (
              <PoolComparisonPanel
                key={comparison.poolId}
                comparison={comparison}
                match={selectedMatch}
              />
            ))
          ) : (
            <div className="rounded-[1.25rem] border bg-surface-muted p-5 text-sm leading-6 text-muted">
              {comparisonSource === "supabase"
                ? "Nenhum palpite de bolão está liberado para este jogo ainda."
                : "Finalize um resultado no modo demo para comparar este jogo com o ranking."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FinishedMatchButton({
  match,
  selected,
  result,
  onClick,
}: {
  match: DemoMatch;
  selected: boolean;
  result?: MatchResult;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`interactive grid min-w-[14rem] grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[1.2rem] border p-3 text-left ${
        selected ? "bg-brand text-white" : "bg-surface-muted text-foreground hover:border-brand/70"
      }`}
    >
      <MiniTeam team={match.homeTeam} selected={selected} />
      <span className={`rounded-xl px-2 py-1 text-center text-xs font-black ${selected ? "bg-white/12" : "bg-surface"}`}>
        {result ? `${result.homeScore} x ${result.awayScore}` : "bloq."}
      </span>
      <MiniTeam team={match.awayTeam} selected={selected} align="right" />
    </button>
  );
}

function PoolComparisonPanel({
  comparison,
  match,
}: {
  comparison: MatchPoolComparison;
  match: DemoMatch;
}) {
  const entries = [...comparison.entries]
    .sort((left, right) => compareEntriesForPanel(left, right, match));
  const averagePoints = comparisonAveragePoints(comparison, match);

  return (
    <div className="rounded-[1.25rem] border bg-surface-muted p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <PoolFlag code={comparison.flagCode} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{comparison.poolName}</p>
            <p className="text-xs text-muted">{comparison.memberCount} jogadores</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
          <MiniMetric label="Palpites" value={comparison.predictionCount} />
          <MiniMetric label="Cravadas" value={comparison.exactCount} />
          <MiniMetric label="Acertos" value={comparison.resultCount} />
          <MiniMetric label="Média" value={averagePoints ?? "—"} />
          <MiniMetric
            label="Mesmo"
            value={comparison.samePredictionCount}
            muted={comparison.samePredictionCount === 0}
          />
        </div>
      </div>
      <OutcomeDistribution comparison={comparison} match={match} />
      <ProgressiveList
        initialCount={8}
        step={8}
        moreLabel="Ver mais palpites"
        className="mt-4 divide-y rounded-2xl border bg-surface"
      >
        {entries.map((entry) => (
          <ComparisonRow key={`${comparison.poolId}-${entry.userId ?? entry.name}`} entry={entry} match={match} />
        ))}
      </ProgressiveList>
      {comparison.hiddenCount > 0 ? (
        <p className="mt-3 text-xs font-bold text-muted">
          {comparison.hiddenCount} participante{comparison.hiddenCount === 1 ? "" : "s"} sem palpite visível para este jogo.
        </p>
      ) : null}
    </div>
  );
}

function ComparisonRow({
  entry,
  match,
}: {
  entry: PredictionComparisonEntry;
  match: DemoMatch;
}) {
  const updatedAt = formatShortDateTime(entry.updatedAt);
  const [expanded, setExpanded] = useState(false);
  const score = entryScore(entry, match);
  const result = match.result ?? match.liveResult;
  const points = score?.totalPoints ?? entryPoints(entry, match);
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <div className={entry.isCurrentUser ? "bg-accent/20" : ""}>
      <button
        type="button"
        data-testid={entry.isCurrentUser ? "comparison-current-user" : undefined}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="interactive grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={entry.name} initials={entry.initials} avatarUrl={entry.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black">
              {entry.name}
              {entry.isCurrentUser && (
                <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-[9px] font-black text-white">
                  Você
                </span>
              )}
            </p>
            <p className="text-xs text-muted">{predictionLabel(entry.prediction)}</p>
            {updatedAt ? (
              <p className="text-[10px] font-bold text-muted">Alterado {updatedAt}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 text-right">
          <div>
            <p className="text-sm font-black text-brand">
              {points === null ? "—" : `${points} pts`}
            </p>
            <p className="text-[10px] font-bold text-muted">#{entry.position}</p>
          </div>
          <Chevron className="size-4 text-muted" />
        </div>
      </button>
      {expanded ? (
        <div
          data-testid="prediction-comparison-details"
          className="grid gap-2 border-t bg-surface-muted/65 p-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <DetailMetric
            label="Resultado"
            value={result ? `${result.homeScore} x ${result.awayScore}` : "aguardando"}
          />
          <DetailMetric
            label="Categoria"
            value={score ? scoreCategoryLabel(score.category) : "sem cálculo"}
          />
          <DetailMetric
            label="Pontos do placar"
            value={score ? `${score.matchPoints} pts` : "—"}
          />
          <DetailMetric
            label={match.stage === "group" ? "Ranking" : "Avanço"}
            value={
              match.stage === "group"
                ? `${entry.points} pts gerais`
                : score
                  ? `${score.advancementPoints} pts`
                  : "—"
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-surface px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black">{value}</p>
    </div>
  );
}

function OutcomeDistribution({
  comparison,
  match,
}: {
  comparison: MatchPoolComparison;
  match: DemoMatch;
}) {
  if (comparison.predictionCount === 0) return null;

  const outcomes = [
    {
      key: "home" as const,
      label: match.homeTeam.shortName,
      value: comparison.outcomeCounts.home,
    },
    { key: "draw" as const, label: "Empate", value: comparison.outcomeCounts.draw },
    {
      key: "away" as const,
      label: match.awayTeam.shortName,
      value: comparison.outcomeCounts.away,
    },
  ];

  return (
    <div className="mt-4 rounded-2xl border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted">
          <BarChart3 className="size-3.5 text-brand" />
          Mapa dos palpites
        </p>
        {comparison.bestScore !== null ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-[10px] font-black text-brand">
            <Trophy className="size-3" />
            Melhor {comparison.bestScore} pts
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        {outcomes.map((outcome) => {
          const percentage =
            comparison.predictionCount > 0
              ? Math.round((outcome.value / comparison.predictionCount) * 100)
              : 0;

          return (
            <div key={outcome.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
              <span className="truncate text-xs font-bold text-muted">{outcome.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${percentage}%` }}
                />
              </span>
              <span className="text-right text-xs font-black">{percentage}%</span>
            </div>
          );
        })}
      </div>
      {comparison.topScorelines.length > 0 ? (
        <ProgressiveList
          initialCount={3}
          step={6}
          moreLabel="Ver mais placares"
          className="mt-3 flex flex-wrap gap-2"
          buttonClassName="interactive mt-3 inline-flex items-center gap-2 rounded-full border bg-surface-muted px-3 py-1.5 text-[10px] font-black text-brand hover:border-brand/60"
        >
          {comparison.topScorelines.map((scoreline) => (
            <span
              key={scoreline.label}
              className={`rounded-full border px-2 py-1 text-[10px] font-black ${
                scoreline.isCurrentUserPrediction
                  ? "border-brand bg-brand text-white"
                  : "bg-surface-muted text-muted"
              }`}
            >
              {scoreline.label} · {scoreline.count}
            </span>
          ))}
        </ProgressiveList>
      ) : null}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Layers3;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`interactive flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${
        active ? "bg-brand text-white" : "bg-white text-muted"
      }`}
    >
      <Icon className="size-3.5" /> {children}
    </button>
  );
}

function groupMatches(matches: DemoMatch[], grouping: "stage" | "date") {
  const groups = new Map<string, DemoMatch[]>();
  for (const match of matches) {
    const label = grouping === "date" ? match.dateLabel : match.stageLabel;
    groups.set(label, [...(groups.get(label) ?? []), match]);
  }
  return [...groups.entries()];
}

function selectedResultForButton(
  match: DemoMatch,
  selectedMatch: DemoMatch,
  selectedResult?: MatchResult,
) {
  if (match.id === selectedMatch.id) return selectedResult ?? match.result ?? match.liveResult;
  return match.result ?? match.liveResult;
}

function CompactTeam({
  team,
  align = "left",
}: {
  team: DemoMatch["homeTeam"];
  align?: "left" | "right";
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className={`flex ${align === "right" ? "justify-end" : ""}`}>
        <TeamFlag team={team} size="lg" />
      </div>
      <p className="mt-2 truncate text-sm font-black">{team.shortName}</p>
    </div>
  );
}

function MiniTeam({
  team,
  selected,
  align = "left",
}: {
  team: DemoMatch["homeTeam"];
  selected: boolean;
  align?: "left" | "right";
}) {
  return (
    <span className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <span className={`block truncate text-xs font-black ${selected ? "text-white" : "text-foreground"}`}>
        {team.shortName}
      </span>
      <span className={`mt-0.5 block truncate text-[10px] font-bold ${selected ? "text-white/60" : "text-muted"}`}>
        {team.flag}
      </span>
    </span>
  );
}

function ReviewStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div className={`rounded-2xl border p-3 ${tone === "success" ? "status-success" : "bg-surface"}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function ReviewPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-surface-muted px-3 py-2">
      <p className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-[0.1em] text-muted">
        <Icon className="size-3 text-brand" />
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black">{value}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-surface px-2 py-1.5">
      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-black ${muted ? "text-muted" : ""}`}>{value}</p>
    </div>
  );
}

function compareEntriesForPanel(
  left: PredictionComparisonEntry,
  right: PredictionComparisonEntry,
  match: DemoMatch,
) {
  if (left.isCurrentUser !== right.isCurrentUser) return left.isCurrentUser ? -1 : 1;
  return (
    (entryPoints(right, match) ?? -1) - (entryPoints(left, match) ?? -1) ||
    left.position - right.position ||
    left.name.localeCompare(right.name, "pt-BR")
  );
}

function entryPoints(entry: PredictionComparisonEntry, match: DemoMatch) {
  return entryScore(entry, match)?.totalPoints ?? null;
}

function entryScore(entry: PredictionComparisonEntry, match: DemoMatch) {
  if (entry.score) return entry.score;
  const result = match.result ?? match.liveResult;
  if (!entry.prediction || !result) return null;
  return calculateScore(entry.prediction, result, match.stage);
}

function comparisonAveragePoints(comparison: MatchPoolComparison, match: DemoMatch) {
  const points = comparison.entries
    .map((entry) => entryPoints(entry, match))
    .filter((value): value is number => value !== null);
  if (points.length === 0) return comparison.averagePoints;
  return Math.round(points.reduce((total, value) => total + value, 0) / points.length);
}

function summarizeComparisonTotals(comparisons: MatchPoolComparison[]) {
  return comparisons.reduce(
    (totals, comparison) => ({
      predictionCount: totals.predictionCount + comparison.predictionCount,
      samePredictionCount: totals.samePredictionCount + comparison.samePredictionCount,
    }),
    { predictionCount: 0, samePredictionCount: 0 },
  );
}

function scoreCategoryLabel(category: ScoreBreakdown["category"]) {
  if (category === "exact") return "Placar cravado";
  if (category === "refined") return "Resultado refinado";
  if (category === "result") return "Resultado certo";
  if (category === "one-score") return "Um placar certo";
  return "Sem acerto";
}

function formatShortDateTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
