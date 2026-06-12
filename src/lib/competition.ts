import type { DemoMatch, DemoTeam } from "@/lib/types";

export type GroupStanding = {
  team: DemoTeam;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  provisional: boolean;
};

export function buildGroupStandings(matches: DemoMatch[]) {
  const groups = new Map<string, Map<string, GroupStanding>>();

  for (const match of matches.filter((item) => item.stage === "group")) {
    const group = groupName(match);
    const standings = groups.get(group) ?? new Map<string, GroupStanding>();
    ensureStanding(standings, match.homeTeam);
    ensureStanding(standings, match.awayTeam);

    const score = match.result ?? match.liveResult;
    if (score) {
      applyScore(
        standings.get(match.homeTeam.id)!,
        standings.get(match.awayTeam.id)!,
        score.homeScore,
        score.awayScore,
        !match.result,
      );
    }
    groups.set(group, standings);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
    .map(([group, standings]) => [
      group,
      [...standings.values()].sort(compareStandings),
    ] as const);
}

export function groupKnockoutMatches(matches: DemoMatch[]) {
  const stageOrder: DemoMatch["stage"][] = [
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ];
  return stageOrder.flatMap((stage) => {
    const stageMatches = matches.filter((match) => match.stage === stage);
    return stageMatches.length > 0 ? [[stageMatches[0].stageLabel, stageMatches] as const] : [];
  });
}

export function findTeamById(matches: DemoMatch[], teamId: string) {
  return uniqueTeams(matches).find((team) => team.id === teamId) ?? null;
}

export function uniqueTeams(matches: DemoMatch[]) {
  return Array.from(
    new Map(
      matches
        .flatMap((match) => [match.homeTeam, match.awayTeam])
        .filter((team) => !team.id.startsWith("unknown-"))
        .map((team) => [team.id, team]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export function matchesForTeam(matches: DemoMatch[], teamId: string) {
  return matches
    .filter((match) => match.homeTeam.id === teamId || match.awayTeam.id === teamId)
    .sort(compareMatchSchedule);
}

export function nextMatchForTeam(matches: DemoMatch[], teamId: string) {
  const now = Date.now();
  return (
    matchesForTeam(matches, teamId).find((match) => {
      if (match.result) return false;
      if (!match.scheduledAt) return true;
      return new Date(match.scheduledAt).getTime() >= now;
    }) ?? null
  );
}

export function standingForTeam(matches: DemoMatch[], teamId: string) {
  for (const [group, standings] of buildGroupStandings(matches)) {
    const standing = standings.find((entry) => entry.team.id === teamId);
    if (standing) return { group, standing };
  }
  return null;
}

export function opponentForTeam(match: DemoMatch, teamId: string) {
  if (match.homeTeam.id === teamId) return match.awayTeam;
  if (match.awayTeam.id === teamId) return match.homeTeam;
  return null;
}

function compareMatchSchedule(left: DemoMatch, right: DemoMatch) {
  const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.scheduledAt ? new Date(right.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime || left.stageLabel.localeCompare(right.stageLabel, "pt-BR");
}

function groupName(match: DemoMatch) {
  return match.stageLabel.replace(/^Grupo\s+/i, "").trim() || "A definir";
}

function ensureStanding(standings: Map<string, GroupStanding>, team: DemoTeam) {
  if (standings.has(team.id)) return;
  standings.set(team.id, {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    provisional: false,
  });
}

function applyScore(
  home: GroupStanding,
  away: GroupStanding,
  homeScore: number,
  awayScore: number,
  provisional: boolean,
) {
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeScore;
  home.goalsAgainst += awayScore;
  away.goalsFor += awayScore;
  away.goalsAgainst += homeScore;
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  away.goalDifference = away.goalsFor - away.goalsAgainst;
  home.provisional ||= provisional;
  away.provisional ||= provisional;

  if (homeScore === awayScore) {
    home.draws += 1;
    away.draws += 1;
    home.points += 1;
    away.points += 1;
  } else if (homeScore > awayScore) {
    home.wins += 1;
    away.losses += 1;
    home.points += 3;
  } else {
    away.wins += 1;
    home.losses += 1;
    away.points += 3;
  }
}

function compareStandings(left: GroupStanding, right: GroupStanding) {
  return (
    right.points - left.points ||
    right.goalDifference - left.goalDifference ||
    right.goalsFor - left.goalsFor ||
    left.team.name.localeCompare(right.team.name, "pt-BR")
  );
}
