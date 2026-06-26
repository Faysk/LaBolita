"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleDot,
  ListChecks,
  Medal,
  Radio,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { CarouselRail } from "@/components/carousel-rail";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import { EmptyState } from "@/components/empty-state";
import { PageShortcuts } from "@/components/page-shortcuts";
import { PoolFlag } from "@/components/pool-flag";
import { ProgressiveList } from "@/components/progressive-list";
import { TeamFlag } from "@/components/team-flag";
import { UserAvatar } from "@/components/user-avatar";
import { UserAlerts } from "@/components/user-alerts";
import { demoRanking } from "@/lib/demo-data";
import { calculateDemoRanking } from "@/lib/demo-engine";
import type { AdminAlertView } from "@/lib/data/admin-alerts";
import type { PoolsOverview } from "@/lib/data/pools";
import type {
  SpecialGlobalRankingEntry,
  SpecialGlobalRankingOverview,
  SpecialMarketsOverview,
  SpecialMarketView,
} from "@/lib/data/specials";
import {
  useLocalPools,
  useLocalPredictions,
  useLocalResults,
} from "@/lib/local-state";
import { isLiveMatch, isOpenMatch } from "@/lib/match-display";
import { rankingLabel } from "@/lib/ranking-display";
import { calculateScore } from "@/lib/scoring";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type {
  DemoMatch,
  MatchResult,
  PoolSummary,
  RankingEntry,
  ScoreBreakdown,
  ScorePrediction,
} from "@/lib/types";

type LiveMatchView = {
  match: DemoMatch;
  prediction?: ScorePrediction;
  score?: ScoreBreakdown;
};

type PoolSnapshot = {
  pool: PoolSummary;
  ranking: RankingEntry[];
  currentPlayer?: RankingEntry;
  leader?: RankingEntry;
  movement: {
    label: string;
    tone: "up" | "down" | "neutral";
    delta: number;
  };
  livePoints: number;
  gapToLeader: number;
};

export function UserDashboard({
  alerts,
  matches,
  poolsOverview,
  specialGlobalRanking,
  specialsOverview,
}: {
  alerts: AdminAlertView[];
  matches: DemoMatch[];
  poolsOverview: PoolsOverview;
  specialGlobalRanking: SpecialGlobalRankingOverview;
  specialsOverview: SpecialMarketsOverview;
}) {
  const localPools = useLocalPools();
  const localPredictions = useLocalPredictions(matches);
  const localResults = useLocalResults();
  const usesSupabase = Boolean(createBrowserSupabaseClient());
  const pools = [...poolsOverview.pools, ...localPools].filter(
    (pool, index, all) => all.findIndex((item) => item.id === pool.id) === index,
  );
  const activePools = pools.filter((pool) => !pool.isArchived);
  const [selectedPoolId, setSelectedPoolId] = useSelectedPoolId(activePools);
  const selectedPool =
    activePools.find((pool) => pool.id === selectedPoolId) ?? activePools[0] ?? null;

  function predictionFor(match: DemoMatch) {
    return usesSupabase
      ? match.prediction
      : localPredictions[match.id] ?? match.prediction;
  }

  function resultFor(match: DemoMatch) {
    return usesSupabase ? match.result : localResults[match.id] ?? match.result;
  }

  const liveMatches = matches
    .filter(isLiveMatch)
    .map((match) => buildLiveMatchView(match, predictionFor(match)));
  const awaitingOfficial = matches.filter(
    (match) => match.providerStatus === "finished" && !resultFor(match),
  );
  const openMatches = matches.filter(
    (match) => isOpenMatch(match) && !resultFor(match),
  );
  const pendingMatches = openMatches.filter((match) => !predictionFor(match));
  const savedPredictions = matches.filter((match) => predictionFor(match)).length;
  const completedMatches = matches.filter((match) => resultFor(match)).length;
  const nextPendingMatch = pendingMatches[0] ?? openMatches[0] ?? null;
  const specialProgress = summarizeSpecials(specialsOverview);
  const snapshots = activePools.map((pool) =>
    buildPoolSnapshot({
      pool,
      ranking: rankingForPool({
        pool,
        matches,
        rankingsByPool: poolsOverview.rankingsByPool,
        fallbackRanking: poolsOverview.ranking,
        localPredictions,
        localResults,
        usesSupabase,
      }),
    }),
  );
  const selectedSnapshot =
    snapshots.find((snapshot) => snapshot.pool.id === selectedPool?.id) ??
    snapshots[0] ??
    null;
  const leadingSnapshot = snapshots
    .filter((snapshot) => snapshot.currentPlayer)
    .sort(compareSnapshots)[0];
  const liveScore = liveMatches.reduce(
    (total, item) => total + (item.score?.totalPoints ?? 0),
    0,
  );
  const totalProgress = matches.length > 0
    ? Math.round((savedPredictions / matches.length) * 100)
    : 0;

  return (
    <main className="page-container py-7 md:py-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Central do jogador</p>
          <h1 className="mt-1 text-3xl font-black md:text-5xl">
            Meu painel
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Seu placar, o que falta fazer e o impacto dos jogos nos seus bolões.
          </p>
        </div>
      </div>

      <PageShortcuts
        routeKeys={["predictions", "pools", "live", "specials"]}
        className="mt-5"
      />

      <UserAlerts alerts={alerts} />

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardMetric
          icon={CheckCircle2}
          label="Meus palpites"
          value={`${savedPredictions}/${matches.length}`}
          detail={`${pendingMatches.length} abertos pendentes`}
          tone={pendingMatches.length > 0 ? "warning" : "success"}
        />
        <DashboardMetric
          icon={Sparkles}
          label="Especiais"
          value={specialProgress.available ? `${specialProgress.completed}/${specialProgress.total}` : "—"}
          detail={specialProgress.detail}
          tone={specialProgress.pending > 0 ? "warning" : "neutral"}
        />
        <DashboardMetric
          icon={Radio}
          label="Ao vivo"
          value={String(liveMatches.length)}
          detail={awaitingOfficial.length > 0 ? `${awaitingOfficial.length} aguardando confirmação` : `${liveScore} pts parciais`}
          tone={liveMatches.length > 0 ? "live" : awaitingOfficial.length > 0 ? "warning" : "neutral"}
        />
        <DashboardMetric
          icon={Users}
          label="Bolões ativos"
          value={String(activePools.length)}
          detail={leadingSnapshot ? `${leadingSnapshot.pool.name}: ${rankingSummary(leadingSnapshot)}` : "entre em um bolão"}
          tone={leadingSnapshot?.movement.tone === "up" ? "success" : "neutral"}
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.8rem] border bg-surface/90 shadow-xl shadow-brand/5">
        {liveMatches.length > 0 ? (
          <LivePanel liveMatches={liveMatches} selectedSnapshot={selectedSnapshot} />
        ) : (
          <NextActionPanel
            nextMatch={nextPendingMatch}
            pendingMatches={pendingMatches.length}
            totalProgress={totalProgress}
            specialProgress={specialProgress}
          />
        )}
      </section>

      <GlobalSpecialRankingPanel
        ranking={specialGlobalRanking}
        specialsOverview={specialsOverview}
      />

      <section className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="dashboard-ranking-panel min-w-0 rounded-[1.5rem] border bg-surface/88 p-4 md:p-5">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Disputa nos bolões</p>
              <h2 className="mt-1 text-2xl font-black">Ranking em movimento</h2>
            </div>
          </div>
          {snapshots.length > 0 ? (
            <PoolSnapshotStrip
              snapshots={snapshots}
              selectedPoolId={selectedPool?.id ?? ""}
              onSelect={setSelectedPoolId}
            />
          ) : null}
          {selectedSnapshot ? (
            <PoolImpact snapshot={selectedSnapshot} />
          ) : (
            <EmptyPanel
              icon={Users}
              title="Nenhum bolão ativo"
              text="Crie um bolão ou entre com um código para acompanhar posição e pontos."
              href="/boloes"
              action="Abrir bolões"
            />
          )}
        </div>

        <div className="grid min-w-0 gap-5">
          <ActionQueue
            pendingMatches={pendingMatches}
            specialProgress={specialProgress}
          />
          <FinishedPulse
            completedMatches={completedMatches}
            awaitingOfficial={awaitingOfficial.length}
            matches={matches}
            resultFor={resultFor}
            predictionFor={predictionFor}
          />
        </div>
      </section>
    </main>
  );
}

