import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const teamSchema = z.object({
  code: z.string().min(2).max(5).transform((value) => value.toUpperCase()),
  name: z.string().min(2),
  shortName: z.string().min(2),
  flag: z.string().optional(),
  group: z.string().nullable().optional(),
});

const matchSchema = z.object({
  number: z.number().int().positive(),
  stage: z.enum([
    "group",
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ]),
  group: z.string().nullable().optional(),
  homeCode: z.string().transform((value) => value.toUpperCase()).nullable().optional(),
  awayCode: z.string().transform((value) => value.toUpperCase()).nullable().optional(),
  homeLabel: z.string().min(2).nullable().optional(),
  awayLabel: z.string().min(2).nullable().optional(),
  scheduledAt: z.iso.datetime({ offset: true }),
  lockAt: z.iso.datetime({ offset: true }).optional(),
  venue: z.string().nullable().optional(),
  providerMatchId: z.string().nullable().optional(),
});

const scheduleSchema = z.object({
  source: z.string().url().optional(),
  tournamentSlug: z.string().min(2),
  teams: z.array(teamSchema),
  matches: z.array(matchSchema).min(1),
});

const args = process.argv.slice(2);
const validateOnly = args.includes("--validate-only");
const requireComplete = args.includes("--require-complete");
const filePath = args.find((argument) => !argument.startsWith("--"));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!filePath) {
  throw new Error(
    "Uso: node scripts/import-schedule.mjs [--validate-only] [--require-complete] data/schedule.json",
  );
}

const schedule = scheduleSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
validateSchedule(schedule, requireComplete);

if (validateOnly) {
  console.log(
    `Agenda validada: ${schedule.teams.length} seleções e ${schedule.matches.length} partidas.`,
  );
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: tournament, error: tournamentError } = await supabase
  .from("tournaments")
  .select("id")
  .eq("slug", schedule.tournamentSlug)
  .single();

if (tournamentError) throw tournamentError;

const { error: teamsError } = await supabase.from("teams").upsert(
  schedule.teams.map((team) => ({
    tournament_id: tournament.id,
    code: team.code,
    name: team.name,
    short_name: team.shortName,
    flag_emoji: team.flag ?? null,
    group_name: team.group ?? null,
  })),
  { onConflict: "tournament_id,code" },
);

if (teamsError) throw teamsError;

const { data: teams, error: teamsReadError } = await supabase
  .from("teams")
  .select("id, code")
  .eq("tournament_id", tournament.id);

if (teamsReadError) throw teamsReadError;
const teamsByCode = new Map(teams.map((team) => [team.code, team.id]));

function teamId(code) {
  if (!code) return null;
  const id = teamsByCode.get(code.toUpperCase());
  if (!id) throw new Error(`Seleção não encontrada no arquivo: ${code}`);
  return id;
}

const matchRows = schedule.matches.map((match) => ({
  tournament_id: tournament.id,
  match_number: match.number,
  stage: match.stage,
  group_name: match.group ?? null,
  home_team_id: teamId(match.homeCode),
  away_team_id: teamId(match.awayCode),
  home_placeholder: match.homeLabel ?? null,
  away_placeholder: match.awayLabel ?? null,
  scheduled_at: match.scheduledAt,
  prediction_lock_at: match.lockAt ?? match.scheduledAt,
  venue: match.venue ?? null,
  provider_match_id: match.providerMatchId ?? null,
}));

const { data: existingMatches, error: existingMatchesError } = await supabase
  .from("matches")
  .select(
    "match_number, stage, group_name, home_team_id, away_team_id, home_placeholder, away_placeholder, scheduled_at, prediction_lock_at, status, venue, provider_match_id",
  )
  .eq("tournament_id", tournament.id);

if (existingMatchesError) throw existingMatchesError;
assertLockedMatchesAreUnchanged(existingMatches ?? [], matchRows);

const { error: matchesError } = await supabase.from("matches").upsert(
  matchRows,
  { onConflict: "tournament_id,match_number" },
);

if (matchesError) throw matchesError;

console.log(
  `Agenda importada: ${schedule.teams.length} seleções e ${schedule.matches.length} partidas.`,
);

