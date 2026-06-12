import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Goal, Shield, Trophy, Users } from "lucide-react";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import { TeamFlag } from "@/components/team-flag";
import {
  findTeamById,
  matchesForTeam,
  nextMatchForTeam,
  standingForTeam,
} from "@/lib/competition";
import { getMatches } from "@/lib/data/matches";
import { isLiveMatch } from "@/lib/match-display";
import {
  getSquadByCode,
  playerAge,
  positionLabel,
  positionShortLabel,
  sourceVersionLabel,
  squadSummary,
} from "@/lib/squads";
import type { SquadPlayer } from "@/lib/squads";
import type { DemoMatch } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const matches = await getMatches();
  const team = findTeamById(matches, decodeURIComponent(teamId));

  return {
    title: team ? `${team.name} na Copa 2026` : "Seleção",
    description: team
      ? `Jogos, classificação e detalhes de ${team.name} na Copa 2026.`
      : "Detalhes da seleção na Copa 2026.",
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const matches = await getMatches();
  const decodedTeamId = decodeURIComponent(teamId);
  const team = findTeamById(matches, decodedTeamId);
  if (!team) notFound();

  const teamMatches = matchesForTeam(matches, team.id);
  const nextMatch = nextMatchForTeam(matches, team.id);
  const groupStanding = standingForTeam(matches, team.id);
  const squad = getSquadByCode(team.code);
  const summary = squad ? squadSummary(squad) : null;
  const nextOpponent = nextMatch
    ? nextMatch.homeTeam.id === team.id
      ? nextMatch.awayTeam
      : nextMatch.homeTeam
    : null;

  return (
    <main className="page-container py-7 md:py-10">
      <Link
        href="/competicao"
        className="interactive inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2 text-sm font-black text-brand"
      >
        <ArrowLeft className="size-4" />
        Voltar para Copa
      </Link>

      <section className="card mt-6 overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <TeamFlag team={team} size="lg" />
            <div>
              <p className="eyebrow">Seleção</p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                {team.name}
              </h1>
              <p className="mt-2 text-sm font-bold text-muted">
                {groupStanding ? `Grupo ${groupStanding.group}` : "Fase a definir"}
              </p>
            </div>
          </div>
          {nextMatch && (
            <div className="rounded-2xl border bg-surface-muted p-4 md:max-w-xs">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted">
                Próximo jogo
              </p>
              <p className="mt-1 text-lg font-black">
                {nextOpponent?.name ?? "Adversário a definir"}
              </p>
              <LocalMatchDateTime
                scheduledAt={nextMatch.scheduledAt}
                fallbackDate={nextMatch.dateLabel}
                fallbackTime={nextMatch.timeLabel}
                includeZone
                className="mt-1 block text-sm font-bold text-brand"
              />
            </div>
          )}
        </div>
      </section>

      {groupStanding && (
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Trophy} label="Pontos" value={groupStanding.standing.points} />
          <Metric icon={CalendarDays} label="Jogos" value={groupStanding.standing.played} />
          <Metric icon={Goal} label="Gols pró" value={groupStanding.standing.goalsFor} />
          <Metric icon={Shield} label="Saldo" value={groupStanding.standing.goalDifference} />
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4">
          <p className="eyebrow">Calendário</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Todos os jogos</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {teamMatches.map((match) => (
            <TeamMatchCard key={match.id} match={match} teamId={team.id} />
          ))}
        </div>
      </section>

      <section className="card mt-8 overflow-hidden">
        <div className="border-b p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Elenco oficial</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Jogadores</h2>
            </div>
            <p className="max-w-xl text-xs font-bold leading-5 text-muted">
              {sourceVersionLabel()}
            </p>
          </div>
          {summary && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SquadMetric icon={Users} label="Convocados" value={String(summary.totalPlayers)} />
              <SquadMetric icon={Goal} label="Artilheiro" value={`${summary.topScorer.name} · ${summary.topScorer.goals}`} />
              <SquadMetric icon={Trophy} label="Mais jogos" value={`${summary.mostCapped.name} · ${summary.mostCapped.caps}`} />
              <SquadMetric icon={Shield} label="Média de idade" value={`${summary.averageAge} anos`} />
            </div>
          )}
        </div>
        {squad ? (
          <div className="grid gap-3 p-5 md:grid-cols-2 md:p-6">
            {squad.players.map((player) => (
              <PlayerCard key={player.number} player={player} />
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm leading-6 text-muted">
            A lista oficial desta seleção ainda não foi vinculada ao código do torneio.
          </p>
        )}
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
}) {
  return (
    <article className="card p-4">
      <span className="inline-flex rounded-xl bg-surface-muted p-2 text-brand">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-2xl font-black">{value}</p>
      <p className="text-sm font-bold text-muted">{label}</p>
    </article>
  );
}

function SquadMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border bg-surface-muted p-4">
      <span className="inline-flex rounded-xl bg-surface p-2 text-brand">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 truncate text-sm font-black">{value}</p>
      <p className="text-xs font-bold text-muted">{label}</p>
    </article>
  );
}

function TeamMatchCard({ match, teamId }: { match: DemoMatch; teamId: string }) {
  const isHome = match.homeTeam.id === teamId;
  const score = match.result ?? match.liveResult;

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-brand">
            {match.stageLabel}
          </p>
          <LocalMatchDateTime
            scheduledAt={match.scheduledAt}
            fallbackDate={match.dateLabel}
            fallbackTime={match.timeLabel}
            includeZone
            className="mt-1 block text-xs font-bold text-muted"
          />
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
          isLiveMatch(match) ? "status-live" : match.result ? "status-success" : "status-neutral"
        }`}>
          {isLiveMatch(match) ? "Ao vivo" : match.result ? "Finalizado" : "Agendado"}
        </span>
      </div>
      <div className="mt-5 rounded-2xl border bg-surface-muted p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <MatchTeam team={match.homeTeam} active={isHome} align="right" />
          <p className="whitespace-nowrap text-2xl font-black">
            {score ? `${score.homeScore} × ${score.awayScore}` : "—"}
          </p>
          <MatchTeam team={match.awayTeam} active={!isHome} align="left" />
        </div>
        <p className="mt-4 text-center text-xs font-bold text-muted">
          {isHome ? `${match.homeTeam.name} como mandante` : `${match.awayTeam.name} como visitante`} · {match.venue}
        </p>
      </div>
    </article>
  );
}

function MatchTeam({
  team,
  active,
  align,
}: {
  team: DemoMatch["homeTeam"];
  active: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`}>
      {align === "left" && <TeamFlag team={team} size="sm" />}
      <div className="min-w-0">
        <p className={`truncate text-sm font-black ${active ? "text-brand" : ""}`}>
          {team.shortName}
        </p>
        <p className="text-[10px] font-black uppercase tracking-wider text-muted">
          {active ? "Seleção" : "Rival"}
        </p>
      </div>
      {align === "right" && <TeamFlag team={team} size="sm" />}
    </div>
  );
}

function PlayerCard({ player }: { player: SquadPlayer }) {
  return (
    <article className="rounded-2xl border bg-surface-muted p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-sm font-black text-brand-contrast">
          {player.number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black">{player.name}</h3>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-black text-brand">
              {positionShortLabel(player.position)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-bold text-muted">{player.fullName}</p>
          <p className="mt-2 truncate text-xs text-muted">{player.club}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <PlayerMetric label="Pos." value={positionLabel(player.position)} />
        <PlayerMetric label="Idade" value={`${playerAge(player)}`} />
        <PlayerMetric label="Jogos" value={`${player.caps}`} />
        <PlayerMetric label="Gols" value={`${player.goals}`} />
      </dl>
    </article>
  );
}

function PlayerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-2 py-2">
      <dt className="text-[9px] font-black uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-black">{value}</dd>
    </div>
  );
}