function useSelectedPoolId(pools: PoolSummary[]) {
  return useState(() => pools[0]?.id ?? "");
}

function DashboardMetric({
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
  tone: "neutral" | "success" | "warning" | "live";
}) {
  const toneClass =
    tone === "success"
      ? "status-success"
      : tone === "warning"
        ? "status-warning"
        : tone === "live"
          ? "status-live"
          : "bg-surface";

  return (
    <article className={`rounded-[1.25rem] border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-surface/70 p-2 text-brand">
          <Icon className="size-4" />
        </span>
        <p className="text-right text-[10px] font-black uppercase text-muted">
          {label}
        </p>
      </div>
      <p className="mt-4 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-muted">{detail}</p>
    </article>
  );
}

function LivePanel({
  liveMatches,
  selectedSnapshot,
}: {
  liveMatches: LiveMatchView[];
  selectedSnapshot: PoolSnapshot | null;
}) {
  const [selectedMatchId, setSelectedMatchId] = useState(liveMatches[0]?.match.id ?? "");
  const primary =
    liveMatches.find((item) => item.match.id === selectedMatchId) ?? liveMatches[0];
  const score = primary.match.liveResult;
  const totalLivePoints = liveMatches.reduce(
    (total, item) => total + (item.score?.totalPoints ?? 0),
    0,
  );

  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
      <div className="bg-brand-strong p-5 text-white md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase text-accent">
            <span className="live-dot" aria-hidden="true" />
            Agora ao vivo
          </p>
          <span className="live-number rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white/75">
            {totalLivePoints} pts parciais
          </span>
        </div>
        <h2 className="mt-4 text-3xl font-black md:text-5xl">
          Pontos mudando em tempo real
        </h2>
        {liveMatches.length > 1 ? (
          <CarouselRail
            ariaLabel="Jogos ao vivo do painel"
            initialCount={4}
            step={4}
            moreLabel="Ver mais jogos ao vivo"
            className="mt-5"
            trackClassName="auto-cols-[13rem] gap-2"
            buttonClassName="interactive mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black text-accent hover:bg-white/15"
          >
            {liveMatches.map((item) => (
              <button
                key={item.match.id}
                type="button"
                aria-pressed={item.match.id === primary.match.id}
                onClick={() => setSelectedMatchId(item.match.id)}
                className={`interactive min-w-[13rem] rounded-2xl border px-3 py-2 text-left ${
                  item.match.id === primary.match.id
                    ? "border-accent bg-white/15"
                    : "border-white/15 bg-white/8"
                }`}
              >
                <span className="block truncate text-xs font-black text-white">
                  {item.match.homeTeam.shortName} x {item.match.awayTeam.shortName}
                </span>
                <span className="mt-1 flex items-center justify-between gap-2 text-[10px] font-bold text-white/62">
                  <span>
                    {item.match.liveResult
                      ? `${item.match.liveResult.homeScore} x ${item.match.liveResult.awayScore}`
                      : "ao vivo"}
                  </span>
                  <span className="text-accent">{item.score?.totalPoints ?? 0} pts</span>
                </span>
              </button>
            ))}
          </CarouselRail>
        ) : null}
        <div className="mt-6 rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <LiveTeam team={primary.match.homeTeam} />
            <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-3 text-center">
              <p className="text-[10px] font-black uppercase text-white/55">Parcial</p>
              <p className="live-number mt-1 whitespace-nowrap text-3xl font-black text-accent">
                {score ? `${score.homeScore} x ${score.awayScore}` : "x"}
              </p>
            </div>
            <LiveTeam team={primary.match.awayTeam} align="right" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <LiveStat label="Seu palpite" value={predictionText(primary.prediction)} />
            <LiveStat
              label="Neste momento"
              value={primary.score ? `${primary.score.totalPoints} pts` : "sem palpite"}
            />
          </div>
        </div>
      </div>
      <div className="p-5 md:p-7">
        <p className="eyebrow">Impacto no bolão</p>
        <h3 className="mt-1 text-2xl font-black">
          {selectedSnapshot ? selectedSnapshot.pool.name : "Sem bolão ativo"}
        </h3>
        {selectedSnapshot?.currentPlayer ? (
          <div className="mt-5 grid gap-3">
            <MovementBadge snapshot={selectedSnapshot} />
            <div className="grid grid-cols-2 gap-3">
              <MiniDashboardStat
                label="Pontos oficiais"
                value={`${selectedSnapshot.currentPlayer.points} pts`}
              />
              <MiniDashboardStat
                label="Parcial ao vivo"
                value={`${selectedSnapshot.currentPlayer.provisionalPoints ?? selectedSnapshot.currentPlayer.points} pts`}
              />
            </div>
            {liveMatches.length > 1 && (
              <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold text-muted">
                {liveMatches.length} jogos mexendo nos rankings agora.
              </p>
            )}
            <ProgressiveList
              initialCount={4}
              step={4}
              moreLabel="Ver mais impactos"
              className="grid gap-2"
            >
              {liveMatches.map((item) => (
                <LiveMatchImpact key={item.match.id} item={item} />
              ))}
            </ProgressiveList>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            Entre em um bolão para ver posição, pontos parciais e movimento.
          </p>
        )}
      </div>
    </div>
  );
}

function LiveMatchImpact({ item }: { item: LiveMatchView }) {
  const score = item.match.liveResult;
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="overflow-hidden rounded-2xl border bg-surface-muted">
      <button
        type="button"
        data-testid="dashboard-live-impact-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="interactive grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-black">
            {item.match.homeTeam.shortName} x {item.match.awayTeam.shortName}
          </p>
          <p className="mt-1 text-xs font-bold text-muted">
            Palpite {predictionText(item.prediction)} · parcial{" "}
            {score ? `${score.homeScore} x ${score.awayScore}` : "ao vivo"}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-black text-brand">
          {item.score?.totalPoints ?? 0} pts
          <Chevron className="size-3.5 text-muted" />
        </span>
      </button>
      {expanded ? (
        <div
          data-testid="dashboard-live-impact-details"
          className="grid gap-2 border-t bg-surface/75 p-3 sm:grid-cols-2"
        >
          <MiniDashboardStat
            label="Categoria"
            value={item.score ? scoreCategoryLabel(item.score.category) : "sem cálculo"}
          />
          <MiniDashboardStat
            label="Pontos do placar"
            value={item.score ? `${item.score.matchPoints} pts` : "—"}
          />
          <MiniDashboardStat
            label={item.match.stage === "group" ? "Multiplicador" : "Avanço"}
            value={
              item.match.stage === "group"
                ? item.score
                  ? `${item.score.multiplier}x`
                  : "—"
                : item.score
                  ? `${item.score.advancementPoints} pts`
                  : "—"
            }
          />
          <MiniDashboardStat label="Atualização" value={providerUpdateText(item.match)} />
        </div>
      ) : null}
    </div>
  );
}

function NextActionPanel({
  nextMatch,
  pendingMatches,
  totalProgress,
  specialProgress,
}: {
  nextMatch: DemoMatch | null;
  pendingMatches: number;
  totalProgress: number;
  specialProgress: ReturnType<typeof summarizeSpecials>;
}) {
  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <div className="p-5 md:p-7">
        <p className="eyebrow">Próxima ação</p>
        <h2 className="mt-1 text-3xl font-black md:text-5xl">
          {nextMatch ? "Fechar o próximo palpite" : "Tudo encaminhado"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {pendingMatches > 0
            ? `${pendingMatches} jogo${pendingMatches === 1 ? "" : "s"} aberto${pendingMatches === 1 ? "" : "s"} ainda sem palpite.`
            : "Sem jogo aberto pendente no momento."}
        </p>
        {nextMatch ? (
          <div className="mt-6 rounded-[1.5rem] border bg-surface-muted p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <LiveTeam team={nextMatch.homeTeam} dark={false} />
              <div className="rounded-2xl border bg-surface px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase text-muted">Início</p>
                <p className="mt-1 whitespace-nowrap text-xl font-black text-brand">
                  {nextMatch.timeLabel}
                </p>
              </div>
              <LiveTeam team={nextMatch.awayTeam} align="right" dark={false} />
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <LocalMatchDateTime
                scheduledAt={nextMatch.scheduledAt}
                fallbackDate={nextMatch.dateLabel}
                fallbackTime={nextMatch.timeLabel}
                includeZone
                className="text-xs font-bold text-muted"
              />
              <Link
                href="/palpites#lista-de-jogos"
                className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-black text-white"
              >
                Palpitar <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
      <div className="border-t bg-surface-muted/60 p-5 md:p-7 lg:border-l lg:border-t-0">
        <p className="eyebrow">Progresso</p>
        <div className="mt-5 grid gap-4">
          <ProgressLine label="Jogos" value={totalProgress} />
          <ProgressLine
            label="Especiais"
            value={specialProgress.percent}
            muted={!specialProgress.available}
          />
        </div>
      </div>
    </div>
  );
}

function PoolImpact({ snapshot }: { snapshot: PoolSnapshot }) {
  const ordered = [...snapshot.ranking].sort(
    (left, right) =>
      (left.provisionalPosition ?? left.position) -
        (right.provisionalPosition ?? right.position) ||
      left.name.localeCompare(right.name, "pt-BR"),
  );
  const [expanded, setExpanded] = useState(false);
  const [selectedPlayerKey, setSelectedPlayerKey] = useState(
    () => (snapshot.currentPlayer ? dashboardRankingKey(snapshot.currentPlayer) : ""),
  );
  const compactRows = ordered.slice(0, 5);
  const visibleRows = expanded ? ordered : compactRows;
  const fallbackPlayerKey = snapshot.currentPlayer
    ? dashboardRankingKey(snapshot.currentPlayer)
    : ordered[0]
      ? dashboardRankingKey(ordered[0])
      : "";
  const activePlayerKey = ordered.some(
    (player) => dashboardRankingKey(player) === selectedPlayerKey,
  )
    ? selectedPlayerKey
    : fallbackPlayerKey;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(13.5rem,0.68fr)_minmax(0,1.32fr)] lg:items-start">
      <div className="dashboard-pool-summary self-start rounded-[1.35rem] border bg-surface-muted p-3.5">
        <div className="flex items-center gap-3">
          <PoolFlag code={snapshot.pool.flagCode} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-base font-black">{snapshot.pool.name}</p>
            <p className="mt-0.5 text-xs font-bold text-muted">
              {snapshot.pool.members} jogadores
            </p>
          </div>
        </div>
        {snapshot.currentPlayer ? (
          <>
            <div className="mt-3">
              <MovementBadge snapshot={snapshot} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniDashboardStat
                label="Oficial"
                value={`${rankingLabel(snapshot.currentPlayer, snapshot.ranking)} · ${snapshot.currentPlayer.points} pts`}
              />
              <MiniDashboardStat
                label="Ao vivo"
                value={`${rankingLabel(snapshot.currentPlayer, snapshot.ranking, { provisional: true, tiedSuffix: "=" })} · ${snapshot.currentPlayer.provisionalPoints ?? snapshot.currentPlayer.points} pts`}
              />
            </div>
            {snapshot.gapToLeader > 0 ? (
              <p className="mt-3 rounded-2xl border bg-surface px-3 py-2 text-xs font-bold text-muted">
                {snapshot.gapToLeader} pts atrás de {snapshot.leader?.name}.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-5 rounded-2xl bg-surface p-4 text-sm font-bold text-muted">
            Sua posição aparece assim que o ranking tiver participantes.
          </p>
        )}
      </div>
      <div className="dashboard-ranking-list overflow-hidden rounded-[1.35rem] border bg-surface">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b bg-surface-muted/55 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted">
          <span className="text-center">Pos.</span>
          <span>Participante</span>
          <span className="text-right">Parcial</span>
        </div>
        {visibleRows.map((player) => {
          const key = dashboardRankingKey(player);
          const selected = key === activePlayerKey;

          return (
            <div key={key} className="border-b last:border-b-0">
              <button
                type="button"
                aria-expanded={selected}
                onClick={() => setSelectedPlayerKey(key)}
                className={`interactive grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left ${
                  selected ? "dashboard-ranking-row-selected" : player.isCurrentUser ? "dashboard-ranking-row-current" : "hover:bg-surface-muted/60"
                }`}
              >
                <span className={`text-center text-sm font-black ${selected ? "text-brand-strong/75" : "text-muted"}`}>
                  {rankingLabel(player, snapshot.ranking, { provisional: true, tiedSuffix: "=" })}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={player.name} initials={player.initials} avatarUrl={player.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{player.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className={`text-xs font-bold ${selected ? "text-brand-strong/70" : "text-muted"}`}>
                        {player.exact} exatas · {player.correct} acertos
                      </p>
                      {!selected ? <PlayerMovementChip player={player} /> : null}
                    </div>
                  </div>
                </div>
                <span className={`text-right text-sm font-black ${selected ? "text-brand-strong" : "text-brand"}`}>
                  {player.provisionalPoints ?? player.points} pts
                </span>
              </button>
              {selected ? (
                <DashboardRankingDetail player={player} snapshot={snapshot} />
              ) : null}
            </div>
          );
        })}
        {ordered.length > compactRows.length ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="dashboard-ranking-toggle interactive flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-black text-brand hover:bg-surface-muted"
          >
            {expanded ? (
              <>
                Mostrar menos <ChevronUp className="size-4" />
              </>
            ) : (
              <>
                Ver mais participantes ({ordered.length - compactRows.length}) <ChevronDown className="size-4" />
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DashboardRankingDetail({
  player,
  snapshot,
}: {
  player: RankingEntry;
  snapshot: PoolSnapshot;
}) {
  const points = player.provisionalPoints ?? player.points;
  const leaderPoints = snapshot.leader?.provisionalPoints ?? snapshot.leader?.points ?? points;
  const gap = Math.max(0, leaderPoints - points);

  return (
    <div className="dashboard-ranking-detail border-t px-4 py-3">
      <div className="grid grid-cols-2 gap-2">
        <MiniDashboardStat label="Oficial" value={`${rankingLabel(player, snapshot.ranking)} · ${player.points} pts`} />
        <MiniDashboardStat
          label="Ao vivo"
          value={`${rankingLabel(player, snapshot.ranking, { provisional: true, tiedSuffix: "=" })} · ${points} pts`}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
        <PlayerMovementChip player={player} />
        {gap > 0 && snapshot.leader ? <span>{gap} pts atrás de {snapshot.leader.name}</span> : <span>na disputa pela ponta</span>}
      </div>
    </div>
  );
}

function PoolSnapshotStrip({
  snapshots,
  selectedPoolId,
  onSelect,
}: {
  snapshots: PoolSnapshot[];
  selectedPoolId: string;
  onSelect: (poolId: string) => void;
}) {
  return (
    <div className="mt-4 rounded-[1.25rem] border bg-surface-muted/55 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">
          Bolões em movimento
        </p>
        <span className="rounded-full border bg-surface px-2 py-1 text-[10px] font-black text-muted">
          {snapshots.length}
        </span>
      </div>
      <CarouselRail
        ariaLabel="Bolões em movimento"
        initialCount={4}
        step={4}
        moreLabel="Ver mais bolões"
        trackClassName="auto-cols-[minmax(12.5rem,78vw)] gap-2 sm:auto-cols-[13.5rem]"
        buttonClassName="interactive mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border bg-surface px-4 py-2.5 text-xs font-black text-brand hover:border-brand/60"
      >
        {snapshots.map((snapshot) => {
          const selected = snapshot.pool.id === selectedPoolId;
          const player = snapshot.currentPlayer;

          return (
            <button
              key={snapshot.pool.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(snapshot.pool.id)}
              className={`interactive grid min-w-[12.5rem] gap-2 rounded-2xl border p-2.5 text-left sm:min-w-[13.5rem] ${
                selected ? "pool-snapshot-card-selected" : "bg-surface hover:border-brand/70"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <PoolFlag code={snapshot.pool.flagCode} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{snapshot.pool.name}</span>
                  <span className={`block text-xs font-bold ${selected ? "text-brand-strong/70" : "text-muted"}`}>
                    {snapshot.pool.members} jogadores
                  </span>
                </span>
              </span>
              <span className="grid grid-cols-3 gap-1.5 text-center">
                <SnapshotMiniMetric
                  selected={selected}
                  label="Pos."
                  value={player ? rankingLabel(player, snapshot.ranking, { provisional: true, tiedSuffix: "=" }) : "—"}
                />
                <SnapshotMiniMetric
                  selected={selected}
                  label="Parcial"
                  value={player ? `${player.provisionalPoints ?? player.points}` : "—"}
                />
                <SnapshotMiniMetric
                  selected={selected}
                  label="Mov."
                  value={snapshot.movement.delta === 0 ? "=" : `${snapshot.movement.delta > 0 ? "+" : ""}${snapshot.movement.delta}`}
                  tone={snapshot.movement.tone}
                />
              </span>
            </button>
          );
        })}
      </CarouselRail>
    </div>
  );
}

