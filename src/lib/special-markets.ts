import { allPlayers, positionLabel, type SquadPosition } from "@/lib/squads";
import type { DemoMatch, DemoTeam } from "@/lib/types";

export type SpecialMarketValueType = "player" | "team" | "team_set";
export type SpecialMarketOptionSource = "players" | "goalkeepers" | "teams";
export type SpecialMarketAutomaticKey =
  | "team_most_goals"
  | "team_fewest_conceded";

export type SpecialOption = {
  key: string;
  label: string;
  description: string;
  teamId: string;
  teamCode: string;
  teamName: string;
  teamFlag?: string;
  position?: SquadPosition;
  number?: number;
  fullName?: string;
  club?: string;
  age?: number;
  heightCm?: number;
  caps?: number;
  goals?: number;
  teamStats?: SpecialTeamStats;
};

export type AutomaticSuggestion = {
  key: string;
  label: string;
  description: string;
  teamId: string;
  teamCode: string;
  teamName: string;
  value: number;
};

export type SpecialTeamStats = {
  played: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export function buildSpecialOptions(
  teams: DemoTeam[],
  source: SpecialMarketOptionSource,
): SpecialOption[] {
  const teamsByCode = new Map(
    teams
      .filter((team) => team.code)
      .map((team) => [team.code?.toUpperCase(), team]),
  );

  if (source === "teams") {
    return teams
      .filter((team) => team.code)
      .map((team) => ({
        key: teamOptionKey(team),
        label: team.name,
        description: "Seleção",
        teamId: team.id,
        teamCode: team.code!,
        teamName: team.name,
        teamFlag: team.flag,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  }

  const playerOptions: SpecialOption[] = [];
  for (const player of allPlayers()) {
    if (source === "goalkeepers" && player.position !== "GK") continue;
    const databaseTeam = teamsByCode.get(player.team.code);
    if (!databaseTeam?.code) continue;

    playerOptions.push({
      key: playerOptionKey(player.team.code, player.number, player.fullName),
      label: player.name,
      description: `${databaseTeam.name} · ${positionLabel(player.position)}`,
      teamId: databaseTeam.id,
      teamCode: databaseTeam.code,
      teamName: databaseTeam.name,
      teamFlag: databaseTeam.flag,
      position: player.position,
      number: player.number,
      fullName: player.fullName,
      club: player.club,
      age: playerAgeFromDob(player.dob),
      heightCm: player.heightCm,
      caps: player.caps,
      goals: player.goals,
    });
  }

  return playerOptions.sort(
    (left, right) =>
      left.label.localeCompare(right.label, "pt-BR") ||
      left.teamName.localeCompare(right.teamName, "pt-BR"),
    );
}

export function attachTeamStats(options: SpecialOption[], matches: DemoMatch[]) {
  const stats = new Map<string, SpecialTeamStats>();
  for (const option of options) {
    if (!option.teamId) continue;
    stats.set(option.teamId, emptyTeamStats());
  }

  for (const match of matches) {
    const score = match.result ?? match.liveResult;
    if (!score) continue;
    const home = stats.get(match.homeTeam.id);
    const away = stats.get(match.awayTeam.id);
    if (!home || !away) continue;
    applyTeamScore(home, score.homeScore, score.awayScore);
    applyTeamScore(away, score.awayScore, score.homeScore);
  }

  return options.map((option) => ({
    ...option,
    teamStats: option.teamId ? stats.get(option.teamId) : undefined,
  }));
}

export function highlightSpecialOptions(
  marketKey: string,
  options: SpecialOption[],
  limit = 12,
) {
  return [...options]
    .sort((left, right) => {
      const scoreDiff =
        specialOptionScore(marketKey, right) - specialOptionScore(marketKey, left);
      if (scoreDiff !== 0) return scoreDiff;
      return left.label.localeCompare(right.label, "pt-BR");
    })
    .slice(0, limit);
}

export function teamOptionKey(team: Pick<DemoTeam, "code" | "id">) {
  return `team:${team.code ?? team.id}`;
}

export function playerOptionKey(teamCode: string, number: number, fullName: string) {
  return `player:${teamCode.toUpperCase()}:${number}:${slugify(fullName)}`;
}

export function optionPayload(option: SpecialOption | AutomaticSuggestion) {
  return {
    key: option.key,
    label: option.label,
    team_id: option.teamId,
  };
}

export function summarizeSpecialOption(option?: SpecialOption | AutomaticSuggestion | null) {
  if (!option) return "A definir";
  return `${option.label} · ${option.teamName}`;
}

export function computeAutomaticSuggestions(
  automaticKey: SpecialMarketAutomaticKey,
  matches: DemoMatch[],
  teams: DemoTeam[],
): AutomaticSuggestion[] {
  const rows = teams
    .filter((team) => team.code)
    .map((team) => ({
      team,
      goalsFor: 0,
      goalsAgainst: 0,
      played: 0,
    }));
  const byId = new Map(rows.map((row) => [row.team.id, row]));

  for (const match of matches) {
    const score = match.result ?? match.liveResult;
    if (!score) continue;
    const home = byId.get(match.homeTeam.id);
    const away = byId.get(match.awayTeam.id);
    if (!home || !away) continue;
    home.goalsFor += score.homeScore;
    home.goalsAgainst += score.awayScore;
    home.played += 1;
    away.goalsFor += score.awayScore;
    away.goalsAgainst += score.homeScore;
    away.played += 1;
  }

  const eligible = rows.filter((row) => row.played > 0);
  if (eligible.length === 0) return [];

  const metric =
    automaticKey === "team_most_goals"
      ? Math.max(...eligible.map((row) => row.goalsFor))
      : Math.min(...eligible.map((row) => row.goalsAgainst));

  return eligible
    .filter((row) =>
      automaticKey === "team_most_goals"
        ? row.goalsFor === metric
        : row.goalsAgainst === metric,
    )
    .sort((left, right) => left.team.name.localeCompare(right.team.name, "pt-BR"))
    .map((row) => {
      const value =
        automaticKey === "team_most_goals" ? row.goalsFor : row.goalsAgainst;
      return {
        key: teamOptionKey(row.team),
        label: row.team.name,
        description:
          automaticKey === "team_most_goals"
            ? `${value} gols marcados em ${row.played} jogo(s)`
            : `${value} gols sofridos em ${row.played} jogo(s)`,
        teamId: row.team.id,
        teamCode: row.team.code!,
        teamName: row.team.name,
        value,
      };
    });
}

export function localSpecialDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(date))
    .replace(".", "");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function playerAgeFromDob(dob: string) {
  const [day, month, year] = dob.split("/").map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  const tournamentStart = new Date(Date.UTC(2026, 5, 11));
  let age = tournamentStart.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayPassed =
    tournamentStart.getUTCMonth() > birth.getUTCMonth() ||
    (tournamentStart.getUTCMonth() === birth.getUTCMonth() &&
      tournamentStart.getUTCDate() >= birth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

function emptyTeamStats(): SpecialTeamStats {
  return {
    played: 0,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  };
}

function applyTeamScore(stats: SpecialTeamStats, goalsFor: number, goalsAgainst: number) {
  stats.played += 1;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;
  stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  if (goalsFor > goalsAgainst) {
    stats.points += 3;
    stats.wins += 1;
  } else if (goalsFor === goalsAgainst) {
    stats.points += 1;
    stats.draws += 1;
  } else {
    stats.losses += 1;
  }
}

function specialOptionScore(marketKey: string, option: SpecialOption) {
  if (option.position) {
    const caps = option.caps ?? 0;
    const goals = option.goals ?? 0;
    const height = option.heightCm ?? 0;
    const positionBonus = {
      GK: marketKey === "golden_glove" ? 90 : 8,
      DF: marketKey === "golden_ball" ? 18 : 4,
      MF: marketKey === "top_scorer" ? 22 : 36,
      FW: marketKey === "top_assists" ? 28 : 42,
    }[option.position];

    if (marketKey === "top_assists") {
      return caps * 1.35 + goals * 2.1 + positionBonus;
    }
    if (marketKey === "golden_glove") {
      return caps * 1.4 + height * 0.2 + positionBonus;
    }
    if (marketKey === "golden_ball") {
      return caps * 1.15 + goals * 5.5 + positionBonus;
    }
    return caps * 0.75 + goals * 7.2 + positionBonus;
  }

  const stats = option.teamStats;
  if (!stats) return 0;
  if (marketKey === "team_most_goals") {
    return stats.goalsFor * 15 + stats.points * 3 + stats.goalDifference;
  }
  if (marketKey === "team_fewest_conceded") {
    return (stats.played > 0 ? 100 : 0) - stats.goalsAgainst * 14 + stats.points * 2;
  }
  return stats.points * 12 + stats.goalDifference * 4 + stats.goalsFor * 2;
}
