"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Crown, Trophy, Users } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { ProgressiveList } from "@/components/progressive-list";
import { StatCard } from "@/components/stat-card";
import { calculateDemoRanking } from "@/lib/demo-engine";
import type { PublicPoolHighlight } from "@/lib/data/pools";
import { useLocalPredictions, useLocalResults } from "@/lib/local-state";
import { rankingLabel } from "@/lib/ranking-display";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { UserAvatar } from "@/components/user-avatar";
import type { DemoMatch, PoolSummary, RankingEntry } from "@/lib/types";

export function HomeOverview({
  matches,
  pools,
  globalRanking,
  primaryPoolRanking,
  primaryPoolName,
  publicPoolHighlights,
  isAuthenticated,
}: {
  matches: DemoMatch[];
  pools: PoolSummary[];
  globalRanking: RankingEntry[];
  primaryPoolRanking: RankingEntry[];
  primaryPoolName: string;
  publicPoolHighlights: PublicPoolHighlight[];
  isAuthenticated: boolean;
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
  const maxExact = visibleGlobalRanking.reduce(
    (best, player) => Math.max(best, player.exact),
    0,
  );
  const recordLeaders = maxExact > 0
    ? visibleGlobalRanking.filter((player) => player.exact === maxExact)
    : [];
  const recordHolder = recordLeaders[0] ?? null;
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
  const canShowPersonalStats = !usesSupabase || isAuthenticated;

  return (
    <>
      <section className="mt-5 grid grid-cols-2 gap-3 md:mt-7 md:grid-cols-4">
        <StatCard
          icon={Trophy}
          label="Sua posição geral"
          value={
            canShowPersonalStats && currentPlayer && rankingStarted
              ? rankingLabel(currentPlayer, visibleGlobalRanking)
              : "Entrar"
          }
          detail={canShowPersonalStats ? "Ranking público geral" : "Login necessário"}
          href={canShowPersonalStats ? undefined : "/entrar?next=%2F"}
          accent
        />
        <StatCard
          icon={CheckCircle2}
          label={canShowPersonalStats ? "Palpites realizados" : "Palpites pendentes"}
          value={canShowPersonalStats ? `${savedPredictions}/${matches.length}` : "—"}
          detail={canShowPersonalStats ? `${pendingPredictions} pendentes abertos` : "Entre para calcular"}
          href={canShowPersonalStats ? undefined : "/entrar?next=%2Fpalpites"}
        />
        <StatCard
          icon={Crown}
          label="Recorde geral"
          value={recordHolder ? pluralize(recordHolder.exact, "cravada", "cravadas") : "—"}
          detail={
            recordHolder
              ? recordLeaders.length > 1
                ? `${recordLeaders.length} empatados`
                : "Melhor marca"
              : "Ranking vazio"
          }
          person={recordHolder}
        />
        <StatCard
          icon={Users}
          label="Seus bolões"
          value={canShowPersonalStats ? String(pools.length) : "Entrar"}
          detail={canShowPersonalStats ? `${opponents} adversários` : "Login necessário"}
          href={canShowPersonalStats ? undefined : "/entrar?next=%2Fboloes"}
        />
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <div className="card card-dark overflow-hidden p-6 text-white">
          <p className="eyebrow !text-accent">Bolão em destaque</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            {canShowPersonalStats
              ? primaryPoolName || primaryPool?.name || "Seu primeiro bolão"
              : "Bolões públicos"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {canShowPersonalStats
              ? "Sua situação no grupo, sem misturar com o ranking geral."
              : "Top 3 por soma de pontos dos participantes."}
          </p>
          {canShowPersonalStats ? (
            <div className="mt-8 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Sua posição
                </p>
                <p className="mt-1 font-bold">
                  {poolPlayer
                    ? poolHasLivePoints
                      ? rankingLabel(poolPlayer, visiblePoolRanking, { provisional: true })
                      : rankingLabel(poolPlayer, visiblePoolRanking)
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
          ) : (
            <ProgressiveList
              initialCount={3}
              step={3}
              moreLabel="Ver mais bolões"
              className="mt-6 grid gap-2"
            >
              {publicPoolHighlights.map((pool, index) => (
                <div key={pool.id} className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-accent">{index + 1}º</span>
                    <CountryFlag code={pool.flagCode} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{pool.name}</p>
                      <p className="text-[11px] text-white/55">{pool.members} jogadores</p>
                    </div>
                    <span className="text-sm font-black text-accent">{pool.totalPoints} pts</span>
                  </div>
                  {pool.topPlayers.length > 0 && (
                    <p className="mt-2 truncate text-[11px] text-white/55">
                      Top: {pool.topPlayers.map((player) => player.name).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </ProgressiveList>
          )}
          {!canShowPersonalStats && publicPoolHighlights.length === 0 && (
            <p className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/65">
              Entre ou descubra um bolão público para acompanhar a disputa.
            </p>
          )}
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
          <ProgressiveList
            initialCount={3}
            step={3}
            moreLabel="Ver mais colocados"
            className="mt-5 space-y-3"
          >
            {visibleGlobalRanking.map((player) => (
              <div
                key={player.name}
                data-testid={player.isCurrentUser ? "home-ranking-current-user" : undefined}
                className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3"
              >
                <span className="w-5 text-center text-sm font-black text-muted">
                  {rankingLabel(player, visibleGlobalRanking)}
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
          </ProgressiveList>
          {visibleGlobalRanking.length === 0 && (
            <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
              Os líderes dos bolões públicos aparecerão aqui.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}
