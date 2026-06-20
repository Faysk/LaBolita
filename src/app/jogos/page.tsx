import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListChecks,
  Radio,
} from "lucide-react";
import { GamesMatchExplorer } from "@/components/games-match-explorer";
import { LiveRefresh } from "@/components/live-refresh";
import { MatchTimeline } from "@/components/match-timeline";
import { PageShortcuts } from "@/components/page-shortcuts";
import { getMatches } from "@/lib/data/matches";
import { getPredictionComparisonOverview } from "@/lib/data/prediction-comparisons";
import { isLiveMatch } from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

export const metadata: Metadata = {
  title: "Agenda de jogos",
  description: "Agenda compacta com jogos ao vivo, próximos jogos e resultados.",
};

export default async function GamesPage() {
  const matches = await getMatches();
  const comparisonOverview = await getPredictionComparisonOverview(matches);
  const liveMatches = matches.filter(isLiveMatch);
  const nextMatches = selectUpcomingMatches(matches);
  const recentMatches = selectRecentMatches(matches);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );
  const groups = groupMatchesByDate(matches);

  return (
    <main className="page-container py-7 md:py-10">
      <LiveRefresh active={liveMatches.length > 0 || awaitingOfficial} />
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Linha do tempo</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Agenda de jogos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Ao vivo, próximos e encerrados no mesmo lugar, com seu palpite
            aparecendo junto quando existir.
          </p>
        </div>
        <Link
          href="/palpites"
          className="interactive inline-flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-brand"
        >
          Abrir palpites <ArrowRight className="size-4" />
        </Link>
      </div>

      <PageShortcuts
        routeKeys={["live", "predictions", "pools", "players"]}
        className="mb-6"
      />

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <ScheduleMetric
          icon={Radio}
          label="Ao vivo"
          value={liveMatches.length}
          detail={liveMatches.length > 0 ? "acompanhe agora" : "nenhum jogo agora"}
          tone={liveMatches.length > 0 ? "live" : "neutral"}
        />
        <ScheduleMetric
          icon={CalendarDays}
          label="Próximos"
          value={nextMatches.length}
          detail="prontos para palpitar"
          tone="info"
        />
        <ScheduleMetric
          icon={Clock3}
          label="A confirmar"
          value={matches.filter((match) => match.providerStatus === "finished" && !match.result).length}
          detail="aguardando oficial"
          tone={awaitingOfficial ? "warning" : "neutral"}
        />
        <ScheduleMetric
          icon={CheckCircle2}
          label="Finalizados"
          value={matches.filter((match) => match.result).length}
          detail={`${matches.length} jogos no calendário`}
          tone="neutral"
        />
      </section>

      <section className="rounded-[1.5rem] border bg-surface p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Trilha rápida</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">
              Agora, próximos e resultados
            </h2>
          </div>
          <ListChecks className="size-5 text-brand" />
        </div>
        <div className="grid gap-5">
          {liveMatches.length > 0 ? (
            <ScheduleRail
              eyebrow="Acontecendo agora"
              title="Ao vivo"
              matches={liveMatches}
              live
              showPrediction
              href="/palpites#lista-de-jogos"
              hrefMatchParam="jogo"
              actionLabel="Abrir palpite e comparação"
            />
          ) : null}
          <ScheduleRail
            eyebrow="Próximos da fila"
            title="Próximos jogos"
            matches={nextMatches}
            showPrediction
            initialCount={6}
            moreLabel="Ver mais próximos jogos"
            href="/palpites#lista-de-jogos"
            hrefMatchParam="jogo"
            actionLabel="Abrir este palpite"
          />
          {recentMatches.length > 0 ? (
            <ScheduleRail
              eyebrow="Já passaram"
              title="Últimos resultados"
              matches={recentMatches}
              showPrediction
              initialCount={6}
              moreLabel="Ver mais últimos resultados"
              href="/palpites#lista-de-jogos"
              hrefMatchParam="jogo"
              actionLabel="Comparar este jogo"
            />
          ) : null}
        </div>
      </section>

      <GamesMatchExplorer matches={matches} comparisonOverview={comparisonOverview} />

      <section className="mt-8 space-y-6">
        <div>
          <p className="eyebrow">Todos os horários</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Agenda completa</h2>
        </div>
        {groups.map(([date, groupMatches]) => (
          <section key={date} className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-5">
            <div className="md:pt-4">
              <h3 className="sticky top-24 rounded-2xl bg-surface-muted px-4 py-3 text-sm font-black text-brand">
                {date}
              </h3>
            </div>
            <MatchTimeline
              matches={groupMatches}
              showPrediction
              initialCount={8}
              moreLabel="Ver mais jogos deste dia"
              href="/palpites#lista-de-jogos"
              hrefMatchParam="jogo"
              actionLabel="Abrir este palpite"
            />
          </section>
        ))}
      </section>
    </main>
  );
}

function ScheduleRail({
  eyebrow,
  title,
  matches,
  live = false,
  showPrediction = false,
  initialCount,
  moreLabel,
  href,
  hrefMatchParam,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  matches: DemoMatch[];
  live?: boolean;
  showPrediction?: boolean;
  initialCount?: number;
  moreLabel?: string;
  href?: string;
  hrefMatchParam?: string;
  actionLabel?: string;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-lg font-black">{title}</h3>
        </div>
        {live ? (
          <Radio className="live-icon size-4" />
        ) : (
          <CalendarDays className="size-4 text-brand" />
        )}
      </div>
      <MatchTimeline
        matches={matches}
        variant="rail"
        showPrediction={showPrediction}
        initialCount={initialCount}
        moreLabel={moreLabel}
        href={href}
        hrefMatchParam={hrefMatchParam}
        actionLabel={actionLabel}
      />
    </section>
  );
}

function ScheduleMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number;
  detail: string;
  tone: "neutral" | "info" | "live" | "warning";
}) {
  const toneClass =
    tone === "live"
      ? "status-live"
      : tone === "warning"
        ? "status-warning"
        : tone === "info"
          ? "status-info"
          : "bg-surface";

  return (
    <article className={`rounded-[1.2rem] border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className={`size-4 ${tone === "live" ? "live-icon" : ""}`} />
        <p className="text-right text-[10px] font-black uppercase text-muted">
          {label}
        </p>
      </div>
      <p className={`mt-3 text-2xl font-black ${tone === "live" && value > 0 ? "live-number" : ""}`}>{value}</p>
      <p className="mt-1 text-xs font-bold text-muted">{detail}</p>
    </article>
  );
}

function groupMatchesByDate(matches: DemoMatch[]) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  });
  const groups = new Map<string, DemoMatch[]>();

  for (const match of matches) {
    const date = match.scheduledAt
      ? formatter.format(new Date(match.scheduledAt)).replace(".", "")
      : match.dateLabel;
    groups.set(date, [...(groups.get(date) ?? []), match]);
  }

  return [...groups.entries()];
}

function selectUpcomingMatches(matches: DemoMatch[]) {
  return matches
    .filter(
      (match) =>
        !isLiveMatch(match) &&
        !match.locked &&
        !match.result &&
        match.providerStatus !== "finished",
    )
    .sort((left, right) => scheduledTime(left) - scheduledTime(right));
}

function selectRecentMatches(matches: DemoMatch[]) {
  return matches
    .filter((match) => Boolean(match.result) || match.providerStatus === "finished")
    .sort((left, right) => scheduledTime(right) - scheduledTime(left));
}

function scheduledTime(match: DemoMatch) {
  const value = match.scheduledAt
    ? new Date(match.scheduledAt).getTime()
    : Number.MAX_SAFE_INTEGER;
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}
