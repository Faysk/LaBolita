import { z } from "zod";

const fifaTeamSchema = z
  .object({
    Abbreviation: z.string().nullish(),
    IdTeam: z.coerce.string().nullish(),
    IdCountry: z.string().nullish(),
  })
  .passthrough();

const fifaBracketMatchSchema = z
  .object({
    MatchNumber: z.coerce.number().int().positive(),
    HomeTeam: fifaTeamSchema.nullish(),
    AwayTeam: fifaTeamSchema.nullish(),
    HomeTeamScore: z.coerce.number().int().min(0).max(30).nullish(),
    AwayTeamScore: z.coerce.number().int().min(0).max(30).nullish(),
    Winner: z.union([fifaTeamSchema, z.coerce.string()]).nullish(),
  })
  .passthrough();

const fifaKnockoutStageSchema = z
  .object({
    Matches: z.array(fifaBracketMatchSchema).default([]),
  })
  .passthrough();

const fifaBracketSchema = z
  .object({
    KnockoutStages: z.array(fifaKnockoutStageSchema).default([]),
  })
  .passthrough();

export type FifaBracketParticipant = {
  matchNumber: number;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
};

export type FifaBracketResult = {
  matchNumber: number;
  homeScore: number;
  awayScore: number;
  advancingTeamCode: string;
};

export function normalizeFifaBracketParticipants(
  input: unknown,
): FifaBracketParticipant[] {
  const bracket = fifaBracketSchema.parse(input);
  const participants = bracket.KnockoutStages.flatMap((stage) =>
    stage.Matches.map((match) => ({
      matchNumber: match.MatchNumber,
      homeTeamCode: normalizeFifaTeamCode(match.HomeTeam),
      awayTeamCode: normalizeFifaTeamCode(match.AwayTeam),
    })),
  ).sort((left, right) => left.matchNumber - right.matchNumber);

  const uniqueMatchNumbers = new Set(participants.map((item) => item.matchNumber));
  if (uniqueMatchNumbers.size !== participants.length) {
    throw new Error("FIFA bracket returned duplicate match numbers.");
  }

  return participants;
}

export function normalizeFifaBracketResults(input: unknown): FifaBracketResult[] {
  const bracket = fifaBracketSchema.parse(input);
  const results = bracket.KnockoutStages.flatMap((stage) =>
    stage.Matches.flatMap((match) => {
      const homeScore = match.HomeTeamScore;
      const awayScore = match.AwayTeamScore;
      if (homeScore === null || homeScore === undefined) return [];
      if (awayScore === null || awayScore === undefined) return [];

      const advancingTeamCode = normalizeFifaWinnerCode(match, homeScore, awayScore);
      if (!advancingTeamCode) return [];

      return [
        {
          matchNumber: match.MatchNumber,
          homeScore,
          awayScore,
          advancingTeamCode,
        },
      ];
    }),
  ).sort((left, right) => left.matchNumber - right.matchNumber);

  const uniqueMatchNumbers = new Set(results.map((item) => item.matchNumber));
  if (uniqueMatchNumbers.size !== results.length) {
    throw new Error("FIFA bracket returned duplicate match results.");
  }

  return results;
}

function normalizeFifaTeamCode(team: z.infer<typeof fifaTeamSchema> | null | undefined) {
  const rawCode = team?.Abbreviation ?? team?.IdCountry ?? null;
  if (!rawCode) return null;

  const code = rawCode.trim().toUpperCase();
  return code.length > 0 ? code : null;
}

function normalizeFifaWinnerCode(
  match: z.infer<typeof fifaBracketMatchSchema>,
  homeScore: number,
  awayScore: number,
) {
  const homeCode = normalizeFifaTeamCode(match.HomeTeam);
  const awayCode = normalizeFifaTeamCode(match.AwayTeam);
  if (!homeCode || !awayCode) return null;

  if (homeScore !== awayScore) {
    return homeScore > awayScore ? homeCode : awayCode;
  }

  const winnerTokens = fifaWinnerTokens(match.Winner);
  if (winnerTokens.length === 0) return null;

  const homeTokens = fifaTeamTokens(match.HomeTeam);
  const awayTokens = fifaTeamTokens(match.AwayTeam);
  if (winnerTokens.some((token) => homeTokens.includes(token))) return homeCode;
  if (winnerTokens.some((token) => awayTokens.includes(token))) return awayCode;

  return null;
}

function fifaWinnerTokens(winner: z.infer<typeof fifaBracketMatchSchema>["Winner"]) {
  if (!winner) return [];
  if (typeof winner === "string") return [winner.trim().toUpperCase()].filter(Boolean);
  return fifaTeamTokens(winner);
}

function fifaTeamTokens(team: z.infer<typeof fifaTeamSchema> | null | undefined) {
  return [team?.Abbreviation, team?.IdCountry, team?.IdTeam]
    .map((value) => value?.trim().toUpperCase() ?? "")
    .filter(Boolean);
}
