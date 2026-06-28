"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { ArrowRight, Radio, Table2, Trophy } from "lucide-react";
import { DragScrollArea } from "@/components/drag-scroll-area";
import { LiveRefresh } from "@/components/live-refresh";
import { TeamFlag } from "@/components/team-flag";
import {
  buildGroupStandings,
  groupKnockoutMatches,
  knockoutSourceMatchNumbers,
  nextMatchForTeam,
  opponentForTeam,
  orderKnockoutRoundsForBracket,
} from "@/lib/competition";
import type { GroupStanding, KnockoutRound } from "@/lib/competition";
import { isLiveMatch } from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

const STANDING_COLUMNS = [
  ["Pts", "Pontos"],
  ["J", "Jogos"],
  ["V", "Vitórias"],
  ["E", "Empates"],
  ["D", "Derrotas"],
  ["GP", "Gols pró"],
  ["GC", "Gols contra"],
  ["SG", "Saldo de gols"],
] as const;

const CARD_WIDTH = 232;
const CARD_HEIGHT = 96;
const ROUND_GAP = 58;
const MATCH_GAP = 22;
const TOP_OFFSET = 44;

export function CompetitionOverview({
  matches,
  view,
}: {
  matches: DemoMatch[];
  view: "groups" | "knockout";
}) {
  const groups = buildGroupStandings(matches);
  const knockout = groupKnockoutMatches(matches);
  const hasLive = matches.some(isLiveMatch);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );
  const nextByTeam = useMemo(() => {
    const map = new Map<string, DemoMatch | null>();
    for (const match of matches) {
      for (const team of [match.homeTeam, match.awayTeam]) {
        if (!team.id.startsWith("unknown-") && !map.has(team.id)) {
          map.set(team.id, nextMatchForTeam(matches, team.id));
        }
      }
    }
    return map;
  }, [matches]);

  return (
    <>
      <LiveRefresh active={hasLive || awaitingOfficial} />
      {(hasLive || awaitingOfficial) && (
        <div className="status-live mb-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold">
          <Radio className="size-4" />
          {hasLive
            ? "Classificação atualizada com os placares ao vivo. Valores provisórios."
            : "Há placares aguardando confirmação oficial."}
        </div>
      )}
      <div className="card mb-6 grid grid-cols-2 gap-2 p-2">
        <ViewLink active={view === "groups"} href="/competicao" icon={Table2}>
          Fase de grupos
        </ViewLink>
        <ViewLink active={view === "knockout"} href="/competicao?aba=eliminatorias" icon={Trophy}>
          Eliminatórias
        </ViewLink>
      </div>

      {view === "groups" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map(([group, standings]) => (
            <GroupTable
              key={group}
              group={group}
              standings={standings}
              nextByTeam={nextByTeam}
            />
          ))}
        </div>
      ) : (
        <KnockoutBracket knockout={knockout} />
      )}
    </>
  );
}

