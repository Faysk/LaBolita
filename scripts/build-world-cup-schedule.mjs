import { writeFile } from "node:fs/promises";

const OUTPUT_PATH = process.argv[2] ?? "data/world-cup-2026.json";
const FEED_BASE = "https://worldcup26.ir/get";
const FIFA_SOURCE =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";

const TEAM_NAMES = {
  ALG: "Argélia",
  ARG: "Argentina",
  AUS: "Austrália",
  AUT: "Áustria",
  BEL: "Bélgica",
  BIH: "Bósnia e Herzegovina",
  BRA: "Brasil",
  CAN: "Canadá",
  CIV: "Costa do Marfim",
  COD: "República Democrática do Congo",
  COL: "Colômbia",
  CPV: "Cabo Verde",
  CRO: "Croácia",
  CUW: "Curaçao",
  CZE: "Chéquia",
  ECU: "Equador",
  EGY: "Egito",
  ENG: "Inglaterra",
  ESP: "Espanha",
  FRA: "França",
  GER: "Alemanha",
  GHA: "Gana",
  HAI: "Haiti",
  IRN: "Irã",
  IRQ: "Iraque",
  JOR: "Jordânia",
  JPN: "Japão",
  KOR: "Coreia do Sul",
  KSA: "Arábia Saudita",
  MAR: "Marrocos",
  MEX: "México",
  NED: "Países Baixos",
  NOR: "Noruega",
  NZL: "Nova Zelândia",
  PAN: "Panamá",
  PAR: "Paraguai",
  POR: "Portugal",
  QAT: "Catar",
  RSA: "África do Sul",
  SCO: "Escócia",
  SEN: "Senegal",
  SUI: "Suíça",
  SWE: "Suécia",
  TUN: "Tunísia",
  TUR: "Turquia",
  URU: "Uruguai",
  USA: "Estados Unidos",
  UZB: "Uzbequistão",
};

const STAGE_BY_TYPE = {
  group: "group",
  r32: "round_of_32",
  r16: "round_of_16",
  qf: "quarter_final",
  sf: "semi_final",
  third: "third_place",
  final: "final",
};

// Confirmed against FIFA venue pages when the structured community feed differs.
const OFFICIAL_KICKOFF_OVERRIDES = {
  // Brazil x Haiti, Philadelphia Stadium: Friday 19 June, 20:30 EDT.
  29: "2026-06-20T00:30:00.000Z",
};

// UTC offsets during June/July 2026 for each official host stadium.
const STADIUM_UTC_OFFSETS = {
  1: -6,
  2: -6,
  3: -6,
  4: -5,
  5: -5,
  6: -5,
  7: -4,
  8: -4,
  9: -4,
  10: -4,
  11: -4,
  12: -4,
  13: -7,
  14: -7,
  15: -7,
  16: -7,
};

const [gamesPayload, teamsPayload, stadiumsPayload] = await Promise.all([
  getJson(`${FEED_BASE}/games`),
  getJson(`${FEED_BASE}/teams`),
  getJson(`${FEED_BASE}/stadiums`),
]);

assertCount(gamesPayload.games, 104, "partidas");
assertCount(teamsPayload.teams, 48, "seleções");
assertCount(stadiumsPayload.stadiums, 16, "estádios");

const teamById = new Map(teamsPayload.teams.map((team) => [team.id, team]));
const stadiumById = new Map(stadiumsPayload.stadiums.map((stadium) => [stadium.id, stadium]));

const schedule = {
  source: FIFA_SOURCE,
  generatedFrom: "https://worldcup26.ir/",
  verifiedAt: "2026-06-07",
  tournamentSlug: "copa-do-mundo-2026",
  teams: teamsPayload.teams
    .map((team) => {
      const name = TEAM_NAMES[team.fifa_code];
      if (!name) throw new Error(`Nome em português ausente para ${team.fifa_code}.`);
      return {
        code: team.fifa_code,
        name,
        shortName: shortName(team.fifa_code, name),
        flag: flagFor(team.iso2, team.fifa_code),
        group: team.groups,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code)),
  matches: gamesPayload.games
    .map((game) => {
      const stadium = stadiumById.get(game.stadium_id);
      if (!stadium) throw new Error(`Estádio desconhecido na partida ${game.id}.`);
      const homeTeam = teamById.get(game.home_team_id);
      const awayTeam = teamById.get(game.away_team_id);
      const stage = STAGE_BY_TYPE[game.type];
      if (!stage) throw new Error(`Fase desconhecida na partida ${game.id}: ${game.type}`);

      return {
        number: Number(game.id),
        stage,
        group: game.type === "group" ? game.group : null,
        homeCode: homeTeam?.fifa_code ?? null,
        awayCode: awayTeam?.fifa_code ?? null,
        homeLabel: translateLabel(game.home_team_label),
        awayLabel: translateLabel(game.away_team_label),
        scheduledAt:
          OFFICIAL_KICKOFF_OVERRIDES[game.id] ??
          localDateToUtc(game.local_date, STADIUM_UTC_OFFSETS[game.stadium_id]),
        venue: stadium.fifa_name,
        providerMatchId: `worldcup26:${game.id}`,
      };
    })
    .sort((a, b) => a.number - b.number),
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(schedule, null, 2)}\n`, "utf8");
console.log(`Agenda gerada em ${OUTPUT_PATH}: 48 seleções e 104 partidas.`);

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${url} respondeu ${response.status}.`);
  return response.json();
}

function assertCount(values, expected, label) {
  if (!Array.isArray(values) || values.length !== expected) {
    throw new Error(`Esperado ${expected} ${label}; recebido ${values?.length ?? 0}.`);
  }
}

function localDateToUtc(value, offsetHours) {
  if (typeof offsetHours !== "number") throw new Error(`Fuso ausente para ${value}.`);
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Data local inválida: ${value}`);
  const [, month, day, year, hour, minute] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute)).toISOString();
}

function shortName(code, name) {
  if (code === "BIH") return "Bósnia";
  if (code === "COD") return "RD Congo";
  if (code === "KOR") return "Coreia do Sul";
  if (code === "USA") return "Estados Unidos";
  return name;
}

function flagFor(iso2, fifaCode) {
  if (fifaCode === "ENG" || fifaCode === "SCO") return "🏴";
  if (!/^[A-Z]{2}$/.test(iso2)) return "•";
  return [...iso2].map((letter) => String.fromCodePoint(letter.charCodeAt(0) + 127397)).join("");
}

function translateLabel(value) {
  if (!value) return null;
  return value
    .replace(/^Winner Group ([A-L])$/, "1º do Grupo $1")
    .replace(/^Runner-up Group ([A-L])$/, "2º do Grupo $1")
    .replace(/^3rd Group (.+)$/, "3º de $1")
    .replace(/^Winner Match (\d+)$/, "Vencedor da partida $1")
    .replace(/^Loser Match (\d+)$/, "Perdedor da partida $1");
}
