"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Crown, Trophy, Users } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { calculateDemoRanking } from "@/lib/demo-engine";
import { useLocalPredictions, useLocalResults } from "@/lib/local-state";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { UserAvatar } from "@/components/user-avatar";
import type { DemoMatch, PoolSummary, RankingEntry } from "@/lib/types";

export function HomeOverview({
  matches,
  pools,
  globalRanking,
  primaryPoolRanking,
  primaryPoolName,
}: {
  matches: DemoMatch[];
  pools: PoolSummary[];
  globalRanking: RankingEntry[];
  primaryPoolRanking: RankingEntry[];
  primaryPoolName: string;
}) {
  const localPredictions = useLocalPredictions(matches);
  const localResults = useLocalResults();
  const usesSupabase = Boolean(createBrowserSupabaseClient());
  const visibleGlobalRanking = usesSupabase
    ? globalRanking
    : calculateDemoRanking(globalRanking, matches, localPredictions, localResults);
  const visiblePoolRanking = usesSupabase
    ? primaryPoolRanking
    : calculateDemoRanking(primaryPoolRanking, matches, localPredictions, localResults);
  const openMatches = matches.filter(
    (match) => !match.locked && !match.result && !localResults[match.id],
  );
  const savedPredictions = matches.filter(
    (match) => match.prediction || localPredictions[match.id],
  ).length;
  const pendingPredictions = openMatches.filter(
    (match) => !match.prediction && !localPredictions[match.id],
  ).length;
  const currentPlayer = visibleGlobalRanking.find((player) => player.isCurrentUser);
  const leader = visibleGlobalRanking[0];
  const poolPlayer = visiblePoolRanking.find((player) => player.isCurrentUser);
  const poolLeader = visiblePoolRanking[0];
  const poolHasLivePoints = visiblePoolRanking.some(
    (player) =>
      player.provisionalPoints !== undefined &&
      player.provisionalPoints !== player.points,
  );
  const rankingStarted = visibleGlobalRanking.some(
    (player) => player.points > 0 || player.exact > 0 || player.correct > 0,
  );
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
          label="Sua posição geral"
          value={currentPlayer && rankingStarted ? rankLabel(currentPlayer, visibleGlobalRanking) : "—"}
          detail={rankingStarted ? "Ranking público geral" : "Classificação não iniciada"}
          accent
        />
        <StatCard
          icon={CheckCircle2}
          label="Palpites realizados"
          value={`${savedPredictions}/${matches.length}`}
          detail={`${pendingPredictions} pendentes abertos`}
        />
        <StatCard
          icon={Crown}
          label="Cravadas"
          value={String(currentPlayer?.exact ?? 0)}
          detail={leader ? `Recorde geral: ${pluralize(leader.exact, "cravada", "cravadas")}` : "Ranking vazio"}
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
            {primaryPoolName || primaryPool?.name || "Seu primeiro bolão"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Sua situação no grupo, sem misturar com o ranking geral.
          </p>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                Sua posição
              </p>
              <p className="mt-1 font-bold">
                {poolPlayer
                  ? poolHasLivePoints
                    ? `~${poolPlayer.provisionalPosition ?? poolPlayer.position}º provisório`
                    : rankLabel(poolPlayer, visiblePoolRanking)
                  : "A definir"}
              </p>
              {poolLeader && poolPlayer && poolLeader.points > poolPlayer.points && (
                <p className="mt-1 text-xs text-white/60">
                  {poolLeader.points - poolPlayer.points} pts atrás de {poolLeader.name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-accent">
                {poolHasLivePoints ? poolPlayer?.provisionalPoints ?? poolPlayer?.points ?? 0 : poolPlayer?.points ?? 0}
              </p>
              <p className="text-xs text-white/50">{poolHasLivePoints ? "pontos provisórios" : "pontos"}</p>
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
            {visibleGlobalRanking.slice(0, 3).map((player) => (
              <div
                key={player.name}
                data-testid={player.isCurrentUser ? "home-ranking-current-user" : undefined}
                className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3"
              >
                <span className="w-5 text-center text-sm font-black text-muted">
                  {rankLabel(player, visibleGlobalRanking)}
                </span>
                <UserAvatar
                  name={player.name}
                  initials={player.initials}
                  avatarUrl={player.avatarUrl}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {player.name}
                </span>
                <span className="text-sm font-black text-brand">{player.points} pts</span>
              </div>
            ))}
            {visibleGlobalRanking.length === 0 && (
              <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
                Os líderes dos bolões públicos aparecerão aqui.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function rankLabel(player: RankingEntry, entries: RankingEntry[]) {
  const tied = entries.filter((entry) => entry.position === player.position).length > 1;
  return `${player.position}º${tied ? " emp." : ""}`;
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}
