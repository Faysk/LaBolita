import { z } from "zod";

const providerGameSchema = z.object({
  id: z.coerce.string(),
  home_score: z.coerce.string(),
  away_score: z.coerce.string(),
  finished: z.union([z.string(), z.boolean()]),
  time_elapsed: z.union([z.string(), z.number()]),
});

const providerFeedSchema = z.object({
  games: z.array(providerGameSchema),
});

export type ProviderObservation = {
  providerMatchId: string;
  status: "scheduled" | "live" | "finished";
  homeScore: number | null;
  awayScore: number | null;
};

export function normalizeWorldCupFeed(input: unknown): ProviderObservation[] {
  const feed = providerFeedSchema.parse(input);

  return feed.games.map((game) => {
    const finished = String(game.finished).toUpperCase() === "TRUE";
    const notStarted = String(game.time_elapsed).toLowerCase() === "notstarted";
    const status = finished ? "finished" : notStarted ? "scheduled" : "live";
    const homeScore = status === "scheduled" ? null : parseScore(game.home_score);
    const awayScore = status === "scheduled" ? null : parseScore(game.away_score);

    return {
      providerMatchId: `worldcup26:${game.id}`,
      status,
      homeScore,
      awayScore,
    };
  });
}

function parseScore(value: string) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 0 || score > 30) {
    throw new Error(`Invalid provider score: ${value}`);
  }
  return score;
}
