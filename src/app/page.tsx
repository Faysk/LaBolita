import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Radio,
} from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { MatchTimeline } from "@/components/match-timeline";
import { NextMatchSummary } from "@/components/next-match-summary";
import { PageShortcuts } from "@/components/page-shortcuts";
import { ScoreEvolutionRace } from "@/components/score-evolution-race";
import { SpecialHomeSummary } from "@/components/special-home-summary";
import { getViewerState } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";
import { getPublicScoreEvolution } from "@/lib/data/score-evolution";
import { getSpecialMarketsOverview } from "@/lib/data/specials";
import { isLiveMatch, isOpenMatch } from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

export default async function HomePage() {
  const [matches, viewer, scoreEvolution] = await Promise.all([
    getMatches(),
    getViewerState(),
    getPublicScoreEvolution(8),
  ]);
  const liveMatches = matches.filter(isLiveMatch);
  const nextMatches = selectUpcomingMatches(matches);
  const hasLiveMatch = liveMatches.length > 0;
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );
  const specialsOverview = viewer.isAuthenticated
    ? await getSpecialMarketsOverview({ matches })
    : null;

  return (
    <main className="page-container py-6 md:py-10">
      <LiveRefresh active={hasLiveMatch || awaitingOfficial} />
      <section className="hero-panel relative overflow-hidden rounded-[2rem] px-5 py-6 text-white md:px-10 md:py-8">
        <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] md:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em]">
              {hasLiveMatch ? (
                <Radio className="live-icon size-3.5" />
              ) : (
                <CalendarDays className="size-3.5 text-accent" />
              )}
              {hasLiveMatch ? "Ao vivo agora" : "Agenda da Copa"}
            </div>
            <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.05em] md:text-6xl">
              {hasLiveMatch ? "Tem jogo valendo bolão agora." : "A Copa fica fácil de acompanhar."}
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/70 md:text-base">
              Veja jogos, placares e horários sem caçar informação. Quando quiser
              competir, seus palpites e bolões ficam a um toque.
            </p>
          </div>

          <NextMatchSummary matches={matches} />
        </div>
      </section>

      <PageShortcuts
        routeKeys={["live", "games", "predictions", "pools"]}
        className="mt-5 md:mt-6"
      />

      <ScoreEvolutionRace overview={scoreEvolution} />

      {hasLiveMatch ? (
        <section className="mt-7 md:mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Valendo agora</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">
                Agora ao vivo
              </h2>
            </div>
            <Link
              href="/ao-vivo"
              className="hidden items-center gap-1 text-sm font-bold text-brand md:flex"
            >
              Abrir ao vivo <ArrowRight className="size-4" />
            </Link>
          </div>
          <MatchTimeline
            matches={liveMatches}
            variant="rail"
            ariaLabel="Jogos ao vivo"
            href="/ao-vivo"
            initialCount={3}
            moreLabel="Ver mais jogos ao vivo"
            actionLabel="Abrir central ao vivo"
          />
        </section>
      ) : null}

      <section className={hasLiveMatch ? "mt-7" : "mt-7 md:mt-10"}>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Na fila</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">
              Próximos jogos
            </h2>
          </div>
          <Link
            href="/jogos"
            className="hidden items-center gap-1 text-sm font-bold text-brand md:flex"
          >
            Abrir agenda <ArrowRight className="size-4" />
          </Link>
        </div>
        <MatchTimeline
          matches={nextMatches}
          variant="rail"
          ariaLabel="Próximos jogos"
          href="/jogos"
          initialCount={3}
          moreLabel="Ver mais próximos jogos"
        />
      </section>

      <SpecialHomeSummary
        overview={specialsOverview}
        isAuthenticated={viewer.isAuthenticated}
      />

    </main>
  );
}

function selectUpcomingMatches(matches: DemoMatch[]) {
  return matches
    .filter(
      (match) =>
        !isLiveMatch(match) &&
        isOpenMatch(match) &&
        match.providerStatus !== "finished",
    )
    .sort((left, right) => scheduledTime(left) - scheduledTime(right));
}

function scheduledTime(match: DemoMatch) {
  const value = match.scheduledAt
    ? new Date(match.scheduledAt).getTime()
    : Number.MAX_SAFE_INTEGER;
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}
