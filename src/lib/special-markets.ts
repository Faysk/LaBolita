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
  position?: SquadPosition;
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
      position: player.position,
    });
  }

  return playerOptions.sort(
    (left, right) =>
      left.label.localeCompare(right.label, "pt-BR") ||
      left.teamName.localeCompare(right.teamName, "pt-BR"),
  );
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
