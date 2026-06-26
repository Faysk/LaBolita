import { z } from "zod";

const fifaTeamSchema = z
  .object({
    Abbreviation: z.string().nullish(),
    IdCountry: z.string().nullish(),
  })
  .passthrough();

const fifaBracketMatchSchema = z
  .object({
    MatchNumber: z.coerce.number().int().positive(),
    HomeTeam: fifaTeamSchema.nullish(),
    AwayTeam: fifaTeamSchema.nullish(),
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

function normalizeFifaTeamCode(team: z.infer<typeof fifaTeamSchema> | null | undefined) {
  const rawCode = team?.Abbreviation ?? team?.IdCountry ?? null;
  if (!rawCode) return null;

  const code = rawCode.trim().toUpperCase();
  return code.length > 0 ? code : null;
}