function GroupTable({
  group,
  standings,
  nextByTeam,
}: {
  group: string;
  standings: GroupStanding[];
  nextByTeam: Map<string, DemoMatch | null>;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-black">Grupo {group}</h2>
        {standings.some((entry) => entry.provisional) && (
          <span className="status-live rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
            Ao vivo
          </span>
        )}
      </div>

      <table className="hidden w-full table-fixed text-sm md:table">
        <thead className="bg-surface-muted/65 text-[10px] uppercase tracking-wider text-muted">
          <tr>
            <th className="w-14 px-4 py-2 text-left">Pos.</th>
            <th className="px-2 py-2 text-left">Seleção</th>
            {STANDING_COLUMNS.map(([label, title]) => (
              <th key={label} className="w-10 px-1 py-2 text-center">
                <abbr title={title} className="cursor-help no-underline">
                  {label}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {standings.map((entry, index) => (
            <tr key={entry.team.id} className={index < 2 ? "bg-accent/10" : undefined}>
              <td className="px-4 py-3 text-center font-black text-muted">{index + 1}</td>
              <td className="px-2 py-3">
                <TeamStandingLink
                  entry={entry}
                  nextMatch={nextByTeam.get(entry.team.id) ?? null}
                />
              </td>
              <td className="px-1 py-3 text-center font-black">{entry.points}</td>
              {[
                entry.played,
                entry.wins,
                entry.draws,
                entry.losses,
                entry.goalsFor,
                entry.goalsAgainst,
                entry.goalDifference,
              ].map((value, valueIndex) => (
                <td key={valueIndex} className="px-1 py-3 text-center text-muted">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="divide-y md:hidden">
        {standings.map((entry, index) => (
          <MobileStandingCard
            key={entry.team.id}
            entry={entry}
            position={index + 1}
            nextMatch={nextByTeam.get(entry.team.id) ?? null}
          />
        ))}
      </div>
    </section>
  );
}

function MobileStandingCard({
  entry,
  position,
  nextMatch,
}: {
  entry: GroupStanding;
  position: number;
  nextMatch: DemoMatch | null;
}) {
  return (
    <Link
      href={`/competicao/selecoes/${encodeURIComponent(entry.team.id)}`}
      className={`block px-4 py-4 ${position <= 2 ? "bg-accent/10" : ""}`}
      title={describeNextMatch(entry.team.id, nextMatch)}
    >
      <div className="flex items-center gap-3">
        <span className="w-7 text-center text-sm font-black text-muted">{position}</span>
        <TeamFlag team={entry.team} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black">{entry.team.name}</p>
          <p className="text-[11px] font-bold text-muted">
            {nextMatch ? describeNextMatch(entry.team.id, nextMatch) : "Toque para ver jogos e detalhes"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black">{entry.points}</p>
          <p className="text-[10px] font-bold uppercase text-muted">pts</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ["J", entry.played],
          ["V", entry.wins],
          ["E", entry.draws],
          ["D", entry.losses],
          ["GP", entry.goalsFor],
          ["GC", entry.goalsAgainst],
          ["SG", entry.goalDifference],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface-muted px-2 py-2">
            <dt className="text-[10px] font-black uppercase text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-black">{value}</dd>
          </div>
        ))}
        <div className="rounded-xl bg-surface-muted px-2 py-2">
          <dt className="text-[10px] font-black uppercase text-muted">Detalhes</dt>
          <dd className="mt-0.5 inline-flex items-center justify-center gap-1 text-sm font-black text-brand">
            Ver <ArrowRight className="size-3" />
          </dd>
        </div>
      </dl>
    </Link>
  );
}

function TeamStandingLink({
  entry,
  nextMatch,
}: {
  entry: GroupStanding;
  nextMatch: DemoMatch | null;
}) {
  return (
    <Link
      href={`/competicao/selecoes/${encodeURIComponent(entry.team.id)}`}
      title={describeNextMatch(entry.team.id, nextMatch)}
      className="interactive flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 font-bold hover:bg-surface-muted"
    >
      <TeamFlag team={entry.team} size="sm" />
      <span className="min-w-0 flex-1 truncate">{entry.team.name}</span>
    </Link>
  );
}

function KnockoutBracket({
  knockout,
}: {
  knockout: ReturnType<typeof groupKnockoutMatches>;
}) {
  const thirdPlace = knockout.find(([stage]) => stage === "Terceiro lugar");
  const mainRounds = orderKnockoutRoundsForBracket(
    knockout.filter(([stage]) => stage !== "Terceiro lugar"),
  );
  const layout = buildBracketLayout(mainRounds);

  if (mainRounds.length === 0) {
    return (
      <p className="card p-6 text-sm text-muted">
        A chave será exibida quando as partidas eliminatórias forem importadas.
      </p>
    );
  }

  return (
    <DragScrollArea ariaLabel="Chave da Copa" className="pb-4">
      <div
        className="relative"
        style={{
          width: layout.width,
          height: layout.height,
        }}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
        >
          {layout.connections.map((connection) => (
            <path
              key={connection.key}
              d={connection.path}
              fill="none"
              stroke="var(--line)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          ))}
        </svg>
        {layout.rounds.map((round) => (
          <div
            key={round.stage}
            className="absolute top-0 text-center text-sm font-black"
            style={{ left: round.x, width: CARD_WIDTH }}
          >
            {round.stage}
          </div>
        ))}
        {layout.rounds.flatMap((round) =>
          round.matches.map((item) => (
            <BracketMatchCard
              key={item.match.id}
              match={item.match}
              style={{
                left: round.x,
                top: item.y + TOP_OFFSET,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
              }}
            />
          )),
        )}
        {thirdPlace && (
          <div
            className="absolute"
            style={{
              left: layout.thirdPlaceX,
              top: layout.thirdPlaceY,
              width: CARD_WIDTH,
            }}
          >
            <h2 className="mb-3 text-center text-sm font-black">{thirdPlace[0]}</h2>
            <BracketMatchCard
              match={thirdPlace[1][0]}
              style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
              absolute={false}
            />
          </div>
        )}
      </div>
    </DragScrollArea>
  );
}

function BracketMatchCard({
  match,
  style,
  absolute = true,
}: {
  match: DemoMatch;
  style: CSSProperties;
  absolute?: boolean;
}) {
  return (
    <article
      className={`card grid content-center overflow-hidden p-3 ${absolute ? "absolute" : ""}`}
      style={style}
    >
      <p className="mb-2 truncate text-[11px] font-bold text-muted">
        {match.dateLabel} · {match.timeLabel}
      </p>
      {[match.homeTeam, match.awayTeam].map((team, index) => (
        <div key={`${match.id}-${team.id}-${index}`} className="flex items-center gap-2 py-1">
          <TeamFlag team={team} size="sm" />
          <span className="min-w-0 flex-1 truncate text-xs font-black">{team.shortName}</span>
          <span className="font-black">
            {match.result
              ? index === 0
                ? match.result.homeScore
                : match.result.awayScore
              : match.liveResult
                ? index === 0
                  ? match.liveResult.homeScore
                  : match.liveResult.awayScore
                : "—"}
          </span>
        </div>
      ))}
      {isLiveMatch(match) && (
        <span className="status-live absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[9px] font-black">
          ao vivo
        </span>
      )}
    </article>
  );
}

function buildBracketLayout(rounds: KnockoutRound[]) {
  const laidOutRounds = rounds.map(([stage, matches], roundIndex) => {
    const x = roundIndex * (CARD_WIDTH + ROUND_GAP);
    return {
      stage,
      x,
      matches: matches.map((match, index) => ({
        match,
        y: roundIndex === 0 ? index * (CARD_HEIGHT + MATCH_GAP) : 0,
      })),
    };
  });

  for (let roundIndex = 1; roundIndex < laidOutRounds.length; roundIndex += 1) {
    const previous = laidOutRounds[roundIndex - 1].matches;
    laidOutRounds[roundIndex].matches = laidOutRounds[roundIndex].matches.map((item, index) => {
      const sources = sourceLayoutItems(item.match, previous) ?? [
        previous[index * 2],
        previous[index * 2 + 1] ?? previous[index * 2],
      ].filter(Boolean);
      const firstCenter = Math.min(...sources.map((source) => source.y + CARD_HEIGHT / 2));
      const secondCenter = Math.max(...sources.map((source) => source.y + CARD_HEIGHT / 2));
      return {
        ...item,
        y: (firstCenter + secondCenter) / 2 - CARD_HEIGHT / 2,
      };
    });
  }

  const connections = laidOutRounds.flatMap((round, roundIndex) => {
    const nextRound = laidOutRounds[roundIndex + 1];
    if (!nextRound) return [];
    return nextRound.matches.flatMap((target, targetIndex) => {
      const sources = sourceLayoutItems(target.match, round.matches) ?? [
        round.matches[targetIndex * 2],
        round.matches[targetIndex * 2 + 1],
      ].filter(Boolean);
      return sources.map((source, sourceIndex) => {
        const startX = round.x + CARD_WIDTH;
        const endX = nextRound.x;
        const midX = startX + ROUND_GAP / 2;
        const startY = source.y + TOP_OFFSET + CARD_HEIGHT / 2;
        const endY = target.y + TOP_OFFSET + CARD_HEIGHT / 2;
        return {
          key: `${round.stage}-${target.match.id}-${sourceIndex}`,
          path: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`,
        };
      });
    });
  });

  const bracketHeight =
    Math.max(
      ...laidOutRounds.flatMap((round) => round.matches.map((item) => item.y + CARD_HEIGHT)),
    ) + TOP_OFFSET;
  const width = Math.max(1, laidOutRounds.length) * CARD_WIDTH + Math.max(0, laidOutRounds.length - 1) * ROUND_GAP;
  const thirdPlaceX = Math.max(0, width - CARD_WIDTH);
  const thirdPlaceY = bracketHeight + 44;

  return {
    rounds: laidOutRounds,
    connections,
    width,
    height: bracketHeight + 190,
    thirdPlaceX,
    thirdPlaceY,
  };
}

function sourceLayoutItems(
  target: DemoMatch,
  previous: Array<{ match: DemoMatch; y: number }>,
) {
  const previousByNumber = new Map(
    previous.flatMap((item) =>
      typeof item.match.matchNumber === "number" ? [[item.match.matchNumber, item] as const] : [],
    ),
  );
  const sources = knockoutSourceMatchNumbers(target)
    .map((number) => previousByNumber.get(number))
    .filter((item): item is { match: DemoMatch; y: number } => Boolean(item))
    .sort((left, right) => left.y - right.y);

  return sources.length > 0 ? sources : null;
}

function describeNextMatch(teamId: string, match: DemoMatch | null) {
  if (!match) return "Sem próximo jogo definido";
  const opponent = opponentForTeam(match, teamId);
  return `Próximo: ${match.dateLabel} · ${match.timeLabel}${opponent ? ` contra ${opponent.name}` : ""}`;
}

function ViewLink({
  active,
  href,
  icon: Icon,
  children,
}: {
  active: boolean;
  href: string;
  icon: typeof Trophy;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`interactive flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black ${
        active ? "bg-brand text-white" : "text-muted hover:bg-surface-muted"
      }`}
    >
      <Icon className="size-4" /> {children}
    </Link>
  );
}
