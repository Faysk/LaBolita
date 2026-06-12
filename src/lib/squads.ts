import squadData from "@/data/world-cup-2026-squads.json";

export type SquadPosition = "GK" | "DF" | "MF" | "FW";

export type SquadPlayer = {
  number: number;
  position: SquadPosition;
  name: string;
  fullName: string;
  dob: string;
  club: string;
  heightCm: number;
  caps: number;
  goals: number;
};

export type SquadTeam = {
  code: string;
  name: string;
  coach?: string | null;
  players: SquadPlayer[];
};

type SquadDataset = {
  source: string;
  sourceLabel: string;
  version: string;
  teams: SquadTeam[];
};

export const squadsDataset = squadData as SquadDataset;

export function allSquads() {
  return squadsDataset.teams;
}

export function allPlayers() {
  return squadsDataset.teams.flatMap((team) =>
    team.players.map((player) => ({ ...player, team })),
  );
}

export function getSquadByCode(code?: string | null) {
  if (!code) return null;
  const normalized = normalizeTeamCode(code);
  return squadsDataset.teams.find((team) => team.code === normalized) ?? null;
}

export function squadSummary(squad: SquadTeam) {
  const players = squad.players;
  const topScorer = [...players].sort(
    (left, right) => right.goals - left.goals || right.caps - left.caps,
  )[0];
  const mostCapped = [...players].sort(
    (left, right) => right.caps - left.caps || right.goals - left.goals,
  )[0];
  const averageHeight = Math.round(
    players.reduce((total, player) => total + player.heightCm, 0) / players.length,
  );
  const averageAge = Math.round(
    players.reduce((total, player) => total + playerAge(player), 0) / players.length,
  );

  return {
    totalPlayers: players.length,
    topScorer,
    mostCapped,
    averageHeight,
    averageAge,
  };
}

export function playerAge(player: SquadPlayer) {
  const [day, month, year] = player.dob.split("/").map(Number);
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

export function positionLabel(position: SquadPosition) {
  return {
    GK: "Goleiro",
    DF: "Defensor",
    MF: "Meio-campista",
    FW: "Atacante",
  }[position];
}

export function positionShortLabel(position: SquadPosition) {
  return {
    GK: "GOL",
    DF: "DEF",
    MF: "MEI",
    FW: "ATA",
  }[position];
}

export function sourceVersionLabel() {
  return `${squadsDataset.sourceLabel} · ${squadsDataset.version}`;
}

function normalizeTeamCode(code: string) {
  return code.trim().toUpperCase();
}
