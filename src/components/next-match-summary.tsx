"use client";

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { useLocalResults } from "@/lib/local-state";
import type { DemoMatch } from "@/lib/types";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import { isLiveMatch, isOpenMatch } from "@/lib/match-display";

export function NextMatchSummary({ matches }: { matches: DemoMatch[] }) {
  const results = useLocalResults();
  const liveMatch = matches.find(isLiveMatch);
  const pendingMatch = matches.find(
    (match) =>
      isOpenMatch(match) &&
      !results[match.id] &&
      !match.prediction,
  );
  const nextOpenMatch = matches.find(
    (match) => isOpenMatch(match) && !results[match.id],
  );
  const nextMatch = liveMatch ?? pendingMatch ?? nextOpenMatch;
  const heading = liveMatch
    ? "Agora ao vivo"
    : pendingMatch
      ? "Próximo palpite pendente"
      : "Próximo bloqueio";
  const action = liveMatch
    ? "Acompanhar ao vivo"
    : pendingMatch
      ? "Completar palpite"
      : "Revisar palpites";

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.13em] text-white/60">
          {heading}
        </span>
        <Clock3 className="size-4 text-accent" />
      </div>
      <p className="text-3xl font-black tracking-tight">
        {liveMatch?.liveResult ? (
          `${liveMatch.liveResult.homeScore} × ${liveMatch.liveResult.awayScore}`
        ) : nextMatch ? (
          <LocalMatchDateTime
            scheduledAt={nextMatch.scheduledAt}
            fallbackDate={nextMatch.dateLabel}
            fallbackTime={nextMatch.timeLabel}
            includeZone
          />
        ) : "Em breve"}
      </p>
      <p className="mt-1 text-sm text-white/65">
        {nextMatch
          ? `${nextMatch.homeTeam.name} x ${nextMatch.awayTeam.name}`
          : "Agenda a definir"}
      </p>
      <Link
        href="/palpites"
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-extrabold text-brand-strong transition hover:brightness-95"
      >
        {action}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
