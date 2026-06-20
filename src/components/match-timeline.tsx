import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, Radio, Target } from "lucide-react";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import { ProgressiveList } from "@/components/progressive-list";
import { TeamFlag } from "@/components/team-flag";
import { isLiveMatch } from "@/lib/match-display";
import { predictionLabel } from "@/lib/prediction-comparisons";
import type { DemoMatch } from "@/lib/types";

type MatchTimelineProps = {
  matches: DemoMatch[];
  variant?: "rail" | "list";
  href?: string;
  showPrediction?: boolean;
  initialCount?: number;
  step?: number;
  moreLabel?: string;
  actionLabel?: string;
};

export function MatchTimeline({
  matches,
  variant = "list",
  href,
  showPrediction = false,
  initialCount,
  step,
  moreLabel = "Ver mais jogos",
  actionLabel = "Ver agenda",
}: MatchTimelineProps) {
  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border bg-surface-muted p-5 text-sm font-bold text-muted">
        A agenda ainda não foi importada.
      </p>
    );
  }

  if (variant === "rail") {
    const cards = matches.map((match) => (
      <TimelineCard
        key={match.id}
        match={match}
        href={href}
        compact
        showPrediction={showPrediction}
        actionLabel={actionLabel}
      />
    ));

    if (initialCount) {
      return (
        <ProgressiveList
          initialCount={initialCount}
          step={step ?? initialCount}
          moreLabel={moreLabel}
          className="grid min-w-0 max-w-full snap-x auto-cols-[minmax(17rem,85vw)] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[18rem] lg:auto-cols-[20rem]"
          buttonClassName="interactive mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border bg-surface-muted px-4 py-3 text-xs font-black text-brand hover:border-brand/60"
        >
          {cards}
        </ProgressiveList>
      );
    }

    return (
      <div className="min-w-0 max-w-full snap-x overflow-x-auto pb-2">
        <div className="grid auto-cols-[minmax(17rem,85vw)] grid-flow-col gap-3 sm:auto-cols-[18rem] lg:auto-cols-[20rem]">
          {cards}
        </div>
      </div>
    );
  }

  const cards = matches.map((match) => (
    <TimelineCard
      key={match.id}
      match={match}
      href={href}
      showPrediction={showPrediction}
      actionLabel={actionLabel}
    />
  ));

  if (initialCount) {
    return (
      <ProgressiveList
        initialCount={initialCount}
        step={step ?? initialCount}
        moreLabel={moreLabel}
        className="grid gap-3"
      >
        {cards}
      </ProgressiveList>
    );
  }

  return (
    <div className="grid gap-3">
      {cards}
    </div>
  );
}

function TimelineCard({
  match,
  href,
  compact = false,
  showPrediction = false,
  actionLabel = "Ver agenda",
}: {
  match: DemoMatch;
  href?: string;
  compact?: boolean;
  showPrediction?: boolean;
  actionLabel?: string;
}) {
  const status = timelineStatus(match);
  const score = match.result ?? match.liveResult;
  const content = (
    <article
      data-testid={`timeline-match-${match.id}`}
      className={`interactive relative snap-start overflow-hidden rounded-2xl border bg-surface p-4 shadow-sm ${
        status.kind === "live" ? "border-emerald-300 bg-emerald-50/80" : ""
      } ${compact ? "min-h-56" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
            {match.stageLabel}
          </p>
          <LocalMatchDateTime
            scheduledAt={match.scheduledAt}
            fallbackDate={match.dateLabel}
            fallbackTime={match.timeLabel}
            includeZone
            className="mt-1 block text-xs font-bold text-muted"
          />
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${status.className}`}>
          {status.kind === "live" ? (
            <span className="live-dot" aria-hidden="true" />
          ) : (
            <status.icon className="size-3" />
          )}
          {status.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-xl bg-surface-muted px-3 py-4">
        <TimelineTeam team={match.homeTeam} align="right" />
        <div className="min-w-14 text-center">
          {score ? (
            <span className={`text-2xl font-black tracking-tight ${status.kind === "live" ? "live-number" : ""}`}>
              {score.homeScore}x{score.awayScore}
            </span>
          ) : (
            <span className="text-2xl font-black text-brand">x</span>
          )}
        </div>
        <TimelineTeam team={match.awayTeam} align="left" />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-muted">
        <MapPin className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{match.venue}</span>
      </div>

      {showPrediction ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border bg-surface-muted px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1 font-black text-brand">
            <Target className="size-3.5" />
            Meu palpite
          </span>
          <span className="font-black text-foreground">
            {predictionLabel(match.prediction)}
          </span>
        </div>
      ) : null}

      {href && (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-black text-brand">
          {actionLabel} <ArrowRight className="size-3.5" />
        </div>
      )}
    </article>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function TimelineTeam({
  team,
  align,
}: {
  team: DemoMatch["homeTeam"];
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-2 ${align === "right" ? "sm:items-end" : "sm:items-start"}`}>
      <TeamFlag team={team} size="md" />
      <span className={`line-clamp-2 min-h-8 text-center text-xs font-black leading-4 ${align === "right" ? "sm:text-right" : "sm:text-left"}`}>
        {team.shortName || team.name}
      </span>
    </div>
  );
}

function timelineStatus(match: DemoMatch) {
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
      className: "status-neutral",
    } as const;
  }
  if (match.providerStatus === "finished") {
    return {
      kind: "pending",
      label: "A confirmar",
      icon: Clock3,
      className: "status-warning",
    } as const;
  }
  return {
    kind: "scheduled",
    label: "Próximo",
    icon: CalendarDays,
    className: "status-info",
  } as const;
}