function validateSchedule(value, enforceComplete) {
  assertUnique(value.teams.map((team) => team.code), "código de seleção");
  assertUnique(value.matches.map((match) => match.number), "número de partida");
  assertUnique(
    value.matches.flatMap((match) => (match.providerMatchId ? [match.providerMatchId] : [])),
    "identificador do provedor",
  );
  const teamCodes = new Set(value.teams.map((team) => team.code));
  const teamGroups = new Map(value.teams.map((team) => [team.code, team.group ?? null]));
  const groupMatchups = [];

  for (const match of value.matches) {
    if (match.homeCode && !teamCodes.has(match.homeCode.toUpperCase())) {
      throw new Error(`Mandante desconhecido na partida ${match.number}: ${match.homeCode}`);
    }
    if (match.awayCode && !teamCodes.has(match.awayCode.toUpperCase())) {
      throw new Error(`Visitante desconhecido na partida ${match.number}: ${match.awayCode}`);
    }
    if (match.homeCode && match.homeCode === match.awayCode) {
      throw new Error(`A partida ${match.number} repete a mesma seleção.`);
    }
    if (match.lockAt && new Date(match.lockAt) > new Date(match.scheduledAt)) {
      throw new Error(`O bloqueio da partida ${match.number} ocorre após o início.`);
    }
    if (match.stage === "group" && (!match.group || !match.homeCode || !match.awayCode)) {
      throw new Error(`A partida de grupo ${match.number} precisa de grupo e seleções.`);
    }
    if (
      match.stage === "group" &&
      (teamGroups.get(match.homeCode) !== match.group ||
        teamGroups.get(match.awayCode) !== match.group)
    ) {
      throw new Error(`A partida ${match.number} contém seleção fora do Grupo ${match.group}.`);
    }
    if (match.stage === "group") {
      groupMatchups.push([match.homeCode, match.awayCode].sort().join(":"));
    }
    if (
      match.stage !== "group" &&
      ((!match.homeCode && !match.homeLabel) || (!match.awayCode && !match.awayLabel))
    ) {
      throw new Error(`A partida mata-mata ${match.number} precisa de seleções ou rótulos.`);
    }
  }

  if (enforceComplete) {
    if (value.teams.length !== 48 || value.matches.length !== 104) {
      throw new Error(
        `Agenda incompleta: esperado 48 seleções e 104 partidas; recebido ${value.teams.length} e ${value.matches.length}.`,
      );
    }

    const matchNumbers = new Set(value.matches.map((match) => match.number));
    for (let number = 1; number <= 104; number += 1) {
      if (!matchNumbers.has(number)) {
        throw new Error(`Agenda completa não contém a partida ${number}.`);
      }
    }

    const expectedStages = {
      group: 72,
      round_of_32: 16,
      round_of_16: 8,
      quarter_final: 4,
      semi_final: 2,
      third_place: 1,
      final: 1,
    };
    for (const [stage, expected] of Object.entries(expectedStages)) {
      const actual = value.matches.filter((match) => match.stage === stage).length;
      if (actual !== expected) {
        throw new Error(`Fase ${stage}: esperado ${expected} partidas; recebido ${actual}.`);
      }
    }

    const expectedGroups = "ABCDEFGHIJKL".split("");
    assertUnique(groupMatchups, "confronto da fase de grupos");
    for (const group of expectedGroups) {
      const teams = value.teams.filter((team) => team.group === group).length;
      const matches = value.matches.filter(
        (match) => match.stage === "group" && match.group === group,
      ).length;
      if (teams !== 4 || matches !== 6) {
        throw new Error(
          `Grupo ${group}: esperado 4 seleções e 6 partidas; recebido ${teams} e ${matches}.`,
        );
      }
    }

    for (const team of value.teams) {
      const appearances = value.matches.filter(
        (match) =>
          match.stage === "group" &&
          (match.homeCode === team.code || match.awayCode === team.code),
      ).length;
      if (appearances !== 3) {
        throw new Error(
          `Seleção ${team.code}: esperado 3 jogos de grupo; recebido ${appearances}.`,
        );
      }
    }
  }
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) {
    throw new Error(`Agenda contém ${label} duplicado.`);
  }
}

function assertLockedMatchesAreUnchanged(existingMatches, incomingMatches) {
  const incomingByNumber = new Map(
    incomingMatches.map((match) => [match.match_number, match]),
  );

  for (const existing of existingMatches) {
    const incoming = incomingByNumber.get(existing.match_number);
    if (!incoming) continue;
    const locked =
      existing.status === "finished" ||
      Date.now() >= new Date(existing.prediction_lock_at).getTime();
    if (!locked) continue;

    const changed =
      existing.stage !== incoming.stage ||
      existing.group_name !== incoming.group_name ||
      existing.home_team_id !== incoming.home_team_id ||
      existing.away_team_id !== incoming.away_team_id ||
      existing.home_placeholder !== incoming.home_placeholder ||
      existing.away_placeholder !== incoming.away_placeholder ||
      new Date(existing.scheduled_at).getTime() !==
        new Date(incoming.scheduled_at).getTime() ||
      new Date(existing.prediction_lock_at).getTime() !==
        new Date(incoming.prediction_lock_at).getTime() ||
      existing.venue !== incoming.venue ||
      existing.provider_match_id !== incoming.provider_match_id;

    if (changed) {
      throw new Error(
        `A partida ${existing.match_number} já foi bloqueada e não pode ser alterada pelo importador. Use o fluxo administrativo auditável.`,
      );
    }
  }
}
