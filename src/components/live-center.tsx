"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ListChecks,
  Minus,
  Radio,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { CarouselRail } from "@/components/carousel-rail";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import { PageShortcuts } from "@/components/page-shortcuts";
import { PoolFlag } from "@/components/pool-flag";
import { ProgressiveList } from "@/components/progressive-list";
import { TeamFlag } from "@/components/team-flag";
import { UserAvatar } from "@/components/user-avatar";
import { isLiveMatch } from "@/lib/match-display";
import {
  type MatchPoolComparison,
  type PredictionComparisonEntry,
  type PredictionComparisonOverview,
  predictionLabel,
} from "@/lib/prediction-comparisons";
import { rankingLabel } from "@/lib/ranking-display";
import { calculateScore } from "@/lib/scoring";
import type {
  DemoMatch,
  MatchResult,
  PoolSummary,
  RankingEntry,
  ScoreBreakdown,
  ScorePrediction,
} from "@/lib/types";

type LiveCenterProps = {
  matches: DemoMatch[];
  poolsOverview: {
    pools: PoolSummary[];
    publicPools: PoolSummary[];
    ranking: RankingEntry[];
    rankingName: string;
    rankingsByPool: Record<string, RankingEntry[]>;
    isAuthenticated: boolean;
  };
  comparisonOverview: PredictionComparisonOverview;
};

type PoolOption = Pick<PoolSummary, "id" | "name" | "flagCode" | "members" | "isArchived">;

