import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const FIFA_CALENDAR_URL =
  "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023&idCompetition=17";

const schedule = JSON.parse(await readFile("data/world-cup-2026.json", "utf8"));
const response = await fetch(FIFA_CALENDAR_URL, {
  signal: AbortSignal.timeout(15_000),
});
assert.equal(response.status, 200, "FIFA schedule source must be available");

const official = await response.json();
assert.equal(official.Results?.length, 104, "FIFA schedule must expose 104 matches");

const differences = [];
const scheduleByNumber = new Map(schedule.matches.map((match) => [match.number, match]));
for (const officialMatch of official.Results) {
  const number = Number(officialMatch.MatchNumber);
  const match = scheduleByNumber.get(number);
  if (!match) {
    differences.push(`FIFA contém partida ${number}; arquivo não contém`);
    continue;
  }

  compare(differences, number, "fase", match.stage, stageFromFifa(officialMatch));
  compare(differences, number, "grupo", match.group ?? null, groupFromFifa(officialMatch));
  compare(
    differences,
    number,
    "horário",
    normalizeIso(match.scheduledAt),
    normalizeIso(officialMatch.Date),
  );
  compare(
    differences,
    number,
    "estádio",
    match.venue,
    localizedDescription(officialMatch.Stadium?.Name),
  );
  compare(differences, number, "mandante", match.homeCode ?? null, teamCode(officialMatch.Home));
  compare(differences, number, "visitante", match.awayCode ?? null, teamCode(officialMatch.Away));

  if (match.stage !== "group") {
    compare(
      differences,
      number,
      "rótulo mandante",
      match.homeLabel ?? null,
      translateLabel(officialMatch.PlaceHolderA),
    );
    compare(
      differences,
      number,
      "rótulo visitante",
      match.awayLabel ?? null,
      translateLabel(officialMatch.PlaceHolderB),
    );
  }
}

assert.equal(schedule.matches.length, 104);
assert.deepEqual(differences, [], `Diferenças contra a FIFA:\n${differences.join("\n")}`);
console.log("Official FIFA schedule verification passed (104/104 matches)");

function normalizeIso(value) {
  return new Date(value).toISOString();
}

function compare(differences, number, label, local, official) {
  if ((local ?? null) !== (official ?? null)) {
    differences.push(
      `partida ${number} ${label}: arquivo=${local ?? "null"}; FIFA=${official ?? "null"}`,
    );
  }
}

function stageFromFifa(match) {
  const stage = localizedDescription(match.StageName);
  return (
    {
      "First Stage": "group",
      "Round of 32": "round_of_32",
      "Round of 16": "round_of_16",
      "Quarter-final": "quarter_final",
      "Semi-final": "semi_final",
      "Play-off for third place": "third_place",
      Final: "final",
    }[stage] ?? stage
  );
}

function groupFromFifa(match) {
  return /^Group ([A-L])$/.exec(localizedDescription(match.GroupName) ?? "")?.[1] ?? null;
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

  return value;
}
