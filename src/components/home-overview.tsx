"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Crown, Trophy, Users } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { calculateDemoRanking } from "@/lib/demo-engine";
import { useLocalPredictions, useLocalResults } from "@/lib/local-state";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { DemoMatch, PoolSummary, RankingEntry } from "@/lib/types";

export function HomeOverview({
  matches,
  pools,
  ranking,
  rankingName,
}: {
  matches: DemoMatch[];
  pools: PoolSummary[];
  ranking: RankingEntry[];
  rankingName: string;
}) {
  const localPredictions = useLocalPredictions(matches);
  const localResults = useLocalResults();
  const usesSupabase = Boolean(createBrowserSupabaseClient());
  const visibleRanking = usesSupabase
    ? ranking
    : calculateDemoRanking(ranking, matches, localPredictions, localResults);
  const openMatches = matches.filter(
    (match) => !match.locked && !match.result && !localResults[match.id],
  );
  const completedPredictions = openMatches.filter(
    (match) => match.prediction || localPredictions[match.id],
  ).length;
  const currentPlayer = visibleRanking.find((player) => player.isCurrentUser);
  const leader = visibleRanking[0];
  const primaryPool = pools[0];
  const opponents = pools.reduce(
    (total, pool) => total + Math.max(0, pool.members - 1),
    0,
  );

  return (
    <>
      <section className="mt-5 grid grid-cols-2 gap-3 md:mt-7 md:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Sua posição"
          value={currentPlayer ? `${currentPlayer.position}º` : "—"}
          detail={rankingName}
          accent
        />
        <StatCard
          icon={CheckCircle2}
          label="Palpites feitos"
          value={`${completedPredictions}/${openMatches.length}`}
          detail={`${openMatches.length - completedPredictions} pendentes`}
        />
        <StatCard
          icon={Crown}
          label="Cravadas"
          value={String(currentPlayer?.exact ?? 0)}
          detail={leader ? `Líder: ${leader.exact}` : "Ranking vazio"}
        />
        <StatCard
          icon={Users}
          label="Seus bolões"
          value={String(pools.length)}
          detail={`${opponents} adversários`}
        />
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <div className="card card-dark overflow-hidden p-6 text-white">
          <p className="eyebrow !text-accent">Bolão em destaque</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            {primaryPool?.name ?? "Seu primeiro bolão"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Acompanhe cada partida pontuada e a movimentação do ranking.
          </p>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                Líder
              </p>
              <p className="mt-1 font-bold">{leader?.name ?? "A definir"}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-accent">{leader?.points ?? 0}</p>
              <p className="text-xs text-white/50">pontos</p>
            </div>
          </div>
          <Link
            href="/boloes"
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Abrir ranking <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Como está a disputa</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">Top 3 geral</h2>
            </div>
            <Trophy className="size-6 text-brand" />
          </div>
          <div className="mt-5 space-y-3">
            {visibleRanking.slice(0, 3).map((player) => (
              <div
                key={player.name}
                data-testid={player.isCurrentUser ? "home-ranking-current-user" : undefined}
                className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3"
              >
                <span className="w-5 text-center text-sm font-black text-muted">
                  {player.position}
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                  {player.initials}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {player.name}
                </span>
                <span className="text-sm font-black text-brand">{player.points} pts</span>
              </div>
            ))}
            {visibleRanking.length === 0 && (
              <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
                Crie um bolão para começar a classificação.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
