import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { HomeOverview } from "@/components/home-overview";
import { LiveRefresh } from "@/components/live-refresh";
import { MatchCard } from "@/components/match-card";
import { NextMatchSummary } from "@/components/next-match-summary";
import { SpecialHomeSummary } from "@/components/special-home-summary";
import { getViewerState } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";
import {
  getPoolsOverview,
  getPublicGlobalRanking,
  getPublicPoolHighlights,
} from "@/lib/data/pools";
import { getSpecialMarketsOverview } from "@/lib/data/specials";
import { isLiveMatch, selectHomeTimelineMatches } from "@/lib/match-display";

export default async function HomePage() {
  const [matches, poolsOverview, publicRanking, publicPoolHighlights, viewer] = await Promise.all([
    getMatches(),
    getPoolsOverview(),
    getPublicGlobalRanking(),
    getPublicPoolHighlights(),
    getViewerState(),
  ]);
  const highlightedMatches = selectHomeTimelineMatches(matches, 3);
  const hasLiveMatch = highlightedMatches.some(isLiveMatch);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );
  const specialsOverview = viewer.isAuthenticated
    ? await getSpecialMarketsOverview({ matches })
    : null;

  return (
    <main className="page-container py-6 md:py-10">
      <LiveRefresh active={hasLiveMatch || awaitingOfficial} />
      <section className={`hero-panel relative overflow-hidden rounded-[2rem] px-5 text-white md:px-10 ${
        viewer.isAuthenticated ? "py-5 md:py-8" : "py-7 md:py-11"
      }`}>
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] md:items-center">
          <div>
            <div className={`${viewer.isAuthenticated ? "mb-3 md:mb-5" : "mb-5"} inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em]`}>
              <Sparkles className="size-3.5 text-accent" />
              Copa 2026
            </div>
            <p className="mb-2 text-sm font-medium text-white/65">
              Bom dia
            </p>
            <h1 className={`max-w-xl font-black leading-[1.02] tracking-[-0.05em] ${
              viewer.isAuthenticated ? "text-3xl" : "text-4xl"
            } ${
              viewer.isAuthenticated ? "md:text-5xl" : "md:text-6xl"
            }`}>
              Seu palpite.
              <br />
              Sua resenha.
              <br />
              <span className="text-accent">Sua taça.</span>
            </h1>
            <p className={`${viewer.isAuthenticated ? "mt-3 hidden sm:block md:mt-5" : "mt-5"} max-w-lg text-sm leading-6 text-white/70 md:text-base`}>
              Faça seus palpites uma vez, dispute com todos os seus grupos e
              acompanhe cada virada no ranking.
            </p>
          </div>

          <NextMatchSummary matches={matches} />
        </div>
      </section>

      <section className="mt-7 md:mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{hasLiveMatch ? "A bola está rolando" : "Agenda em destaque"}</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">
              {hasLiveMatch ? "Agora ao vivo" : "Próximos jogos"}
            </h2>
          </div>
          <Link
            href="/palpites"
            className="hidden items-center gap-1 text-sm font-bold text-brand md:flex"
          >
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {highlightedMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              compact
              isAuthenticated={viewer.isAuthenticated}
              termsAccepted={viewer.termsAccepted}
            />
          ))}
          {highlightedMatches.length === 0 && (
            <p className="card p-6 text-sm text-muted lg:col-span-3">
              A agenda ainda não foi importada. O administrador pode carregar o
              calendário oficial antes de abrir os palpites.
            </p>
          )}
        </div>
      </section>

      <SpecialHomeSummary
        overview={specialsOverview}
        isAuthenticated={viewer.isAuthenticated}
      />

      <HomeOverview
        matches={matches}
        pools={poolsOverview.pools}
        globalRanking={publicRanking}
        primaryPoolRanking={poolsOverview.ranking}
        primaryPoolName={poolsOverview.rankingName}
        publicPoolHighlights={publicPoolHighlights}
        isAuthenticated={viewer.isAuthenticated}
      />

    </main>
  );
}