export function LiveCenter({
  matches,
  poolsOverview,
  comparisonOverview,
}: LiveCenterProps) {
  const liveMatches = useMemo(() => matches.filter(isLiveMatch), [matches]);
  const focusMatches = useMemo(() => selectFocusMatches(matches), [matches]);
  const poolOptions = useMemo(
    () => selectPoolOptions(poolsOverview, comparisonOverview),
    [comparisonOverview, poolsOverview],
  );
  const [selectedMatchId, setSelectedMatchId] = useState(
    () => focusMatches[0]?.id ?? matches[0]?.id ?? "",
  );
  const [selectedPoolId, setSelectedPoolId] = useState(
    () => poolOptions[0]?.id ?? "",
  );
  const selectedMatch =
    focusMatches.find((match) => match.id === selectedMatchId) ??
    matches.find((match) => match.id === selectedMatchId) ??
    focusMatches[0] ??
    matches[0] ??
    null;
  const selectedPool =
    poolOptions.find((pool) => pool.id === selectedPoolId) ?? poolOptions[0] ?? null;
  const comparisonsForMatch = selectedMatch
    ? comparisonOverview.comparisonsByMatch[selectedMatch.id] ?? []
    : [];
  const selectedComparison =
    comparisonsForMatch.find((comparison) => comparison.poolId === selectedPool?.id) ??
    comparisonsForMatch[0] ??
    null;
  const ranking =
    selectedPool && poolsOverview.rankingsByPool[selectedPool.id]?.length
      ? poolsOverview.rankingsByPool[selectedPool.id]
      : poolsOverview.ranking;
  const orderedRanking = orderRanking(ranking);
  const currentPlayer = orderedRanking.find((player) => player.isCurrentUser) ?? null;
  const [rankingExpanded, setRankingExpanded] = useState(false);
  const [selectedRankingKey, setSelectedRankingKey] = useState(
    () => (currentPlayer ? rankingEntryKey(currentPlayer) : ""),
  );
  const compactRankingRows = orderedRanking.slice(0, 6);
  const visibleRankingRows = rankingExpanded ? orderedRanking : compactRankingRows;
  const rankingFallbackKey = currentPlayer
    ? rankingEntryKey(currentPlayer)
    : orderedRanking[0]
      ? rankingEntryKey(orderedRanking[0])
      : "";
  const activeRankingKey = orderedRanking.some(
    (player) => rankingEntryKey(player) === selectedRankingKey,
  )
    ? selectedRankingKey
    : rankingFallbackKey;
  const currentPrediction = selectedMatch
    ? findCurrentPrediction(selectedMatch, selectedComparison)
    : null;
  const score = selectedMatch ? visibleScore(selectedMatch) : null;
  const currentMatchPoints =
    selectedMatch && currentPrediction && score
      ? calculateScore(currentPrediction, score, selectedMatch.stage).totalPoints
      : null;
  const provisionalPoints = currentPlayer?.provisionalPoints ?? currentPlayer?.points ?? null;
  const status = selectedMatch ? liveMatchStatus(selectedMatch) : null;
  const bestPartial = selectedMatch && selectedComparison
    ? bestPartialEntry(selectedComparison, selectedMatch)
    : null;
  const orderedPredictionEntries = selectedComparison
    ? [...selectedComparison.entries].sort((left, right) =>
        comparePredictionEntries(left, right, selectedMatch),
      )
    : [];
  const [predictionExpanded, setPredictionExpanded] = useState(false);
  const [selectedPredictionKey, setSelectedPredictionKey] = useState(
    () => predictionEntryKey(orderedPredictionEntries.find((entry) => entry.isCurrentUser) ?? orderedPredictionEntries[0]),
  );
  const compactPredictionRows = orderedPredictionEntries.slice(0, 8);
  const visiblePredictionRows = predictionExpanded
    ? orderedPredictionEntries
    : compactPredictionRows;
  const predictionFallbackKey = predictionEntryKey(
    orderedPredictionEntries.find((entry) => entry.isCurrentUser) ?? orderedPredictionEntries[0],
  );
  const activePredictionKey = orderedPredictionEntries.some(
    (entry) => predictionEntryKey(entry) === selectedPredictionKey,
  )
    ? selectedPredictionKey
    : predictionFallbackKey;

  if (!selectedMatch) {
    return (
      <main className="page-container py-7 md:py-10">
        <section className="rounded-[1.5rem] border bg-surface p-6 text-center">
          <p className="eyebrow">Ao vivo</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            A agenda ainda não foi carregada.
          </h1>
          <Link
            href="/jogos"
            className="interactive mt-5 inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-brand"
          >
            Ver jogos <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>
    );
  }

  const currentMovement = currentPlayer ? rankingMovement(currentPlayer) : null;
  const popular = selectedComparison
    ? popularOutcome(selectedComparison, selectedMatch)
    : null;
  const impactCards: Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    detail: string;
    tone: "neutral" | "info" | "success" | "warning" | "live";
  }> = [
    {
      icon: Target,
      label: "Meu cenário",
      value: predictionLabel(currentPrediction),
      detail:
        currentMatchPoints === null
          ? score
            ? "sem pontuar neste placar"
            : "aguardando placar"
          : `${currentMatchPoints} pts agora`,
      tone: currentPrediction ? "success" : "warning",
    },
    {
      icon: BarChart3,
      label: "Ranking",
      value: currentMovement?.label ?? "sem ranking",
      detail: currentPlayer
        ? `${rankingLabel(currentPlayer, orderedRanking, { provisional: true, tiedSuffix: "=" })} · ${provisionalPoints} pts`
        : "entre em um bolão",
      tone: currentMovement?.tone === "up" ? "success" : currentMovement?.tone === "down" ? "warning" : "neutral",
    },
    {
      icon: UsersRound,
      label: "Tendência do bolão",
      value: popular ? popular.label : "sem mapa",
      detail: popular
        ? `${popular.percent}% · ${popular.count} de ${selectedComparison?.predictionCount ?? 0}`
        : selectedComparison
          ? "sem palpites visíveis"
          : "comparação indisponível",
      tone: popular ? "info" : "neutral",
    },
    {
      icon: Trophy,
      label: "Melhor parcial",
      value: bestPartial?.entry.name ?? "aguardando",
      detail: bestPartial ? `${bestPartial.points} pts neste jogo` : "ninguém pontuando ainda",
      tone: bestPartial ? "live" : "neutral",
    },
    {
      icon: Clock3,
      label: "Atualização",
      value: providerUpdateText(selectedMatch),
      detail: liveMatches.length > 0 ? "atualiza a cada 15s" : "monitoramento ativo",
      tone: liveMatches.length > 0 ? "live" : "info",
    },
  ];

  return (
    <main className="page-container py-7 md:py-10">
      <section className="hero-panel relative overflow-hidden rounded-[2rem] px-5 py-6 text-white md:px-8 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em]">
              {liveMatches.length > 0 ? (
                <Radio className="live-icon size-3.5" />
              ) : (
                <CalendarDays className="size-3.5 text-accent" />
              )}
              {liveMatches.length > 0 ? "Central ao vivo" : "Sala de acompanhamento"}
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.05em] md:text-6xl">
              {liveMatches.length > 0
                ? "O jogo está mexendo no bolão agora."
                : "Tudo pronto para acompanhar a próxima virada."}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/72 md:text-base">
              Placar, seu palpite, pontos parciais, ranking do bolão e comparação
              com outros participantes em uma tela que atualiza sozinha.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/58">
              Status agora
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <HeroMetric label="Ao vivo" value={liveMatches.length} />
              <HeroMetric
                label="A confirmar"
                value={matches.filter((match) => match.providerStatus === "finished" && !match.result).length}
              />
              <HeroMetric label="Bolões" value={poolOptions.length} />
            </div>
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-bold leading-5 text-white/68">
              {liveMatches.length > 0
                ? "Atualização automática ativa a cada 15 segundos enquanto houver jogo ao vivo."
                : "Quando houver jogo ao vivo ou resultado pendente, esta tela passa a se atualizar sozinha."}
            </p>
          </div>
        </div>
      </section>

      <PageShortcuts
        routeKeys={["games", "predictions", "pools", "dashboard"]}
        className="mt-5"
      />

      {focusMatches.length > 1 ? (
        <section className="mt-5 min-w-0 max-w-full pb-2">
          <CarouselRail
            ariaLabel="Jogos ao vivo e próximos"
            initialCount={6}
            step={6}
            moreLabel="Ver mais jogos"
            trackClassName="auto-cols-[minmax(16rem,82vw)] gap-2 sm:auto-cols-[16rem]"
          >
            {focusMatches.map((match) => (
              <button
                key={match.id}
                type="button"
                aria-pressed={match.id === selectedMatch.id}
                onClick={() => setSelectedMatchId(match.id)}
                className={`interactive flex min-w-64 items-center gap-3 rounded-2xl border p-3 text-left ${
                  match.id === selectedMatch.id
                    ? "border-brand bg-brand text-white shadow-md shadow-brand/20"
                    : "bg-surface hover:border-brand/60"
                }`}
              >
                <span className="grid shrink-0 grid-cols-2 gap-1">
                  <TeamFlag team={match.homeTeam} size="sm" />
                  <TeamFlag team={match.awayTeam} size="sm" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">
                    {match.homeTeam.shortName} x {match.awayTeam.shortName}
                  </span>
                  <span className={`mt-0.5 block text-xs font-bold ${match.id === selectedMatch.id ? "text-white/70" : "text-muted"}`}>
                    {liveMatchStatus(match).label}
                  </span>
                </span>
              </button>
            ))}
          </CarouselRail>
        </section>
      ) : null}

      <section className="mt-5" aria-labelledby="live-impact-title">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Resumo rápido</p>
            <h2 id="live-impact-title" className="mt-1 text-2xl font-black tracking-tight">
              Impacto agora
            </h2>
          </div>
          <Link
            href={focusedPredictionHref(selectedMatch)}
            className="interactive inline-flex items-center justify-center gap-2 rounded-2xl border bg-surface px-4 py-3 text-sm font-black text-brand hover:border-brand/60"
          >
            Abrir este jogo <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {impactCards.map((card) => (
            <ImpactCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)]">
        <article className="min-w-0 rounded-[1.5rem] border bg-surface p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="eyebrow">{selectedMatch.stageLabel}</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                {selectedMatch.homeTeam.shortName} x {selectedMatch.awayTeam.shortName}
              </h2>
              <LocalMatchDateTime
                scheduledAt={selectedMatch.scheduledAt}
                fallbackDate={selectedMatch.dateLabel}
                fallbackTime={selectedMatch.timeLabel}
                includeZone
                className="mt-2 block text-sm font-bold text-muted"
              />
            </div>
            <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${status?.className ?? "status-info"}`}>
              {status ? (
                status.kind === "live" ? (
                  <span className="live-dot" aria-hidden="true" />
                ) : (
                  <status.icon className="size-4" />
                )
              ) : null}
              {status?.label ?? "Agenda"}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-[1.35rem] bg-surface-muted px-3 py-5 md:px-5">
            <ScoreTeam team={selectedMatch.homeTeam} align="right" />
            <div className="min-w-20 text-center">
              {score ? (
                <p className={`text-4xl font-black tracking-tight md:text-5xl ${status?.kind === "live" ? "live-number" : ""}`}>
                  {score.homeScore}<span className="text-brand">x</span>{score.awayScore}
                </p>
              ) : (
                <p className="text-4xl font-black text-brand md:text-5xl">x</p>
              )}
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                {score ? "placar atual" : "aguardando"}
              </p>
            </div>
            <ScoreTeam team={selectedMatch.awayTeam} align="left" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MatchFact
              icon={Target}
              label="Seu palpite"
              value={predictionLabel(currentPrediction)}
              detail={currentPrediction ? "registrado para este jogo" : "sem palpite encontrado"}
              tone={currentPrediction ? "success" : "warning"}
            />
            <MatchFact
              icon={Trophy}
              label="Pontos agora"
              value={currentMatchPoints === null ? "—" : `${currentMatchPoints} pts`}
              detail={score ? scoreCategoryText(currentPrediction, score, selectedMatch) : "parcial aparece com placar"}
              tone={currentMatchPoints === null ? "neutral" : "live"}
            />
            <MatchFact
              icon={Clock3}
              label="Atualização"
              value={providerUpdateText(selectedMatch)}
              detail={selectedMatch.venue}
              tone="info"
            />
          </div>
        </article>

        <aside className="min-w-0 rounded-[1.5rem] border bg-surface p-4 shadow-sm md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Seu bolão</p>
              <h2 className="mt-1 truncate text-2xl font-black tracking-tight">
                {selectedPool?.name ?? poolsOverview.rankingName}
              </h2>
            </div>
            {selectedPool ? <PoolFlag code={selectedPool.flagCode} size="sm" /> : <BarChart3 className="size-5 text-brand" />}
          </div>

          {poolOptions.length > 1 ? (
            <CarouselRail
              ariaLabel="Bolões ao vivo"
              centerMode={false}
              initialCount={5}
              step={5}
              moreLabel="Ver mais bolões"
              className="mt-4"
              trackClassName="auto-cols-max gap-2"
              buttonClassName="interactive mt-2 inline-flex items-center gap-2 rounded-full border bg-surface-muted px-3 py-1.5 text-[10px] font-black text-brand hover:border-brand/60"
            >
              {poolOptions.map((pool) => (
                <button
                  key={pool.id}
                  type="button"
                  onClick={() => setSelectedPoolId(pool.id)}
                  className={`interactive shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
                    pool.id === selectedPool?.id
                      ? "bg-brand text-white"
                      : "bg-surface-muted text-muted hover:border-brand/60 hover:text-brand"
                  }`}
                >
                  {pool.name}
                </button>
              ))}
            </CarouselRail>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <RankingMetric
              label="Você"
              value={currentPlayer ? rankingLabel(currentPlayer, orderedRanking, { provisional: Boolean(currentPlayer.provisionalPosition), tiedSuffix: "=" }) : "—"}
              detail={provisionalPoints === null ? "ranking não carregado" : `${provisionalPoints} pts`}
            />
            <RankingMetric
              label="Movimento"
              value={currentPlayer ? rankingMovement(currentPlayer).label : "—"}
              detail={currentPlayer ? "posição parcial" : "entre no bolão"}
            />
          </div>

          <div className="mt-5 space-y-2">
            {visibleRankingRows.map((player) => {
              const key = rankingEntryKey(player);
              const selected = key === activeRankingKey;

              return (
                <div key={key}>
                  <RankingRow
                    player={player}
                    entries={orderedRanking}
                    selected={selected}
                    onSelect={() => setSelectedRankingKey(key)}
                  />
                  {selected ? (
                    <RankingPlayerDetail player={player} entries={orderedRanking} />
                  ) : null}
                </div>
              );
            })}
            {orderedRanking.length > compactRankingRows.length ? (
              <button
                type="button"
                onClick={() => setRankingExpanded((current) => !current)}
                className="interactive flex w-full items-center justify-center gap-2 rounded-2xl border bg-surface-muted px-4 py-3 text-xs font-black text-brand hover:border-brand/60"
              >
                {rankingExpanded ? (
                  <>
                    Mostrar menos <ChevronUp className="size-4" />
                  </>
                ) : (
                  <>
                    Ver mais participantes ({orderedRanking.length - compactRankingRows.length}) <ChevronDown className="size-4" />
                  </>
                )}
              </button>
            ) : null}
            {orderedRanking.length === 0 ? (
              <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
                O ranking deste bolão ainda não tem participantes visíveis.
              </p>
            ) : null}
          </div>

          <Link
            href="/boloes"
            className="interactive mt-5 flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-brand"
          >
            Abrir bolões <ArrowRight className="size-4" />
          </Link>
        </aside>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <article className="rounded-[1.5rem] border bg-surface p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Leitura do bolão</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                Distribuição dos palpites
              </h2>
            </div>
            <ListChecks className="size-5 text-brand" />
          </div>

          {selectedComparison ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <ComparisonStat
                  label="Com palpite"
                  value={selectedComparison.predictionCount}
                  detail={`de ${selectedComparison.memberCount}`}
                />
                <ComparisonStat
                  label="Mesmo placar"
                  value={selectedComparison.samePredictionCount}
                  detail="além de você"
                />
                <ComparisonStat
                  label="Melhor parcial"
                  value={bestPartial ? `${bestPartial.points} pts` : "—"}
                  detail={bestPartial?.entry.name ?? "sem placar"}
                />
                <ComparisonStat
                  label="Média"
                  value={liveAverage(selectedComparison, selectedMatch)}
                  detail="pontos no jogo"
                />
              </div>

              <div className="mt-5 space-y-3">
                <OutcomeBar
                  label={selectedMatch.homeTeam.shortName}
                  value={selectedComparison.outcomeCounts.home}
                  total={selectedComparison.predictionCount}
                />
                <OutcomeBar
                  label="Empate"
                  value={selectedComparison.outcomeCounts.draw}
                  total={selectedComparison.predictionCount}
                />
                <OutcomeBar
                  label={selectedMatch.awayTeam.shortName}
                  value={selectedComparison.outcomeCounts.away}
                  total={selectedComparison.predictionCount}
                />
              </div>

              {selectedComparison.topScorelines.length > 0 ? (
                <ProgressiveList
                  initialCount={3}
                  step={6}
                  moreLabel="Ver mais placares"
                  className="mt-5 flex flex-wrap gap-2"
                  buttonClassName="interactive mt-3 inline-flex items-center gap-2 rounded-full border bg-surface-muted px-3 py-1.5 text-[10px] font-black text-brand hover:border-brand/60"
                >
                  {selectedComparison.topScorelines.map((scoreline) => (
                    <span
                      key={scoreline.label}
                      className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                        scoreline.isCurrentUserPrediction ? "status-success" : "bg-surface-muted text-muted"
                      }`}
                    >
                      {scoreline.label} · {scoreline.count}
                    </span>
                  ))}
                </ProgressiveList>
              ) : null}
            </>
          ) : (
            <p className="mt-4 rounded-2xl bg-surface-muted p-5 text-sm font-bold text-muted">
              A comparação dos palpites aparece quando o jogo trava ou quando há
              placar liberado para o bolão.
            </p>
          )}
        </article>

        <article className="rounded-[1.5rem] border bg-surface p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Palpites do jogo</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                Quem está pontuando
              </h2>
            </div>
            <UsersRound className="size-5 text-brand" />
          </div>

          {selectedComparison ? (
            <div className="mt-4 space-y-2">
              {visiblePredictionRows.map((entry) => {
                const key = predictionEntryKey(entry);
                const selected = key === activePredictionKey;

                return (
                  <div key={key}>
                    <PredictionRow
                      entry={entry}
                      match={selectedMatch}
                      selected={selected}
                      onSelect={() => setSelectedPredictionKey(key)}
                    />
                    {selected ? (
                      <PredictionDetail entry={entry} match={selectedMatch} />
                    ) : null}
                  </div>
                );
              })}
              {orderedPredictionEntries.length > compactPredictionRows.length ? (
                <button
                  type="button"
                  onClick={() => setPredictionExpanded((current) => !current)}
                  className="interactive flex w-full items-center justify-center gap-2 rounded-2xl border bg-surface-muted px-4 py-3 text-xs font-black text-brand hover:border-brand/60"
                >
                  {predictionExpanded ? (
                    <>
                      Mostrar menos <ChevronUp className="size-4" />
                    </>
                  ) : (
                    <>
                      Ver mais palpites ({orderedPredictionEntries.length - compactPredictionRows.length}){" "}
                      <ChevronDown className="size-4" />
                    </>
                  )}
                </button>
              ) : null}
              {selectedComparison.hiddenCount > 0 ? (
                <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold text-muted">
                  {selectedComparison.hiddenCount} participante sem palpite visível neste jogo.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-surface-muted p-5 text-sm font-bold text-muted">
              Assim que os palpites ficarem comparáveis, esta lista mostra placar,
              pontos parciais e quem pensou parecido com você.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3">
      <p className="text-2xl font-black text-accent">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/62">
        {label}
      </p>
    </div>
  );
}

function ImpactCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "info" | "success" | "warning" | "live";
}) {
  const toneClass =
    tone === "success"
      ? "status-success"
      : tone === "warning"
        ? "status-warning"
        : tone === "live"
          ? "status-live"
          : tone === "info"
            ? "status-info"
            : "bg-surface";

  return (
    <article className={`rounded-[1.2rem] border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className={`size-4 ${tone === "live" ? "live-icon" : ""}`} />
        <p className="text-right text-[10px] font-black uppercase tracking-[0.12em] text-muted">
          {label}
        </p>
      </div>
      <p className={`mt-3 truncate text-xl font-black ${tone === "live" ? "live-number" : ""}`}>
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-xs font-bold text-muted">{detail}</p>
    </article>
  );
}

function ScoreTeam({
  team,
  align,
}: {
  team: DemoMatch["homeTeam"];
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-2 ${align === "right" ? "md:items-end" : "md:items-start"}`}>
      <TeamFlag team={team} size="xl" />
      <p className={`line-clamp-2 min-h-10 text-center text-sm font-black leading-5 md:text-base ${align === "right" ? "md:text-right" : "md:text-left"}`}>
        {team.shortName || team.name}
      </p>
    </div>
  );
}

