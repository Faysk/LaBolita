import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Radio,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { MatchTimeline } from "@/components/match-timeline";
import { NextMatchSummary } from "@/components/next-match-summary";
import { SpecialHomeSummary } from "@/components/special-home-summary";
import { getViewerState } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";
import { getSpecialMarketsOverview } from "@/lib/data/specials";
import { isLiveMatch } from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

export default async function HomePage() {
  const [matches, viewer] = await Promise.all([
    getMatches(),
    getViewerState(),
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
              {hasLiveMatch ? "Jogo ao vivo" : "Agenda da Copa"}
            </div>
            <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.05em] md:text-6xl">
              {hasLiveMatch ? "Tem jogo rolando agora." : "Acompanhe a Copa sem se perder."}
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/70 md:text-base">
              Veja placares, horários e próximos jogos. Quando quiser competir,
              seus palpites e bolões continuam a um toque.
            </p>
            <div className="mt-6 hidden grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <HomeAction href="/jogos" icon={CalendarDays}>Todos os jogos</HomeAction>
              <HomeAction href="/palpites" icon={Target}>Meus palpites</HomeAction>
              <HomeAction href="/boloes" icon={Trophy}>Bolões</HomeAction>
              <HomeAction href="/jogadores" icon={UsersRound}>Jogadores</HomeAction>
            </div>
          </div>

          <NextMatchSummary matches={matches} />
        </div>
      </section>

      {hasLiveMatch ? (
        <section className="mt-7 md:mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">A bola está rolando</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">
                Agora ao vivo
              </h2>
            </div>
            <Link
              href="/jogos"
              className="hidden items-center gap-1 text-sm font-bold text-brand md:flex"
            >
              Ver agenda <ArrowRight className="size-4" />
            </Link>
          </div>
          <MatchTimeline
            matches={liveMatches}
            variant="rail"
            href="/jogos"
            initialCount={3}
            moreLabel="Ver mais jogos ao vivo"
          />
        </section>
      ) : null}

      <section className={hasLiveMatch ? "mt-7" : "mt-7 md:mt-10"}>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Próximos da fila</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">
              Próximos jogos
            </h2>
          </div>
          <Link
            href="/jogos"
            className="hidden items-center gap-1 text-sm font-bold text-brand md:flex"
          >
            Ver agenda <ArrowRight className="size-4" />
          </Link>
        </div>
        <MatchTimeline
          matches={nextMatches}
          variant="rail"
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
        !match.locked &&
        !match.result &&
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

function HomeAction({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/15"
    >
      <Icon className="size-4 text-accent" />
      {children}
    </Link>
  );
}
