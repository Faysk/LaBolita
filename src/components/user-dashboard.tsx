"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  ListChecks,
  Radio,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import { PoolFlag } from "@/components/pool-flag";
import { TeamFlag } from "@/components/team-flag";
import { UserAvatar } from "@/components/user-avatar";
import { demoRanking } from "@/lib/demo-data";
import { calculateDemoRanking } from "@/lib/demo-engine";
import type { PoolsOverview } from "@/lib/data/pools";
import type { SpecialMarketsOverview } from "@/lib/data/specials";
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
  matches,
  poolsOverview,
  specialsOverview,
}: {
  matches: DemoMatch[];
  poolsOverview: PoolsOverview;
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
            Painel
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Seu placar, suas pendências e o impacto dos jogos nos bolões.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <DashboardAction href="/palpites" icon={Target}>Palpites</DashboardAction>
          <DashboardAction href="/boloes" icon={Trophy}>Bolões</DashboardAction>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardMetric
          icon={CheckCircle2}
          label="Palpites salvos"
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

      <section className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <div className="min-w-0 rounded-[1.5rem] border bg-surface/88 p-4 md:p-5">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Disputa nos bolões</p>
              <h2 className="mt-1 text-2xl font-black">Ranking em movimento</h2>
            </div>
            {activePools.length > 1 && (
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1 md:max-w-md">
                {activePools.map((pool) => (
                  <button
                    key={pool.id}
                    type="button"
                    aria-pressed={pool.id === selectedPool?.id}
                    onClick={() => setSelectedPoolId(pool.id)}
                    className={`interactive flex min-w-[11rem] items-center gap-2 rounded-2xl border px-3 py-2 text-left ${
                      pool.id === selectedPool?.id
                        ? "bg-brand text-white"
                        : "bg-surface-muted text-foreground hover:border-brand/70"
                    }`}
                  >
                    <PoolFlag code={pool.flagCode} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{pool.name}</span>
                      <span className={`block text-xs font-bold ${pool.id === selectedPool?.id ? "text-white/65" : "text-muted"}`}>
                        {pool.members} jogadores
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            pendingMatches={pendingMatches.slice(0, 3)}
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

function DashboardAction({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border bg-surface px-4 text-sm font-black text-brand hover:border-brand/70"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
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
  const primary = liveMatches[0];
  const score = primary.match.liveResult;

  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
      <div className="bg-brand-strong p-5 text-white md:p-7">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase text-accent">
          <Radio className="size-3.5 animate-pulse" />
          Agora ao vivo
        </p>
        <h2 className="mt-4 text-3xl font-black md:text-5xl">
          Pontos mudando em tempo real
        </h2>
        <div className="mt-6 rounded-[1.5rem] border border-white/15 bg-white/10 p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <LiveTeam team={primary.match.homeTeam} />
            <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-3 text-center">
              <p className="text-[10px] font-black uppercase text-white/55">Parcial</p>
              <p className="mt-1 whitespace-nowrap text-3xl font-black text-accent">
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

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-[1.35rem] border bg-surface-muted p-4">
        <div className="flex items-start gap-3">
          <PoolFlag code={snapshot.pool.flagCode} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-xl font-black">{snapshot.pool.name}</p>
            <p className="mt-1 text-sm font-bold text-muted">
              {snapshot.pool.members} jogadores
            </p>
          </div>
        </div>
        {snapshot.currentPlayer ? (
          <>
            <div className="mt-5">
              <MovementBadge snapshot={snapshot} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
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
              <p className="mt-3 text-xs font-bold text-muted">
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
      <div className="overflow-hidden rounded-[1.35rem] border bg-surface">
        {ordered.slice(0, 5).map((player) => (
          <div
            key={`${player.position}-${player.name}`}
            className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0 ${
              player.isCurrentUser ? "bg-accent/20" : ""
            }`}
          >
            <span className="text-center text-sm font-black text-muted">
              {rankingLabel(player, snapshot.ranking, { provisional: true, tiedSuffix: "=" })}
            </span>
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={player.name} initials={player.initials} avatarUrl={player.avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{player.name}</p>
                <p className="text-xs font-bold text-muted">
                  {player.exact} exatas · {player.correct} acertos
                </p>
              </div>
            </div>
            <span className="text-right text-sm font-black text-brand">
              {player.provisionalPoints ?? player.points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
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
      <div className="mt-4 grid gap-3">
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
          <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            Sem pendência aberta agora.
          </p>
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
    .slice(-3)
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
      <div className="mt-4 grid gap-2">
        {scoredMatches.map((item) => (
          <div key={item.match.id} className="rounded-2xl bg-surface-muted p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-black">
                {item.match.homeTeam.shortName} x {item.match.awayTeam.shortName}
              </p>
              <span className="text-sm font-black text-brand">
                {item.score?.totalPoints} pts
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-muted">
              Palpite {predictionText(item.prediction)} · resultado {item.result?.homeScore} x {item.result?.awayScore}
            </p>
          </div>
        ))}
        {scoredMatches.length === 0 && (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            Os pontos aparecem depois dos primeiros resultados confirmados.
          </p>
        )}
      </div>
    </section>
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
        : "status-info";

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <p className="text-sm font-black">{snapshot.movement.label}</p>
      </div>
      <p className="mt-1 text-xs font-bold">
        {snapshot.livePoints > 0
          ? `+${snapshot.livePoints} pts no parcial`
          : "sem ponto parcial neste momento"}
      </p>
    </div>
  );
}

function MiniDashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-surface p-3">
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

function predictionText(prediction?: ScorePrediction | null) {
  if (!prediction) return "sem palpite";
  return `${prediction.homeScore} x ${prediction.awayScore}`;
}
