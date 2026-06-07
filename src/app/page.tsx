import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { HomeOverview } from "@/components/home-overview";
import { MatchCard } from "@/components/match-card";
import { NextMatchSummary } from "@/components/next-match-summary";
import { getViewerState } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";
import { getPoolsOverview } from "@/lib/data/pools";

export default async function HomePage() {
  const [matches, poolsOverview, viewer] = await Promise.all([
    getMatches(),
    getPoolsOverview(),
    getViewerState(),
  ]);
  const openMatches = matches.filter((match) => !match.locked);
  const upcomingMatches = (openMatches.length ? openMatches : matches).slice(0, 3);

  return (
    <main className="page-container py-6 md:py-10">
      <section className="hero-panel relative overflow-hidden rounded-[2rem] px-5 py-7 text-white md:px-10 md:py-11">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid gap-8 md:grid-cols-[1.35fr_0.65fr] md:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em]">
              <Sparkles className="size-3.5 text-accent" />
              Copa 2026
            </div>
            <p className="mb-2 text-sm font-medium text-white/65">
              Bom dia
            </p>
            <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.05em] md:text-6xl">
              Seu palpite.
              <br />
              Sua resenha.
              <br />
              <span className="text-accent">Sua taça.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/70 md:text-base">
              Faça seus palpites uma vez, dispute com todos os seus grupos e
              acompanhe cada virada no ranking.
            </p>
          </div>

          <NextMatchSummary matches={matches} />
        </div>
      </section>

      <HomeOverview
        matches={matches}
        pools={poolsOverview.pools}
        ranking={poolsOverview.ranking}
        rankingName={poolsOverview.rankingName}
      />

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Agenda em destaque</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">
              Próximos jogos
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
          {upcomingMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              compact
              isAuthenticated={viewer.isAuthenticated}
              termsAccepted={viewer.termsAccepted}
            />
          ))}
          {upcomingMatches.length === 0 && (
            <p className="card p-6 text-sm text-muted lg:col-span-3">
              A agenda ainda não foi importada. O administrador pode carregar o
              calendário oficial antes de abrir os palpites.
            </p>
          )}
        </div>
      </section>

    </main>
  );
}
