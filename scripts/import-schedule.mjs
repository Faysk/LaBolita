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

const { error: matchesError } = await supabase.from("matches").upsert(
  schedule.matches.map((match) => ({
    tournament_id: tournament.id,
    match_number: match.number,
    stage: match.stage,
    group_name: match.group ?? null,
    home_team_id: teamId(match.homeCode),
    away_team_id: teamId(match.awayCode),
    scheduled_at: match.scheduledAt,
    prediction_lock_at: match.lockAt ?? match.scheduledAt,
    venue: match.venue ?? null,
    provider_match_id: match.providerMatchId ?? null,
  })),
  { onConflict: "tournament_id,match_number" },
);

if (matchesError) throw matchesError;

console.log(
  `Agenda importada: ${schedule.teams.length} seleções e ${schedule.matches.length} partidas.`,
);

function validateSchedule(value, enforceComplete) {
  assertUnique(value.teams.map((team) => team.code), "código de seleção");
  assertUnique(value.matches.map((match) => match.number), "número de partida");
  const teamCodes = new Set(value.teams.map((team) => team.code));

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
  }
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) {
    throw new Error(`Agenda contém ${label} duplicado.`);
  }
}
