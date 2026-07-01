"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { ArrowRight, Radio, Table2, Trophy } from "lucide-react";
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
import { countryTheme } from "@/lib/country-theme";
import { isLiveMatch } from "@/lib/match-display";
import type { DemoMatch, DemoTeam } from "@/lib/types";

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

const RADIAL_BRACKET_SIZE = 760;
const RADIAL_CENTER = RADIAL_BRACKET_SIZE / 2;
const TEAM_ORBIT_RADIUS = 330;
const OUTER_MATCH_RADIUS = 270;
const INNER_MATCH_RADIUS = 76;

export function CompetitionOverview({
  matches,
  view,
}: {
  matches: DemoMatch[];
  view: "groups" | "knockout";
}) {
  const groups = useMemo(() => buildGroupStandings(matches), [matches]);
  const knockout = useMemo(() => groupKnockoutMatches(matches), [matches]);
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
  const trophyGlowId = useId();
  const lineGlowId = useId();

  if (mainRounds.length === 0) {
    return (
      <p className="card p-6 text-sm text-muted">
        A chave será exibida quando as partidas eliminatórias forem importadas.
      </p>
    );
  }

  const inferredAdvancers = buildInferredAdvancers(mainRounds);
  const layout = buildRadialBracketLayout(mainRounds, inferredAdvancers);
  const allMatches = mainRounds.flatMap(([, matches]) => matches);
  const finalMatch = mainRounds.at(-1)?.[1]?.[0] ?? null;
  const champion = finalMatch ? advancingTeam(finalMatch, inferredAdvancers) : null;
  const decidedCount = allMatches.filter((match) =>
    advancingTeam(match, inferredAdvancers),
  ).length;
  const liveCount = allMatches.filter(isLiveMatch).length;
  const featuredMatches = allMatches
    .filter((match) => isLiveMatch(match) || advancingTeam(match, inferredAdvancers) || !match.result)
    .slice(0, 4);

  return (
    <section className="knockout-stage-shell">
      <div className="relative z-10 grid gap-4 px-4 pt-4 sm:px-5 sm:pt-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div>
          <p className="eyebrow !text-accent">Eliminatórias</p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="text-2xl font-black sm:text-3xl">Caminho até a taça</h2>
            {champion && (
              <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-black text-accent">
                {champion.shortName} campeão
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center lg:grid-cols-1">
          <RadialStat label="Decididas" value={`${decidedCount}/${allMatches.length}`} />
          <RadialStat label="Ao vivo" value={liveCount.toString()} />
          <RadialStat label="Rodadas" value={mainRounds.length.toString()} />
        </div>
      </div>

      <div className="knockout-orbit-wrap">
        <div className="knockout-orbit">
          <svg
            className="pointer-events-none absolute inset-0 size-full"
            width={RADIAL_BRACKET_SIZE}
            height={RADIAL_BRACKET_SIZE}
            viewBox={`0 0 ${RADIAL_BRACKET_SIZE} ${RADIAL_BRACKET_SIZE}`}
          >
            <defs>
              <radialGradient id={trophyGlowId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.34" />
                <stop offset="48%" stopColor="var(--brand)" stopOpacity="0.13" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <filter id={lineGlowId} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle
              cx={RADIAL_CENTER}
              cy={RADIAL_CENTER}
              r="172"
              fill={`url(#${trophyGlowId})`}
            />
            {[TEAM_ORBIT_RADIUS, OUTER_MATCH_RADIUS, 196, 126].map((radius) => (
              <circle
                key={radius}
                cx={RADIAL_CENTER}
                cy={RADIAL_CENTER}
                r={radius}
                fill="none"
                stroke="var(--line)"
                strokeDasharray="2 16"
                strokeLinecap="round"
                strokeOpacity="0.26"
              />
            ))}

            {layout.connections.map((connection) => (
              <g key={connection.key}>
                <path
                  d={connection.path}
                  fill="none"
                  stroke={connection.active ? connection.color : "var(--line)"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={connection.active ? 0.34 : 0.2}
                  strokeWidth={connection.active ? 5 : 2}
                />
                {connection.active && (
                  <path
                    className="knockout-flow-line"
                    d={connection.path}
                    fill="none"
                    filter={`url(#${lineGlowId})`}
                    stroke={connection.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.8"
                  />
                )}
              </g>
            ))}

            {layout.matchNodes.map((node) => (
              <circle
                key={`${node.match.id}-dot`}
                cx={node.x}
                cy={node.y}
                r={node.winner ? 5 : 3.5}
                fill={node.winner ? node.color : "var(--line)"}
                opacity={node.winner ? 0.95 : 0.48}
              />
            ))}
          </svg>

          {layout.teamNodes.map((node) => (
            <TeamOrbitNode key={node.key} node={node} />
          ))}

          {layout.matchNodes.map((node) => (
            <MatchOrbitNode key={node.match.id} node={node} />
          ))}

          <div className="knockout-trophy-node">
            <span className="knockout-trophy-halo" />
            <span className="relative z-10 flex size-20 items-center justify-center rounded-full border border-accent/55 bg-[#07170f]/90 text-accent shadow-2xl shadow-accent/20 sm:size-24">
              {champion ? (
                <TeamFlag team={champion} size="lg" />
              ) : (
                <Trophy className="size-10 sm:size-12" />
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="sr-only">
        <h2>Chave eliminatória</h2>
        {mainRounds.map(([stage, matches]) => (
          <div key={stage}>
            <h3>{stage}</h3>
            <ul>
              {matches.map((match) => (
                <li key={match.id}>
                  {match.homeTeam.name} {scoreLabel(match, 0)} x {scoreLabel(match, 1)}{" "}
                  {match.awayTeam.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative z-10 grid gap-3 px-4 pb-4 sm:px-5 sm:pb-5 lg:grid-cols-4">
        {featuredMatches.map((match) => (
          <CompactKnockoutMatchCard
            key={match.id}
            match={match}
            winner={advancingTeam(match, inferredAdvancers)}
          />
        ))}
      </div>

      {thirdPlace && (
        <div className="relative z-10 px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-muted">
            {thirdPlace[0]}
          </p>
          <CompactKnockoutMatchCard
            match={thirdPlace[1][0]}
            winner={advancingTeam(thirdPlace[1][0], inferredAdvancers)}
          />
        </div>
      )}
    </section>
  );
}

function RadialStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-white backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-black text-accent">{value}</p>
    </div>
  );
}

function CompactKnockoutMatchCard({
  match,
  winner,
}: {
  match: DemoMatch;
  winner: DemoTeam | null;
}) {
  return (
    <article className="knockout-match-chip">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
        {match.dateLabel} · {match.timeLabel}
      </p>
      <div className="mt-2 grid gap-1">
        {[match.homeTeam, match.awayTeam].map((team, index) => (
          <div
            key={`${match.id}-${team.id}-${index}`}
            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${
              winner?.id === team.id ? "bg-accent/15 text-white" : "text-white/78"
            }`}
          >
            <TeamFlag team={team} size="sm" />
            <span className="min-w-0 flex-1 truncate text-xs font-black">{team.shortName}</span>
            <span className="font-black">{scoreLabel(match, index)}</span>
          </div>
        ))}
      </div>
      {isLiveMatch(match) && (
        <span className="mt-2 inline-flex rounded-full border border-accent/45 bg-accent/12 px-2 py-0.5 text-[9px] font-black uppercase text-accent">
          ao vivo
        </span>
      )}
    </article>
  );
}

function TeamOrbitNode({ node }: { node: RadialTeamNode }) {
  const content = (
    <>
      <span
        className={`knockout-team-orb ${node.advancing ? "knockout-team-orb-advanced" : ""}`}
        style={{ "--team-color": node.color } as React.CSSProperties}
      >
        <TeamFlag team={node.team} size="md" />
      </span>
      <span className="knockout-team-tooltip">{node.team.shortName}</span>
    </>
  );
  const style = radialStyle(node.x, node.y, node.advancing ? 8 : 3);

  if (isKnownTeam(node.team)) {
    return (
      <Link
        href={`/competicao/selecoes/${encodeURIComponent(node.team.id)}`}
        title={node.team.name}
        className="knockout-team-node"
        style={style}
      >
        {content}
      </Link>
    );
  }

  return (
    <span title={node.team.name} className="knockout-team-node" style={style}>
      {content}
    </span>
  );
}

function MatchOrbitNode({ node }: { node: RadialMatchNode }) {
  const title = `${node.match.stageLabel}: ${node.match.homeTeam.name} x ${node.match.awayTeam.name}`;
  return (
    <span
      className={`knockout-match-node ${node.winner ? "knockout-match-node-advanced" : ""} ${
        node.live ? "knockout-match-node-live" : ""
      }`}
      style={{
        ...radialStyle(node.x, node.y, node.winner ? 7 : 2),
        "--team-color": node.color,
      } as React.CSSProperties}
      title={title}
      role="img"
      aria-label={title}
    >
      {node.winner ? (
        <TeamFlag team={node.winner} size="sm" />
      ) : (
        <span className="text-[7px] font-black text-muted">TBD</span>
      )}
    </span>
  );
}

type RadialTeamNode = RadialPoint & {
  key: string;
  team: DemoTeam;
  color: string;
  advancing: boolean;
};

type RadialMatchNode = RadialPoint & {
  match: DemoMatch;
  color: string;
  winner: DemoTeam | null;
  live: boolean;
};

type RadialConnection = {
  key: string;
  path: string;
  color: string;
  active: boolean;
};

type RadialPoint = {
  x: number;
  y: number;
  angle: number;
  radius: number;
};

function buildRadialBracketLayout(
  rounds: KnockoutRound[],
  inferredAdvancers: Map<number, DemoTeam>,
) {
  const firstRound = rounds[0]?.[1] ?? [];
  const teamSlots = firstRound.flatMap((match) => [match.homeTeam, match.awayTeam]);
  const slotCount = Math.max(teamSlots.length, 1);
  const slotStep = 360 / slotCount;
  const teamNodes: RadialTeamNode[] = [];
  const roundNodes: RadialMatchNode[][] = [];
  const connections: RadialConnection[] = [];
  const matchRadiusStep =
    rounds.length > 1 ? (OUTER_MATCH_RADIUS - INNER_MATCH_RADIUS) / (rounds.length - 1) : 0;

  for (const [roundIndex, [, matches]] of rounds.entries()) {
    const previousNodes = roundNodes[roundIndex - 1] ?? [];
    const radius = Math.max(
      INNER_MATCH_RADIUS,
      OUTER_MATCH_RADIUS - roundIndex * matchRadiusStep,
    );
    const previousByNumber = matchNumberNodeMap(previousNodes);

    const nodes = matches.map((match, matchIndex) => {
      const sourceNodes = knockoutSourceMatchNumbers(match)
        .map((number) => previousByNumber.get(number))
        .filter((item): item is RadialMatchNode => Boolean(item));
      const angle =
        roundIndex === 0
          ? -90 + (matchIndex * 2 + 0.5) * slotStep
          : sourceNodes.length > 0
            ? averageAngles(sourceNodes.map((node) => node.angle))
            : -90 + ((matchIndex + 0.5) * 360) / Math.max(matches.length, 1);
      const point = pointFromPolar(angle, radius);
      const winner = advancingTeam(match, inferredAdvancers);

      return {
        match,
        ...point,
        color: winner ? teamColor(winner) : "var(--line)",
        winner,
        live: isLiveMatch(match),
      };
    });

    roundNodes.push(nodes);

    if (roundIndex === 0) {
      for (const [matchIndex, match] of matches.entries()) {
        const target = nodes[matchIndex];
        for (const [teamIndex, team] of [match.homeTeam, match.awayTeam].entries()) {
          const slotIndex = matchIndex * 2 + teamIndex;
          const teamPoint = pointFromPolar(-90 + slotIndex * slotStep, TEAM_ORBIT_RADIUS);
          const color = teamColor(team);
          const winner = target.winner?.id === team.id;

          teamNodes.push({
            key: `${match.id}-${team.id}-${teamIndex}`,
            team,
            color,
            advancing: winner,
            ...teamPoint,
          });

          connections.push({
            key: `${match.id}-${team.id}-entry`,
            path: radialPath(teamPoint, target),
            color,
            active: winner,
          });
        }
      }
    } else {
      const previous = roundNodes[roundIndex - 1];
      for (const [matchIndex, match] of matches.entries()) {
        const target =
          roundIndex === rounds.length - 1
            ? { x: RADIAL_CENTER, y: RADIAL_CENTER }
            : nodes[matchIndex];
        const sources = sourceLayoutNodes(match, previous) ?? [
          previous[matchIndex * 2],
          previous[matchIndex * 2 + 1] ?? previous[matchIndex * 2],
        ].filter((item): item is RadialMatchNode => Boolean(item));

        for (const [sourceIndex, source] of sources.entries()) {
          connections.push({
            key: `${match.id}-${source.match.id}-${sourceIndex}`,
            path: radialPath(source, target),
            color: source.color,
            active: Boolean(source.winner),
          });
        }
      }
    }
  }

  const finalMatch = rounds.at(-1)?.[1]?.[0] ?? null;
  const champion = finalMatch ? advancingTeam(finalMatch, inferredAdvancers) : null;
  if (champion) {
    const finalNode = roundNodes.at(-1)?.[0];
    if (finalNode) {
      connections.push({
        key: `${finalMatch?.id ?? "final"}-champion`,
        path: radialPath(finalNode, { x: RADIAL_CENTER, y: RADIAL_CENTER }),
        color: teamColor(champion),
        active: true,
      });
    }
  }

  return {
    teamNodes,
    matchNodes: roundNodes.flat().filter((node) => node.match.stage !== "final"),
    connections,
  };
}

function sourceLayoutNodes(target: DemoMatch, previous: RadialMatchNode[]) {
  const previousByNumber = matchNumberNodeMap(previous);
  const sources = knockoutSourceMatchNumbers(target)
    .map((number) => previousByNumber.get(number))
    .filter((item): item is RadialMatchNode => Boolean(item))
    .sort((left, right) => left.angle - right.angle);

  return sources.length > 0 ? sources : null;
}

function matchNumberNodeMap(nodes: RadialMatchNode[]) {
  return new Map(
    nodes.flatMap((node) =>
      typeof node.match.matchNumber === "number" ? [[node.match.matchNumber, node] as const] : [],
    ),
  );
}

function buildInferredAdvancers(rounds: KnockoutRound[]) {
  const matchesByNumber = new Map(
    rounds.flatMap(([, matches]) =>
      matches.flatMap((match) =>
        typeof match.matchNumber === "number" ? [[match.matchNumber, match] as const] : [],
      ),
    ),
  );
  const advancers = new Map<number, DemoTeam>();

  for (const [, matches] of rounds.slice(1)) {
    for (const target of matches) {
      for (const sourceNumber of knockoutSourceMatchNumbers(target)) {
        const source = matchesByNumber.get(sourceNumber);
        if (!source) continue;
        const sourceTeamIds = new Set([source.homeTeam.id, source.awayTeam.id]);
        const inferred = [target.homeTeam, target.awayTeam].find(
          (team) => isKnownTeam(team) && sourceTeamIds.has(team.id),
        );
        if (inferred) advancers.set(sourceNumber, inferred);
      }
    }
  }

  return advancers;
}

function advancingTeam(match: DemoMatch, inferredAdvancers = new Map<number, DemoTeam>()) {
  const score = match.result ?? match.liveResult;
  if (score) {
    if (score.advancingTeamId) {
      return [match.homeTeam, match.awayTeam].find((team) => team.id === score.advancingTeamId) ?? null;
    }
    if (score.homeScore > score.awayScore) return match.homeTeam;
    if (score.awayScore > score.homeScore) return match.awayTeam;
  }
  return typeof match.matchNumber === "number" ? inferredAdvancers.get(match.matchNumber) ?? null : null;
}

function scoreLabel(match: DemoMatch, teamIndex: number) {
  const score = match.result ?? match.liveResult;
  if (!score) return "—";
  return teamIndex === 0 ? score.homeScore : score.awayScore;
}

function radialStyle(x: number, y: number, zIndex: number) {
  return {
    left: `${(x / RADIAL_BRACKET_SIZE) * 100}%`,
    top: `${(y / RADIAL_BRACKET_SIZE) * 100}%`,
    zIndex,
  };
}

function pointFromPolar(angle: number, radius: number): RadialPoint {
  const radians = (angle * Math.PI) / 180;
  return {
    x: RADIAL_CENTER + Math.cos(radians) * radius,
    y: RADIAL_CENTER + Math.sin(radians) * radius,
    angle,
    radius,
  };
}

function radialPath(start: Pick<RadialPoint, "x" | "y">, end: Pick<RadialPoint, "x" | "y">) {
  const startAngle = angleFromCenter(start);
  const endAngle = angleFromCenter(end);
  const startRadius = distanceFromCenter(start);
  const endRadius = distanceFromCenter(end);
  const midRadius = (startRadius + endRadius) / 2;
  const firstControl = pointFromPolar(startAngle, midRadius);
  const secondControl = pointFromPolar(endAngle, midRadius);

  return `M ${round(start.x)} ${round(start.y)} C ${round(firstControl.x)} ${round(
    firstControl.y,
  )} ${round(secondControl.x)} ${round(secondControl.y)} ${round(end.x)} ${round(end.y)}`;
}

function angleFromCenter(point: Pick<RadialPoint, "x" | "y">) {
  return (Math.atan2(point.y - RADIAL_CENTER, point.x - RADIAL_CENTER) * 180) / Math.PI;
}

function distanceFromCenter(point: Pick<RadialPoint, "x" | "y">) {
  return Math.hypot(point.x - RADIAL_CENTER, point.y - RADIAL_CENTER);
}

function averageAngles(angles: number[]) {
  if (angles.length === 0) return -90;
  const vector = angles.reduce(
    (total, angle) => {
      const radians = (angle * Math.PI) / 180;
      total.x += Math.cos(radians);
      total.y += Math.sin(radians);
      return total;
    },
    { x: 0, y: 0 },
  );
  if (Math.abs(vector.x) < 0.001 && Math.abs(vector.y) < 0.001) {
    return angles.reduce((total, angle) => total + angle, 0) / angles.length;
  }
  return (Math.atan2(vector.y, vector.x) * 180) / Math.PI;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function teamColor(team: DemoTeam) {
  const code = countryCodeFromFlag(team);
  if (code) return countryTheme(code).primary;

  const hue = Array.from(team.id).reduce((total, letter) => total + letter.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 70% 52%)`;
}

function countryCodeFromFlag(team: DemoTeam) {
  if (team.code === "ENG") return "gb";
  const regional = Array.from(team.flag).map((character) => character.codePointAt(0));
  if (
    regional.length !== 2 ||
    regional.some((codepoint) => !codepoint || codepoint < 0x1f1e6 || codepoint > 0x1f1ff)
  ) {
    return null;
  }
  return regional
    .map((codepoint) => String.fromCharCode((codepoint ?? 0) - 0x1f1e6 + 97))
    .join("");
}

function isKnownTeam(team: DemoTeam) {
  return !team.id.startsWith("unknown-");
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
