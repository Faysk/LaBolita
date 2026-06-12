import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Goal, ShieldCheck, Trophy, Users } from "lucide-react";
import { TeamFlag } from "@/components/team-flag";
import { uniqueTeams } from "@/lib/competition";
import { getMatches } from "@/lib/data/matches";
import {
  allPlayers,
  getSquadByCode,
  playerAge,
  positionShortLabel,
  sourceVersionLabel,
  squadSummary,
} from "@/lib/squads";
import type { SquadPlayer } from "@/lib/squads";

export const metadata: Metadata = {
  title: "Jogadores da Copa",
  description: "Elencos oficiais, destaques e dados das seleções da Copa 2026.",
};

export default async function PlayersDataPage() {
  const matches = await getMatches();
  const teams = uniqueTeams(matches);
  const players = allPlayers();
  const topScorers = [...players]
    .sort((left, right) => right.goals - left.goals || right.caps - left.caps)
    .slice(0, 8);
  const mostCapped = [...players]
    .sort((left, right) => right.caps - left.caps || right.goals - left.goals)
    .slice(0, 8);
  const averageAge = Math.round(
    players.reduce((total, player) => total + playerAge(player), 0) / players.length,
  );

  return (
    <main className="page-container py-7 md:py-10">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Elencos oficiais</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Jogadores da Copa
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Consulte os convocados, clubes, posições, jogos e gols pela seleção.
            As estatísticas de partida entram conforme os jogos forem confirmados.
          </p>
        </div>
        <Link
          href="/competicao"
          className="interactive inline-flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-brand"
        >
          Voltar para Copa <ArrowRight className="size-4" />
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <InfoCard icon={Users} title="Jogadores" value={String(players.length)} />
        <InfoCard icon={Trophy} title="Seleções" value={String(teams.length)} />
        <InfoCard icon={Goal} title="Média de idade" value={`${averageAge} anos`} />
        <InfoCard icon={ShieldCheck} title="Fonte" value="FIFA" />
      </section>

      <section className="mt-8 grid min-w-0 gap-5 lg:grid-cols-2">
        <Leaderboard
          title="Artilheiros pela seleção"
          subtitle="Gols acumulados antes da Copa, conforme lista oficial."
          players={topScorers}
          metric={(player) => `${player.goals} gols`}
        />
        <Leaderboard
          title="Mais jogos pela seleção"
          subtitle="Experiência internacional declarada na lista oficial."
          players={mostCapped}
          metric={(player) => `${player.caps} jogos`}
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Por seleção</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Elencos</h2>
          </div>
          <p className="max-w-xl text-xs font-bold leading-5 text-muted">
            {sourceVersionLabel()}
          </p>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const squad = getSquadByCode(team.code);
            const summary = squad ? squadSummary(squad) : null;
            return (
              <Link
                key={team.id}
                href={`/competicao/selecoes/${encodeURIComponent(team.id)}`}
                className="interactive card block min-w-0 overflow-hidden p-5"
              >
                <div className="flex items-center gap-3">
                  <TeamFlag team={team} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black">{team.name}</h3>
                    <p className="text-xs font-bold text-muted">
                      {squad ? `${squad.players.length} convocados` : "Elenco a confirmar"}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-brand" />
                </div>
                {summary && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <MiniMetric label="Artilheiro" value={summary.topScorer.name} />
                    <MiniMetric label="Gols" value={String(summary.topScorer.goals)} />
                    <MiniMetric label="Mais jogos" value={summary.mostCapped.name} />
                    <MiniMetric label="Média" value={`${summary.averageAge} anos`} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Trophy;
  title: string;
  value: string;
}) {
  return (
    <article className="card p-5">
      <span className="inline-flex rounded-2xl bg-surface-muted p-3 text-brand">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-2xl font-black">{value}</p>
      <h2 className="text-sm font-bold text-muted">{title}</h2>
    </article>
  );
}

function Leaderboard({
  title,
  subtitle,
  players,
  metric,
}: {
  title: string;
  subtitle: string;
  players: ReturnType<typeof allPlayers>;
  metric: (player: SquadPlayer) => string;
}) {
  return (
    <section className="card min-w-0 overflow-hidden p-5">
      <div>
        <p className="eyebrow">Destaques</p>
        <h2 className="mt-1 text-xl font-black tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p>
      </div>
      <div className="mt-5 grid gap-2">
        {players.map((player, index) => (
          <div key={`${player.team.code}-${player.number}`} className="min-w-0 rounded-2xl bg-surface-muted p-3">
            <div className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-center text-sm font-black text-muted">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{player.name}</p>
                <p className="truncate text-xs text-muted">
                  {player.team.name} · {positionShortLabel(player.position)} · {player.club}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-black text-brand-strong">
                {metric(player)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface-muted p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 truncate font-black">{value}</p>
    </div>
  );
}
