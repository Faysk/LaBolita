import { writeFile } from "node:fs/promises";

const OUTPUT_PATH = process.argv[2] ?? "data/world-cup-2026.json";
const FEED_BASE = "https://worldcup26.ir/get";
const FIFA_CALENDAR_URL =
  "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023&idCompetition=17";
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

const STAGE_BY_FIFA_NAME = {
  "First Stage": "group",
  "Round of 32": "round_of_32",
  "Round of 16": "round_of_16",
  "Quarter-final": "quarter_final",
  "Semi-final": "semi_final",
  "Play-off for third place": "third_place",
  Final: "final",
};

const [calendarPayload, teamsPayload] = await Promise.all([
  getJson(FIFA_CALENDAR_URL),
  getJson(`${FEED_BASE}/teams`),
]);

assertCount(calendarPayload.Results, 104, "partidas oficiais FIFA");
assertCount(teamsPayload.teams, 48, "seleções");

const iso2ByCode = new Map(teamsPayload.teams.map((team) => [team.fifa_code, team.iso2]));
const groupByCode = groupAssignments(calendarPayload.Results);

const schedule = {
  source: FIFA_SOURCE,
  generatedFrom: FIFA_CALENDAR_URL,
  verifiedAt: new Date().toISOString().slice(0, 10),
  tournamentSlug: "copa-do-mundo-2026",
  teams: [...groupByCode.entries()]
    .map(([code, group]) => {
      const name = TEAM_NAMES[code];
      if (!name) throw new Error(`Nome em português ausente para ${code}.`);
      return {
        code,
        name,
        shortName: shortName(code, name),
        flag: flagFor(iso2ByCode.get(code), code),
        group,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code)),
  matches: calendarPayload.Results
    .map((match) => {
      const stage = stageFromFifa(match);
      const number = Number(match.MatchNumber);
      const isGroup = stage === "group";

      return {
        number,
        stage,
        group: isGroup ? groupFromFifa(match) : null,
        homeCode: teamCode(match.Home),
        awayCode: teamCode(match.Away),
        homeLabel: isGroup ? null : translateLabel(match.PlaceHolderA),
        awayLabel: isGroup ? null : translateLabel(match.PlaceHolderB),
        scheduledAt: new Date(match.Date).toISOString(),
        venue: localizedDescription(match.Stadium?.Name),
        providerMatchId: `worldcup26:${number}`,
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
  const winnerGroup = /^1([A-L])$/.exec(value);
  if (winnerGroup) return `1º do Grupo ${winnerGroup[1]}`;

  const runnerUpGroup = /^2([A-L])$/.exec(value);
  if (runnerUpGroup) return `2º do Grupo ${runnerUpGroup[1]}`;

  const thirdGroup = /^3([A-L]+)$/.exec(value);
  if (thirdGroup) return `3º de ${thirdGroup[1].split("").join("/")}`;

  const winnerMatch = /^W(\d+)$/.exec(value);
  if (winnerMatch) return `Vencedor da partida ${winnerMatch[1]}`;

  const loserMatch = /^(?:L|RU)(\d+)$/.exec(value);
  if (loserMatch) return `Perdedor da partida ${loserMatch[1]}`;

  return value
    .replace(/^Winner Group ([A-L])$/, "1º do Grupo $1")
    .replace(/^Runner-up Group ([A-L])$/, "2º do Grupo $1")
    .replace(/^3rd Group (.+)$/, "3º de $1")
    .replace(/^Winner Match (\d+)$/, "Vencedor da partida $1")
    .replace(/^Loser Match (\d+)$/, "Perdedor da partida $1");
}

function groupAssignments(matches) {
  const assignments = new Map();
  for (const match of matches) {
    if (stageFromFifa(match) !== "group") continue;
    const group = groupFromFifa(match);
    if (!group) throw new Error(`Grupo ausente na partida ${match.MatchNumber}.`);
    for (const team of [match.Home, match.Away]) {
      const code = teamCode(team);
      if (!code) throw new Error(`Seleção ausente na partida ${match.MatchNumber}.`);
      const previous = assignments.get(code);
      if (previous && previous !== group) {
        throw new Error(`Seleção ${code} aparece nos grupos ${previous} e ${group}.`);
      }
      assignments.set(code, group);
    }
  }
  assertCount([...assignments], 48, "seleções oficiais FIFA com grupo");
  return assignments;
}

function stageFromFifa(match) {
  const stageName = localizedDescription(match.StageName);
  const stage = STAGE_BY_FIFA_NAME[stageName];
  if (!stage) throw new Error(`Fase FIFA desconhecida na partida ${match.MatchNumber}: ${stageName}`);
  return stage;
}

function groupFromFifa(match) {
  const groupName = localizedDescription(match.GroupName);
  return /^Group ([A-L])$/.exec(groupName ?? "")?.[1] ?? null;
}

function teamCode(team) {
  return (team?.Abbreviation ?? team?.IdCountry ?? null)?.toUpperCase() ?? null;
}

function localizedDescription(values) {
  return (
    values?.find((item) => item.Locale === "en-GB")?.Description ??
    values?.[0]?.Description ??
    null
  );
}
