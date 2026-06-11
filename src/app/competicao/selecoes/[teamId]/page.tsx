import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Goal, Shield, Trophy } from "lucide-react";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import { TeamFlag } from "@/components/team-flag";
import {
  findTeamById,
  matchesForTeam,
  nextMatchForTeam,
  opponentForTeam,
  standingForTeam,
} from "@/lib/competition";
import { getMatches } from "@/lib/data/matches";
import { isLiveMatch } from "@/lib/match-display";
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
                {opponentForTeam(nextMatch, team.id)?.name ?? "Adversário a definir"}
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

      <section className="card mt-8 p-5">
        <p className="eyebrow">Dados de atletas</p>
        <h2 className="mt-1 text-xl font-black">Jogadores, cartões e assistências</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          O banco atual ainda não registra estatísticas individuais de atletas. Quando um provedor confiável
          entrar no pipeline, esta área pode listar artilharia, assistências, cartões, faltas e rankings por seleção.
        </p>
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

function TeamMatchCard({ match, teamId }: { match: DemoMatch; teamId: string }) {
  const opponent = opponentForTeam(match, teamId);
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
      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border bg-surface-muted p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted">
            {isHome ? "Mandante" : "Visitante"}
          </p>
          <p className="mt-1 truncate text-sm font-black">
            vs {opponent?.name ?? "A definir"}
          </p>
          <p className="mt-1 text-xs text-muted">{match.venue}</p>
        </div>
        <p className="text-2xl font-black">
          {score ? `${isHome ? score.homeScore : score.awayScore} × ${isHome ? score.awayScore : score.homeScore}` : "—"}
        </p>
      </div>
    </article>
  );
}