function SnapshotMiniMetric({
  label,
  value,
  selected,
  tone = "neutral",
}: {
  label: string;
  value: string;
  selected: boolean;
  tone?: "up" | "down" | "neutral";
}) {
  const toneClass =
    selected
      ? "border-brand-strong/15 bg-white/40 text-brand-strong"
      : tone === "up"
        ? "status-success"
        : tone === "down"
          ? "status-warning"
          : "bg-surface";

  return (
    <span className={`rounded-xl border px-2 py-1 ${toneClass}`}>
      <span className={`block text-[8px] font-black uppercase ${selected ? "text-brand-strong/60" : "text-muted"}`}>
        {label}
      </span>
      <span className="mt-0.5 block text-[11px] font-black">
        {value}
      </span>
    </span>
  );
}

function PlayerMovementChip({ player }: { player: RankingEntry }) {
  const movement = rankingMovement(player);
  const Icon = movement.icon;
  const toneClass =
    movement.tone === "up"
      ? "status-success"
      : movement.tone === "down"
        ? "status-warning"
        : "status-neutral";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${toneClass}`}>
      <Icon className="size-3" />
      {movement.label}
    </span>
  );
}

function ActionQueue({
  pendingMatches,
  specialProgress,
}: {
  pendingMatches: DemoMatch[];
  specialProgress: ReturnType<typeof summarizeSpecials>;
}) {
  return (
    <section className="rounded-[1.5rem] border bg-surface/88 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Fila de ações</p>
          <h2 className="mt-1 text-2xl font-black">O que falta</h2>
        </div>
        <ListChecks className="size-5 text-brand" />
      </div>
      <ProgressiveList
        initialCount={5}
        step={5}
        autoLoad={false}
        moreLabel="Ver mais pendências"
        className="mt-4 grid gap-3"
      >
        {pendingMatches.map((match) => (
          <Link
            key={match.id}
            href="/palpites#lista-de-jogos"
            className="interactive grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-surface-muted p-3 hover:border-brand/70"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                {match.homeTeam.shortName} x {match.awayTeam.shortName}
              </p>
              <LocalMatchDateTime
                scheduledAt={match.scheduledAt}
                fallbackDate={match.dateLabel}
                fallbackTime={match.timeLabel}
                includeZone
                className="mt-1 block text-xs font-bold text-muted"
              />
            </div>
            <ArrowRight className="size-4 text-brand" />
          </Link>
        ))}
      </ProgressiveList>
      <div className={pendingMatches.length > 0 ? "mt-3 grid gap-3" : "mt-4 grid gap-3"}>
        {specialProgress.next ? (
          <Link
            href={`/especiais/${specialProgress.next.key}`}
            className="interactive grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-surface-muted p-3 hover:border-brand/70"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{specialProgress.next.title}</p>
              <p className="mt-1 text-xs font-bold text-muted">
                {specialProgress.next.remaining} escolha{specialProgress.next.remaining === 1 ? "" : "s"} pendente{specialProgress.next.remaining === 1 ? "" : "s"}
              </p>
            </div>
            <Sparkles className="size-4 text-brand" />
          </Link>
        ) : null}
        {pendingMatches.length === 0 && !specialProgress.next && (
          <EmptyState
            icon={ListChecks}
            title="Nada pendente agora"
            description="Quando abrir um novo jogo ou palpite final, ele aparece aqui como próximo passo."
            className="bg-surface-muted shadow-none"
          />
        )}
      </div>
    </section>
  );
}

function FinishedPulse({
  completedMatches,
  awaitingOfficial,
  matches,
  resultFor,
  predictionFor,
}: {
  completedMatches: number;
  awaitingOfficial: number;
  matches: DemoMatch[];
  resultFor: (match: DemoMatch) => MatchResult | undefined;
  predictionFor: (match: DemoMatch) => ScorePrediction | undefined;
}) {
  const scoredMatches = matches
    .map((match) => {
      const result = resultFor(match);
      const prediction = predictionFor(match);
      return {
        match,
        result,
        prediction,
        score: result && prediction ? calculateScore(prediction, result, match.stage) : null,
      };
    })
    .filter((item) => item.score)
    .reverse();

  return (
    <section className="rounded-[1.5rem] border bg-surface/88 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Pontuação fechada</p>
          <h2 className="mt-1 text-2xl font-black">{completedMatches} jogos</h2>
        </div>
        {awaitingOfficial > 0 ? (
          <CircleAlert className="size-5 text-warning-fg" />
        ) : (
          <CircleDot className="size-5 text-brand" />
        )}
      </div>
      <ProgressiveList
        initialCount={5}
        step={5}
        autoLoad={false}
        moreLabel="Ver mais jogos pontuados"
        className="mt-4 grid gap-2"
      >
        {scoredMatches.map((item) => (
          <ScoredMatchPulseRow key={item.match.id} item={item} />
        ))}
      </ProgressiveList>
      <div className={scoredMatches.length > 0 ? "mt-2" : "mt-4"}>
        {scoredMatches.length === 0 && (
          <EmptyState
            icon={CircleDot}
            title="Pontuação em aquecimento"
            description="Os pontos aparecem depois dos primeiros resultados confirmados."
            className="bg-surface-muted shadow-none"
          />
        )}
      </div>
    </section>
  );
}

function GlobalSpecialRankingPanel({
  ranking,
  specialsOverview,
}: {
  ranking: SpecialGlobalRankingOverview;
  specialsOverview: SpecialMarketsOverview;
}) {
  const markets = specialsOverview.available ? specialsOverview.markets : [];
  const resolvedMarkets = markets.filter(
    (market) => market.status === "resolved" && market.results.length > 0,
  );
  const lockedMarkets = markets.filter(
    (market) => market.locked && market.status !== "void",
  ).length;
  const scoreableMarkets = lockedMarkets || markets.length;
  const leader = ranking.entries[0] ?? null;
  const currentEntry = ranking.entries.find((entry) => entry.isCurrentUser) ?? null;
  const participantCount = ranking.participantCount || ranking.entries.length;

  return (
    <section
      id="palpites-finais-globais"
      data-testid="dashboard-special-global-ranking"
      className="mt-6 rounded-[1.5rem] border bg-surface/88 p-4 md:p-5"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.65fr)] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Palpites finais globais</p>
              <h2 className="mt-1 text-2xl font-black">Bolão dos finais</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Resultados publicados, acertos e pontuação geral dos especiais.
              </p>
            </div>
            <Link
              href="/especiais"
              className="interactive inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-black text-white"
            >
              Ver finais <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <GlobalSpecialMiniStat
              icon={Trophy}
              label="Ponta"
              value={leader ? `${leader.points} pts` : "—"}
              detail={leader?.name ?? "sem líder ainda"}
            />
            <GlobalSpecialMiniStat
              icon={Target}
              label="Resultados"
              value={`${resolvedMarkets.length}/${markets.length}`}
              detail={resolvedMarkets.length > 0 ? "finais pontuados" : "aguardando oficiais"}
            />
            <GlobalSpecialMiniStat
              icon={Medal}
              label="Minha posição"
              value={currentEntry ? `${currentEntry.position}º` : "—"}
              detail={currentEntry ? `${currentEntry.points} pts` : "sem entrada global"}
            />
          </div>

          <SpecialResultsDigest markets={markets} />
        </div>

        <GlobalSpecialRankingList
          ranking={ranking}
          totalMarkets={scoreableMarkets}
          participantCount={participantCount}
        />
      </div>
    </section>
  );
}

function GlobalSpecialMiniStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="dashboard-soft-stat rounded-2xl border bg-surface-muted px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase text-muted">{label}</p>
        <Icon className="size-4 text-brand" />
      </div>
      <p className="mt-2 truncate text-lg font-black">{value}</p>
      <p className="mt-0.5 truncate text-xs font-bold text-muted">{detail}</p>
    </div>
  );
}

function SpecialResultsDigest({ markets }: { markets: SpecialMarketView[] }) {
  const marketsWithResults = markets.filter((market) => market.results.length > 0);

  return (
    <div className="mt-4 rounded-[1.35rem] border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b bg-surface-muted/55 px-4 py-3">
        <div>
          <p className="eyebrow">Resultados dos finais</p>
          <h3 className="mt-1 text-base font-black">Oficiais publicados</h3>
        </div>
        <span className="rounded-full border bg-surface px-2.5 py-1 text-[10px] font-black text-muted">
          {marketsWithResults.length}
        </span>
      </div>
      {marketsWithResults.length > 0 ? (
        <ProgressiveList
          initialCount={4}
          step={4}
          autoLoad={false}
          moreLabel="Ver mais resultados"
          className="divide-y"
          buttonClassName="dashboard-ranking-toggle interactive flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-black text-brand hover:bg-surface-muted"
        >
          {marketsWithResults.map((market) => (
            <SpecialResultRow key={market.id} market={market} />
          ))}
        </ProgressiveList>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Resultados finais em espera"
          description="Quando um especial for resolvido, o resultado aparece aqui junto da pontuação."
          className="m-3 bg-surface-muted shadow-none"
        />
      )}
    </div>
  );
}

function SpecialResultRow({ market }: { market: SpecialMarketView }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{market.title}</p>
        <p className="mt-1 truncate text-xs font-bold text-muted">
          {specialResultText(market)}
        </p>
      </div>
      <span className="rounded-xl bg-surface-muted px-3 py-2 text-right text-xs font-black text-brand">
        {market.partialPoints > 0
          ? `${market.exactPoints}/${market.partialPoints} pts`
          : `${market.exactPoints} pts`}
      </span>
    </div>
  );
}

function GlobalSpecialRankingList({
  ranking,
  totalMarkets,
  participantCount,
}: {
  ranking: SpecialGlobalRankingOverview;
  totalMarkets: number;
  participantCount: number;
}) {
  if (!ranking.available) {
    return (
      <div className="rounded-[1.35rem] border bg-surface">
        <EmptyState
          icon={Trophy}
          title="Ranking global em publicação"
          description={ranking.missingReason ?? "A classificação dos finais ainda não está disponível."}
          className="m-3 bg-surface-muted shadow-none"
        />
      </div>
    );
  }

  if (ranking.entries.length === 0) {
    return (
      <div className="rounded-[1.35rem] border bg-surface">
        <EmptyState
          icon={Trophy}
          title="Ranking global em espera"
          description="A lista aparece depois que os finais bloquearem e tiverem participantes."
          className="m-3 bg-surface-muted shadow-none"
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.35rem] border bg-surface">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b bg-surface-muted/55 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted">
        <span className="text-center">Pos.</span>
        <span>Participante</span>
        <span className="text-right">Pontos</span>
      </div>
      <ProgressiveList
        initialCount={7}
        step={7}
        autoLoad={false}
        moreLabel="Ver mais participantes"
        className="divide-y"
        buttonClassName="dashboard-ranking-toggle interactive flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-black text-brand hover:bg-surface-muted"
      >
        {ranking.entries.map((entry) => (
          <GlobalSpecialRankingRow
            key={`${entry.position}-${entry.name}`}
            entry={entry}
            totalMarkets={totalMarkets}
          />
        ))}
      </ProgressiveList>
      {participantCount > ranking.entries.length ? (
        <p className="border-t bg-surface-muted/55 px-4 py-2 text-center text-[11px] font-bold text-muted">
          Mostrando {ranking.entries.length} de {participantCount} participantes.
        </p>
      ) : null}
    </div>
  );
}

function GlobalSpecialRankingRow({
  entry,
  totalMarkets,
}: {
  entry: SpecialGlobalRankingEntry;
  totalMarkets: number;
}) {
  return (
    <div
      data-testid={entry.isCurrentUser ? "dashboard-special-ranking-current-user" : undefined}
      className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 ${
        entry.isCurrentUser ? "dashboard-ranking-row-current" : "hover:bg-surface-muted/60"
      }`}
    >
      <span className="text-center text-sm font-black text-muted">
        {entry.position}º
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar
          name={entry.name}
          initials={entry.initials}
          avatarUrl={entry.avatarUrl}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{entry.name}</p>
          <p className="mt-1 truncate text-xs font-bold text-muted">
            {entry.exactHits} exato{entry.exactHits === 1 ? "" : "s"} ·{" "}
            {entry.partialHits} parcial{entry.partialHits === 1 ? "" : "is"} ·{" "}
            {specialCompletionText(entry, totalMarkets)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-base font-black text-brand">{entry.points}</p>
        <p className="text-[10px] font-black uppercase text-muted">pts</p>
      </div>
    </div>
  );
}

