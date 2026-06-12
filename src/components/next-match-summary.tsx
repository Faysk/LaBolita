"use client";

import Link from "next/link";
import { ArrowRight, Clock3, MapPin, Radio } from "lucide-react";
import { TeamFlag } from "@/components/team-flag";
import { useLocalResults } from "@/lib/local-state";
import type { DemoMatch } from "@/lib/types";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import {
  hasSavedPrediction,
  isLiveMatch,
  selectHomeTimelineMatches,
} from "@/lib/match-display";

export function NextMatchSummary({ matches }: { matches: DemoMatch[] }) {
  const results = useLocalResults();
  const candidateMatches = selectHomeTimelineMatches(
    matches.filter((match) => !results[match.id]),
    matches.length,
  );
  const liveMatch = candidateMatches.find(isLiveMatch);
  const nextMatch = liveMatch ?? candidateMatches[0];
  const heading = liveMatch
    ? "Agora ao vivo"
    : nextMatch
      ? hasSavedPrediction(nextMatch)
        ? "Seu palpite está salvo"
        : "Próximo jogo"
      : "Agenda encerrada";
  const action = liveMatch
    ? "Acompanhar ao vivo"
    : nextMatch
      ? hasSavedPrediction(nextMatch)
        ? "Ver ou alterar palpite"
        : "Completar palpite"
      : "Ver calendário";
  const isLive = Boolean(liveMatch);
  const score = liveMatch?.liveResult;

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] border p-4 shadow-2xl backdrop-blur md:justify-self-end md:p-5 ${
      isLive
        ? "border-accent/45 bg-emerald-950/55 shadow-accent/10"
        : "border-white/15 bg-white/10 shadow-black/10"
    }`}>
      <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 bottom-0 h-20 rounded-full bg-black/20 blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
            isLive
              ? "border-accent/45 bg-accent/15 text-accent"
              : "border-white/15 bg-white/10 text-white/70"
          }`}>
            {isLive ? <Radio className="size-3.5 animate-pulse" /> : <Clock3 className="size-3.5 text-accent" />}
            {heading}
          </span>
          {nextMatch && (
            <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-bold text-white/65">
              {nextMatch.stageLabel}
            </span>
          )}
        </div>

        {nextMatch ? (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[1.35rem] border border-white/10 bg-black/15 p-3 sm:gap-4 sm:p-4">
              <SummaryTeam team={nextMatch.homeTeam} align="right" />
              <div className="flex min-w-[4.25rem] flex-col items-center justify-center">
                {isLive ? (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-accent">
                      Ao vivo
                    </span>
                    <span className="text-4xl font-black leading-none tracking-tight text-white md:text-5xl">
                      {score ? `${score.homeScore}×${score.awayScore}` : "0×0"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                      Início
                    </span>
                    <span className="text-2xl font-black text-accent">×</span>
                  </>
                )}
              </div>
              <SummaryTeam team={nextMatch.awayTeam} align="left" />
            </div>

            <div className="mt-4 grid gap-2 text-sm text-white/72">
              <div className="flex items-center gap-2">
                <Clock3 className="size-4 text-accent" />
                <span className={isLive ? "font-bold text-accent" : "font-bold text-white"}>
                  {isLive ? "Placar provisório do provedor" : (
                    <LocalMatchDateTime
                      scheduledAt={nextMatch.scheduledAt}
                      fallbackDate={nextMatch.dateLabel}
                      fallbackTime={nextMatch.timeLabel}
                      includeZone
                    />
                  )}
                </span>
              </div>
              {nextMatch.venue && (
                <div className="flex items-center gap-2 text-xs text-white/55">
                  <MapPin className="size-4" />
                  <span>{nextMatch.venue}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-[1.35rem] border border-white/10 bg-black/15 p-5">
            <p className="text-3xl font-black tracking-tight">Em breve</p>
            <p className="mt-1 text-sm text-white/65">Agenda a definir</p>
          </div>
        )}

        <Link
          href="/palpites"
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-extrabold text-brand-strong transition hover:brightness-95"
        >
          {action}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function SummaryTeam({
  team,
  align,
}: {
  team: DemoMatch["homeTeam"];
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-2 ${
      align === "right" ? "sm:items-end" : "sm:items-start"
    }`}>
      <TeamFlag team={team} size="lg" />
      <span className={`max-w-28 text-center text-base font-black leading-tight tracking-tight text-white sm:max-w-36 sm:text-lg ${
        align === "right" ? "sm:text-right" : "sm:text-left"
      }`}>
        {team.shortName || team.name}
      </span>
    </div>
  );
}
