import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MapPin,
  Radio,
  Target,
} from "lucide-react";
import { CarouselRail } from "@/components/carousel-rail";
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
  hrefMatchParam?: string;
  showPrediction?: boolean;
  initialCount?: number;
  step?: number;
  moreLabel?: string;
  ariaLabel?: string;
  actionLabel?: string;
  actionMode?: "auto";
};

export function MatchTimeline({
  matches,
  variant = "list",
  href,
  hrefMatchParam,
  showPrediction = false,
  initialCount,
  step,
  moreLabel = "Ver mais jogos",
  ariaLabel = "Jogos",
  actionLabel = "Ver agenda",
  actionMode,
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
        href={buildMatchHref(href, match, hrefMatchParam)}
        compact
        showPrediction={showPrediction}
        actionLabel={actionLabel}
        actionMode={actionMode}
      />
    ));

    return (
      <CarouselRail
        ariaLabel={ariaLabel}
        initialCount={initialCount}
        step={step ?? initialCount}
        moreLabel={moreLabel}
        className="min-w-0 max-w-full"
        trackClassName="auto-cols-[minmax(17rem,85vw)] gap-3 sm:auto-cols-[18rem] lg:auto-cols-[20rem]"
      >
        {cards}
      </CarouselRail>
    );
  }

  const cards = matches.map((match) => (
    <TimelineCard
      key={match.id}
      match={match}
      href={buildMatchHref(href, match, hrefMatchParam)}
      showPrediction={showPrediction}
      actionLabel={actionLabel}
      actionMode={actionMode}
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

function buildMatchHref(
  href: string | undefined,
  match: DemoMatch,
  matchParam?: string,
) {
  if (!href || !matchParam) return href;

  const hashIndex = href.indexOf("#");
  const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}${encodeURIComponent(matchParam)}=${encodeURIComponent(match.id)}${hash}`;
}

function TimelineCard({
  match,
  href,
  compact = false,
  showPrediction = false,
  actionLabel = "Ver agenda",
  actionMode,
}: {
  match: DemoMatch;
  href?: string;
  compact?: boolean;
  showPrediction?: boolean;
  actionLabel?: string;
  actionMode?: "auto";
}) {
  const status = timelineStatus(match);
  const score = match.result ?? match.liveResult;
  const action = timelineAction(match, status, actionLabel, actionMode);
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

      {href && action ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-brand/15 bg-white px-3 py-2 text-xs font-black text-brand">
          <span className="inline-flex min-w-0 items-center gap-1">
            <action.icon className="size-3.5 shrink-0" />
            <span className="truncate">{action.label}</span>
          </span>
          <ArrowRight className="size-3.5 shrink-0" />
        </div>
      ) : null}
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
  if (match.locked) {
    return {
      kind: "locked",
      label: "Bloqueado",
      icon: LockKeyhole,
      className: "status-neutral",
    } as const;
  }
  return {
    kind: "scheduled",
    label: "Próximo",
    icon: CalendarDays,
    className: "status-info",
  } as const;
}

function timelineAction(
  match: DemoMatch,
  status: ReturnType<typeof timelineStatus>,
  actionLabel?: string,
  actionMode?: "auto",
) {
  if (actionMode !== "auto") {
    if (!actionLabel) return null;
    return { label: actionLabel, icon: ArrowRight } as const;
  }

  if (status.kind === "live") {
    return { label: "Ao vivo e palpites", icon: Radio } as const;
  }
  if (status.kind === "finished") {
    return { label: "Comparar palpites", icon: BarChart3 } as const;
  }
  if (status.kind === "pending" || status.kind === "locked") {
    return { label: "Ver palpites", icon: BarChart3 } as const;
  }
  if (match.prediction) {
    return { label: "Ver ou alterar", icon: Target } as const;
  }
  return { label: "Fazer palpite", icon: Target } as const;
}