function ScoredMatchPulseRow({
  item,
}: {
  item: {
    match: DemoMatch;
    result: MatchResult | undefined;
    prediction: ScorePrediction | undefined;
    score: ScoreBreakdown | null;
  };
}) {
  return (
    <details className="group overflow-hidden rounded-2xl bg-surface-muted">
      <summary className="interactive grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate text-sm font-black">
            {item.match.homeTeam.shortName} x {item.match.awayTeam.shortName}
          </span>
          <span className="mt-1 block truncate text-xs font-bold text-muted">
            Palpite {predictionText(item.prediction)} · resultado {item.result?.homeScore} x {item.result?.awayScore}
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-black text-brand">
          {item.score?.totalPoints} pts
          <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid gap-2 border-t bg-surface/75 p-3 sm:grid-cols-3">
        <MiniDashboardStat label="Categoria" value={item.score ? scoreCategoryLabel(item.score.category) : "sem cálculo"} />
        <MiniDashboardStat label="Pontos do placar" value={item.score ? `${item.score.matchPoints} pts` : "—"} />
        <MiniDashboardStat
          label={item.match.stage === "group" ? "Multiplicador" : "Avanço"}
          value={
            item.match.stage === "group"
              ? item.score
                ? `${item.score.multiplier}x`
                : "—"
              : item.score
                ? `${item.score.advancementPoints} pts`
                : "—"
          }
        />
      </div>
    </details>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  text,
  href,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mt-5 rounded-[1.35rem] border bg-surface-muted p-5">
      <Icon className="size-6 text-brand" />
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
      <Link
        href={href}
        className="interactive mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-black text-white"
      >
        {action} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function MovementBadge({ snapshot }: { snapshot: PoolSnapshot }) {
  const Icon =
    snapshot.movement.tone === "up"
      ? TrendingUp
      : snapshot.movement.tone === "down"
        ? TrendingDown
        : BarChart3;
  const toneClass =
    snapshot.movement.tone === "up"
      ? "status-success"
      : snapshot.movement.tone === "down"
        ? "status-warning"
        : "status-neutral";

  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <p className="text-sm font-black">{snapshot.movement.label}</p>
      </div>
      <p className="mt-1 text-xs font-bold text-muted">
        {snapshot.livePoints > 0
          ? `+${snapshot.livePoints} pts no parcial`
          : "sem ponto parcial neste momento"}
      </p>
    </div>
  );
}

function MiniDashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-soft-stat rounded-2xl border bg-surface px-3 py-2.5">
      <p className="text-[10px] font-black uppercase text-muted">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function LiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
      <p className="text-[10px] font-black uppercase text-white/55">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ProgressLine({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black">{label}</p>
        <p className="text-sm font-black text-brand">{muted ? "—" : `${value}%`}</p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full ${muted ? "bg-surface-muted" : "bg-brand"}`}
          style={{ width: `${muted ? 12 : Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function LiveTeam({
  team,
  align = "left",
  dark = true,
}: {
  team: DemoMatch["homeTeam"];
  align?: "left" | "right";
  dark?: boolean;
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className={`flex ${align === "right" ? "justify-end" : ""}`}>
        <TeamFlag team={team} size="lg" />
      </div>
      <p className={`mt-2 truncate text-sm font-black ${dark ? "text-white" : "text-foreground"}`}>
        {team.shortName}
      </p>
    </div>
  );
}

function buildLiveMatchView(
  match: DemoMatch,
  prediction?: ScorePrediction,
): LiveMatchView {
  return {
    match,
    prediction,
    score: prediction && match.liveResult
      ? calculateScore(prediction, match.liveResult, match.stage)
      : undefined,
  };
}

function rankingForPool({
  pool,
  matches,
  rankingsByPool,
  fallbackRanking,
  localPredictions,
  localResults,
  usesSupabase,
}: {
  pool: PoolSummary;
  matches: DemoMatch[];
  rankingsByPool: Record<string, RankingEntry[]>;
  fallbackRanking: RankingEntry[];
  localPredictions: Record<string, ScorePrediction>;
  localResults: Record<string, MatchResult>;
  usesSupabase: boolean;
}) {
  const remoteRanking = rankingsByPool[pool.id] ?? fallbackRanking;
  const baseRanking = remoteRanking.length
    ? remoteRanking
    : demoRanking.filter((player) => player.isCurrentUser);

  if (usesSupabase) return baseRanking;

  const officialRanking = calculateDemoRanking(
    baseRanking,
    matches,
    localPredictions,
    localResults,
    pool.eligibleFrom,
  );

  return applyLiveProvisionalRanking(officialRanking, matches, localPredictions);
}

function applyLiveProvisionalRanking(
  ranking: RankingEntry[],
  matches: DemoMatch[],
  localPredictions: Record<string, ScorePrediction>,
) {
  const livePoints = matches.reduce((total, match) => {
    const prediction = localPredictions[match.id] ?? match.prediction;
    if (!isLiveMatch(match) || !match.liveResult || !prediction) return total;
    return total + calculateScore(prediction, match.liveResult, match.stage).totalPoints;
  }, 0);
  if (livePoints === 0) {
    return ranking.map((player) => ({
      ...player,
      provisionalPoints: player.provisionalPoints ?? player.points,
      provisionalPosition: player.provisionalPosition ?? player.position,
    }));
  }

  const withProvisional = ranking.map((player) => ({
    ...player,
    provisionalPoints: player.points + (player.isCurrentUser ? livePoints : 0),
  }));
  const ordered = [...withProvisional].sort(
    (left, right) =>
      (right.provisionalPoints ?? right.points) -
        (left.provisionalPoints ?? left.points) ||
      right.exact - left.exact ||
      right.correct - left.correct ||
      left.name.localeCompare(right.name, "pt-BR"),
  );
  const provisionalPositions = new Map(
    ordered.map((player, index) => [player.name, index + 1]),
  );

  return withProvisional.map((player) => ({
    ...player,
    provisionalPosition: provisionalPositions.get(player.name) ?? player.position,
  }));
}

function buildPoolSnapshot({
  pool,
  ranking,
}: {
  pool: PoolSummary;
  ranking: RankingEntry[];
}): PoolSnapshot {
  const currentPlayer = ranking.find((player) => player.isCurrentUser);
  const orderedByLive = [...ranking].sort(
    (left, right) =>
      (left.provisionalPosition ?? left.position) -
        (right.provisionalPosition ?? right.position) ||
      left.name.localeCompare(right.name, "pt-BR"),
  );
  const leader = orderedByLive[0];
  const currentPoints = currentPlayer?.provisionalPoints ?? currentPlayer?.points ?? 0;
  const leaderPoints = leader?.provisionalPoints ?? leader?.points ?? currentPoints;
  const provisionalPosition =
    currentPlayer?.provisionalPosition ?? currentPlayer?.position ?? 0;
  const officialPosition = currentPlayer?.position ?? provisionalPosition;
  const delta = officialPosition - provisionalPosition;

  return {
    pool,
    ranking,
    currentPlayer,
    leader,
    movement: {
      delta,
      tone: delta > 0 ? "up" : delta < 0 ? "down" : "neutral",
      label:
        delta > 0
          ? `sobe ${delta}`
          : delta < 0
            ? `cai ${Math.abs(delta)}`
            : "mantém posição",
    },
    livePoints: currentPlayer
      ? Math.max(0, (currentPlayer.provisionalPoints ?? currentPlayer.points) - currentPlayer.points)
      : 0,
    gapToLeader: Math.max(0, leaderPoints - currentPoints),
  };
}

function summarizeSpecials(overview: SpecialMarketsOverview) {
  if (!overview.available) {
    return {
      available: false,
      total: 0,
      completed: 0,
      pending: 0,
      percent: 0,
      detail: overview.missingReason ?? "indisponível",
      next: null as null | {
        key: string;
        title: string;
        remaining: number;
      },
    };
  }

  const total = overview.markets.length;
  const completed = overview.markets.filter(
    (market) => market.predictions.length >= market.pickCount,
  ).length;
  const openPending = overview.markets
    .filter((market) => !market.locked && market.predictions.length < market.pickCount)
    .map((market) => ({
      key: market.key,
      title: market.title,
      remaining: market.pickCount - market.predictions.length,
    }));
  const pending = openPending.length;

  return {
    available: true,
    total,
    completed,
    pending,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    detail: pending > 0 ? `${pending} abertos pendentes` : "em dia",
    next: openPending[0] ?? null,
  };
}

function compareSnapshots(left: PoolSnapshot, right: PoolSnapshot) {
  return (
    (right.currentPlayer?.provisionalPoints ?? right.currentPlayer?.points ?? -1) -
      (left.currentPlayer?.provisionalPoints ?? left.currentPlayer?.points ?? -1) ||
    (left.currentPlayer?.provisionalPosition ?? left.currentPlayer?.position ?? 999) -
      (right.currentPlayer?.provisionalPosition ?? right.currentPlayer?.position ?? 999)
  );
}

function rankingSummary(snapshot: PoolSnapshot) {
  if (!snapshot.currentPlayer) return "ranking aberto";
  return `${rankingLabel(snapshot.currentPlayer, snapshot.ranking, { provisional: true, tiedSuffix: "=" })} · ${snapshot.currentPlayer.provisionalPoints ?? snapshot.currentPlayer.points} pts`;
}

function rankingMovement(player: RankingEntry): {
  label: string;
  tone: "neutral" | "up" | "down";
  icon: typeof BarChart3;
} {
  if (!player.provisionalPosition || player.provisionalPosition === player.position) {
    return { label: "mantém", tone: "neutral", icon: BarChart3 };
  }
  if (player.provisionalPosition < player.position) {
    return {
      label: `sobe ${player.position - player.provisionalPosition}`,
      tone: "up",
      icon: TrendingUp,
    };
  }
  return {
    label: `cai ${player.provisionalPosition - player.position}`,
    tone: "down",
    icon: TrendingDown,
  };
}

function scoreCategoryLabel(category: ScoreBreakdown["category"]) {
  if (category === "exact") return "cravado";
  if (category === "refined") return "refinado";
  if (category === "result") return "resultado";
  if (category === "one-score") return "um placar";
  return "sem acerto";
}

function providerUpdateText(match: DemoMatch) {
  if (!match.providerUpdatedAt) return "agora";
  const date = new Date(match.providerUpdatedAt);
  if (Number.isNaN(date.getTime())) return "sincronizado";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function predictionText(prediction?: ScorePrediction | null) {
  if (!prediction) return "sem palpite";
  return `${prediction.homeScore} x ${prediction.awayScore}`;
}

function specialResultText(market: SpecialMarketView) {
  const labels = market.results.map((result) => result.label);
  if (labels.length === 0) return "Resultado a confirmar";
  if (labels.length <= 2) return labels.join(" · ");
  return `${labels.slice(0, 2).join(" · ")} +${labels.length - 2}`;
}

function specialCompletionText(
  entry: SpecialGlobalRankingEntry,
  totalMarkets: number,
) {
  if (totalMarkets <= 0) {
    return `${entry.completedMarkets} fina${entry.completedMarkets === 1 ? "l" : "is"}`;
  }
  return `${entry.completedMarkets}/${totalMarkets} finais`;
}

function dashboardRankingKey(player: RankingEntry) {
  return player.userId ?? `${player.position}:${player.name}`;
}