function MatchFact({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "info" | "success" | "warning" | "live";
}) {
  const toneClass =
    tone === "success"
      ? "status-success"
      : tone === "warning"
        ? "status-warning"
        : tone === "live"
          ? "status-live"
          : tone === "info"
            ? "status-info"
            : "bg-surface-muted";

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className="size-4" />
        <p className="text-right text-[10px] font-black uppercase tracking-[0.12em] text-muted">
          {label}
        </p>
      </div>
      <p className="mt-3 text-xl font-black">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs font-bold text-muted">{detail}</p>
    </div>
  );
}

function RankingMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border bg-surface-muted p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-brand">{value}</p>
      <p className="mt-1 text-xs font-bold text-muted">{detail}</p>
    </div>
  );
}

function RankingRow({
  player,
  entries,
  selected,
  onSelect,
}: {
  player: RankingEntry;
  entries: RankingEntry[];
  selected: boolean;
  onSelect: () => void;
}) {
  const movement = rankingMovement(player);
  const MovementIcon = movement.icon;
  const points = player.provisionalPoints ?? player.points;
  const toneClass =
    selected
      ? "border-brand bg-brand text-white"
      : movement.tone === "up"
        ? "status-success"
        : movement.tone === "down"
          ? "status-warning"
          : player.isCurrentUser
            ? "border-brand/50 bg-brand/5"
            : "bg-surface-muted";

  return (
    <button
      type="button"
      aria-expanded={selected}
      onClick={onSelect}
      className={`interactive grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left ${toneClass}`}
    >
      <span className={`w-8 text-center text-sm font-black ${selected ? "text-white/80" : "text-brand"}`}>
        {rankingLabel(player, entries, { provisional: Boolean(player.provisionalPosition), tiedSuffix: "=" })}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={player.name} initials={player.initials} avatarUrl={player.avatarUrl} className="size-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-black">
            {player.name}
            {player.isCurrentUser ? (
              <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-[9px] font-black text-white">
                Você
              </span>
            ) : null}
          </p>
          <p className={`text-xs font-bold ${selected ? "text-white/65" : "text-muted"}`}>{points} pts</p>
        </div>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${selected ? "border-white/20 bg-white/10 text-white" : "bg-surface"}`}>
        <MovementIcon className="size-3" />
        {movement.shortLabel}
      </span>
    </button>
  );
}

function RankingPlayerDetail({
  player,
  entries,
}: {
  player: RankingEntry;
  entries: RankingEntry[];
}) {
  const leader = entries[0];
  const points = player.provisionalPoints ?? player.points;
  const leaderPoints = leader?.provisionalPoints ?? leader?.points ?? points;
  const gap = Math.max(0, leaderPoints - points);
  const movement = rankingMovement(player);
  const MovementIcon = movement.icon;

  return (
    <div className="mt-2 rounded-2xl border bg-surface-muted p-3">
      <div className="grid grid-cols-2 gap-2">
        <RankingDetailStat
          label="Oficial"
          value={`${rankingLabel(player, entries)} · ${player.points} pts`}
        />
        <RankingDetailStat
          label="Ao vivo"
          value={`${rankingLabel(player, entries, { provisional: true, tiedSuffix: "=" })} · ${points} pts`}
        />
        <RankingDetailStat label="Cravadas" value={String(player.exact)} />
        <RankingDetailStat label="Resultados" value={String(player.correct)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
        <span className="inline-flex items-center gap-1 rounded-full border bg-surface px-2 py-1 text-[10px] font-black">
          <MovementIcon className="size-3" />
          {movement.label}
        </span>
        {leader && gap > 0 ? <span>{gap} pts atrás de {leader.name}</span> : <span>na briga pela liderança</span>}
      </div>
    </div>
  );
}

function RankingDetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-surface px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-xs font-black">{value}</p>
    </div>
  );
}

function ComparisonStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border bg-surface-muted p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-brand">{value}</p>
      <p className="mt-1 line-clamp-1 text-xs font-bold text-muted">{detail}</p>
    </div>
  );
}

function OutcomeBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-black">
        <span>{label}</span>
        <span className="text-muted">{value} · {percent}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PredictionRow({
  entry,
  match,
  selected,
  onSelect,
}: {
  entry: PredictionComparisonEntry;
  match: DemoMatch;
  selected: boolean;
  onSelect: () => void;
}) {
  const points = livePointsForEntry(entry, match);
  const category = liveCategoryForEntry(entry, match);

  return (
    <button
      type="button"
      aria-expanded={selected}
      onClick={onSelect}
      className={`interactive grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border p-3 text-left ${
        selected ? "border-brand bg-brand text-white" : entry.isCurrentUser ? "border-brand/50 bg-brand/5" : "bg-surface-muted"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={entry.name} initials={entry.initials} avatarUrl={entry.avatarUrl} className="size-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-black">
            {entry.name}
            {entry.isCurrentUser ? (
              <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-[9px] font-black text-white">
                Você
              </span>
            ) : null}
          </p>
          <p className={`text-xs font-bold ${selected ? "text-white/65" : "text-muted"}`}>
            {predictionLabel(entry.prediction)}
            {category ? ` · ${scoreCategoryLabel(category)}` : ""}
          </p>
        </div>
      </div>
      <span className={`self-center rounded-full border px-3 py-1.5 text-xs font-black ${selected ? "border-white/20 bg-white/10 text-accent" : "bg-surface text-brand"}`}>
        {points === null ? "—" : `${points} pts`}
      </span>
    </button>
  );
}

function PredictionDetail({
  entry,
  match,
}: {
  entry: PredictionComparisonEntry;
  match: DemoMatch;
}) {
  const result = visibleScore(match);
  const points = livePointsForEntry(entry, match);
  const category = liveCategoryForEntry(entry, match);
  const entryScore = liveScoreForEntry(entry, match);
  const updatedAt = formatShortDateTime(entry.updatedAt);

  return (
    <div className="mt-2 rounded-2xl border bg-surface-muted p-3">
      <div className="grid grid-cols-2 gap-2">
        <RankingDetailStat label="Palpite" value={predictionLabel(entry.prediction)} />
        <RankingDetailStat
          label={result ? "Placar atual" : "Status"}
          value={result ? `${result.homeScore} x ${result.awayScore}` : "sem placar"}
        />
        <RankingDetailStat label="Pontos" value={points === null ? "—" : `${points} pts`} />
        <RankingDetailStat label="Ranking" value={`#${entry.position}`} />
        <RankingDetailStat
          label="Pontos do placar"
          value={entryScore ? `${entryScore.matchPoints} pts` : "—"}
        />
        <RankingDetailStat
          label={match.stage === "group" ? "Multiplicador" : "Avanço"}
          value={
            match.stage === "group"
              ? entryScore
                ? `${entryScore.multiplier}x`
                : "—"
              : entryScore
                ? `${entryScore.advancementPoints} pts`
                : "—"
          }
        />
      </div>
      <p className="mt-3 text-xs font-bold text-muted">
        {category ? scoreCategoryLabel(category) : "Sem resultado para calcular"}{updatedAt ? ` · alterado ${updatedAt}` : ""}
      </p>
    </div>
  );
}

function selectFocusMatches(matches: DemoMatch[]) {
  const live = matches.filter(isLiveMatch);
  if (live.length > 0) return live.sort((left, right) => scheduledTime(left) - scheduledTime(right));

  const awaiting = matches
    .filter((match) => match.providerStatus === "finished" && !match.result)
    .sort((left, right) => scheduledTime(right) - scheduledTime(left));
  if (awaiting.length > 0) return awaiting;

  const upcoming = matches
    .filter((match) => !match.locked && !match.result && match.providerStatus !== "finished")
    .sort((left, right) => scheduledTime(left) - scheduledTime(right));
  if (upcoming.length > 0) return upcoming;

  return matches
    .filter((match) => Boolean(match.result) || match.locked)
    .sort((left, right) => scheduledTime(right) - scheduledTime(left));
}

function selectPoolOptions(
  poolsOverview: LiveCenterProps["poolsOverview"],
  comparisonOverview: PredictionComparisonOverview,
): PoolOption[] {
  const privatePools = poolsOverview.pools.filter((pool) => !pool.isArchived);
  if (privatePools.length > 0) return privatePools;
  if (poolsOverview.publicPools.length > 0) return poolsOverview.publicPools;
  return comparisonOverview.pools.map((pool) => ({
    id: pool.id,
    name: pool.name,
    flagCode: pool.flagCode,
    members: pool.members,
  }));
}

function liveMatchStatus(match: DemoMatch) {
  if (isLiveMatch(match)) {
    return {
      kind: "live",
      label: "Ao vivo",
      icon: Radio,
      className: "status-live",
    } as const;
  }
  if (match.result) {
    return {
      kind: "finished",
      label: "Finalizado",
      icon: CheckCircle2,
      className: "status-success",
    } as const;
  }
  if (match.providerStatus === "finished") {
    return {
      kind: "pending",
      label: "Aguardando oficial",
      icon: Clock3,
      className: "status-warning",
    } as const;
  }
  if (match.locked) {
    return {
      kind: "locked",
      label: "Palpites travados",
      icon: ListChecks,
      className: "status-info",
    } as const;
  }
  return {
    kind: "scheduled",
    label: "Próximo",
    icon: CalendarDays,
    className: "status-info",
  } as const;
}

function visibleScore(match: DemoMatch): MatchResult | null {
  return match.result ?? match.liveResult ?? null;
}

function focusedPredictionHref(match: DemoMatch) {
  return `/palpites?jogo=${encodeURIComponent(match.id)}#lista-de-jogos`;
}

function findCurrentPrediction(
  match: DemoMatch,
  comparison: MatchPoolComparison | null,
): ScorePrediction | null {
  return comparison?.entries.find((entry) => entry.isCurrentUser)?.prediction ?? match.prediction ?? null;
}

function scoreCategoryText(
  prediction: ScorePrediction | null,
  result: MatchResult,
  match: DemoMatch,
) {
  if (!prediction) return "sem palpite para comparar";
  return scoreCategoryLabel(calculateScore(prediction, result, match.stage).category);
}

function scoreCategoryLabel(category: ScoreBreakdown["category"]) {
  if (category === "exact") return "cravado";
  if (category === "refined") return "acerto refinado";
  if (category === "result") return "resultado correto";
  if (category === "one-score") return "um placar certo";
  return "sem acerto";
}

function providerUpdateText(match: DemoMatch) {
  if (!match.providerUpdatedAt) return "agenda";
  const date = new Date(match.providerUpdatedAt);
  if (Number.isNaN(date.getTime())) return "sincronizado";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function orderRanking(ranking: RankingEntry[]) {
  return [...ranking].sort((left, right) => {
    const leftPosition = left.provisionalPosition ?? left.position;
    const rightPosition = right.provisionalPosition ?? right.position;
    return leftPosition - rightPosition || right.points - left.points || left.name.localeCompare(right.name, "pt-BR");
  });
}

function rankingMovement(player: RankingEntry): {
  label: string;
  shortLabel: string;
  tone: "neutral" | "up" | "down";
  icon: typeof BarChart3;
} {
  if (!player.provisionalPosition || player.provisionalPosition === player.position) {
    return { label: "mantém posição", shortLabel: "mantém", tone: "neutral", icon: Minus };
  }
  if (player.provisionalPosition < player.position) {
    const amount = player.position - player.provisionalPosition;
    return { label: `sobe ${amount}`, shortLabel: `+${amount}`, tone: "up", icon: TrendingUp };
  }
  const amount = player.provisionalPosition - player.position;
  return { label: `cai ${amount}`, shortLabel: `-${amount}`, tone: "down", icon: TrendingDown };
}

function bestPartialEntry(comparison: MatchPoolComparison, match: DemoMatch) {
  return comparison.entries
    .map((entry) => ({
      entry,
      points: livePointsForEntry(entry, match),
    }))
    .filter((item): item is { entry: PredictionComparisonEntry; points: number } => item.points !== null)
    .sort((left, right) => right.points - left.points || left.entry.name.localeCompare(right.entry.name, "pt-BR"))[0] ?? null;
}

function popularOutcome(comparison: MatchPoolComparison, match: DemoMatch) {
  if (comparison.predictionCount === 0) return null;

  const outcomes = [
    {
      label: match.homeTeam.shortName,
      count: comparison.outcomeCounts.home,
    },
    {
      label: "Empate",
      count: comparison.outcomeCounts.draw,
    },
    {
      label: match.awayTeam.shortName,
      count: comparison.outcomeCounts.away,
    },
  ].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"));
  const top = outcomes[0];
  if (!top || top.count === 0) return null;

  return {
    ...top,
    percent: Math.round((top.count / comparison.predictionCount) * 100),
  };
}

function liveAverage(comparison: MatchPoolComparison, match: DemoMatch) {
  const points = comparison.entries
    .map((entry) => livePointsForEntry(entry, match))
    .filter((value): value is number => value !== null);
  if (points.length === 0) return "—";
  return `${Math.round(points.reduce((total, value) => total + value, 0) / points.length)} pts`;
}

function livePointsForEntry(entry: PredictionComparisonEntry, match: DemoMatch) {
  return liveScoreForEntry(entry, match)?.totalPoints ?? null;
}

function liveCategoryForEntry(entry: PredictionComparisonEntry, match: DemoMatch) {
  return liveScoreForEntry(entry, match)?.category ?? null;
}

function liveScoreForEntry(entry: PredictionComparisonEntry, match: DemoMatch) {
  if (entry.score) return entry.score;
  const result = visibleScore(match);
  if (!entry.prediction || !result) return null;
  return calculateScore(entry.prediction, result, match.stage);
}

function comparePredictionEntries(
  left: PredictionComparisonEntry,
  right: PredictionComparisonEntry,
  match: DemoMatch,
) {
  if (left.isCurrentUser !== right.isCurrentUser) return left.isCurrentUser ? -1 : 1;
  return (
    (livePointsForEntry(right, match) ?? -1) - (livePointsForEntry(left, match) ?? -1) ||
    left.position - right.position ||
    left.name.localeCompare(right.name, "pt-BR")
  );
}

function predictionEntryKey(entry?: PredictionComparisonEntry) {
  if (!entry) return "";
  return entry.userId ?? `${entry.position}:${entry.name}`;
}

function rankingEntryKey(player: RankingEntry) {
  return player.userId ?? `${player.position}:${player.name}`;
}

function scheduledTime(match: DemoMatch) {
  const value = match.scheduledAt ? new Date(match.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
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
