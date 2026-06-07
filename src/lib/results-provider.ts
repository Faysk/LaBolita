import { z } from "zod";

const EXPECTED_MATCHES = 104;

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

const espnCompetitorSchema = z.object({
  homeAway: z.enum(["home", "away"]),
  score: z.coerce.string(),
  team: z.object({
    abbreviation: z.string(),
  }),
});

const espnEventSchema = z.object({
  date: z.string().datetime(),
  status: z.object({
    type: z.object({
      completed: z.boolean(),
      state: z.enum(["pre", "in", "post"]),
    }),
  }),
  competitions: z
    .array(
      z.object({
        competitors: z.array(espnCompetitorSchema).length(2),
      }),
    )
    .length(1),
});

const espnFeedSchema = z.object({
  events: z.array(espnEventSchema),
});

export type ProviderObservation = {
  providerMatchId: string;
  status: "scheduled" | "live" | "finished";
  homeScore: number | null;
  awayScore: number | null;
};

export type ProviderScheduleMatch = {
  providerMatchId: string;
  scheduledAt: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
};

export function normalizeWorldCupFeed(input: unknown): ProviderObservation[] {
  const feed = providerFeedSchema.parse(input);

  const observations = feed.games.map((game) => {
    const finished = String(game.finished).toUpperCase() === "TRUE";
    const notStarted = String(game.time_elapsed).toLowerCase() === "notstarted";
    const status: ProviderObservation["status"] = finished
      ? "finished"
      : notStarted
        ? "scheduled"
        : "live";
    const homeScore = status === "scheduled" ? null : parseScore(game.home_score);
    const awayScore = status === "scheduled" ? null : parseScore(game.away_score);

    return {
      providerMatchId: `worldcup26:${game.id}`,
      status,
      homeScore,
      awayScore,
    };
  });

  assertCompleteObservationSet(observations);
  return observations;
}

export function normalizeEspnFeed(
  input: unknown,
  schedule: ProviderScheduleMatch[],
): ProviderObservation[] {
  const feed = espnFeedSchema.parse(input);

  const observations = feed.events.flatMap((event) => {
    const competition = event.competitions[0];
    const home = competition.competitors.find((item) => item.homeAway === "home");
    const away = competition.competitors.find((item) => item.homeAway === "away");
    if (!home || !away) return [];

    const candidates = schedule.filter(
      (match) =>
        Math.abs(
          new Date(match.scheduledAt).getTime() - new Date(event.date).getTime(),
        ) <=
        45 * 60 * 1000,
    );
    const codeMatches = candidates.filter(
      (match) =>
        match.homeTeamCode === home.team.abbreviation &&
        match.awayTeamCode === away.team.abbreviation,
    );
    const match =
      codeMatches.length === 1
        ? codeMatches[0]
        : candidates.length === 1
          ? candidates[0]
          : null;
    if (!match) return [];

    const status = event.status.type.completed
      ? "finished"
      : event.status.type.state === "in"
        ? "live"
        : "scheduled";

    return [
      {
        providerMatchId: match.providerMatchId,
        status,
        homeScore: status === "scheduled" ? null : parseScore(home.score),
        awayScore: status === "scheduled" ? null : parseScore(away.score),
      } satisfies ProviderObservation,
    ];
  });

  assertCompleteObservationSet(observations);
  return observations;
}

export function assertCompleteObservationSet(
  observations: ProviderObservation[],
  expectedMatches = EXPECTED_MATCHES,
) {
  if (observations.length !== expectedMatches) {
    throw new Error(
      `Provider returned ${observations.length} observations; expected ${expectedMatches}.`,
    );
  }

  const uniqueIds = new Set(observations.map((item) => item.providerMatchId));
  if (uniqueIds.size !== observations.length) {
    throw new Error("Provider returned duplicate match identifiers.");
  }
}

export function assertDatabaseMappingComplete(
  observations: ProviderObservation[],
  databaseProviderIds: string[],
  expectedMatches = EXPECTED_MATCHES,
) {
  if (databaseProviderIds.length !== expectedMatches) {
    throw new Error(
      `Database has ${databaseProviderIds.length} mapped matches; expected ${expectedMatches}.`,
    );
  }

  const uniqueDatabaseIds = new Set(databaseProviderIds);
  if (uniqueDatabaseIds.size !== databaseProviderIds.length) {
    throw new Error("Database contains duplicate provider match identifiers.");
  }

  const matched = observations.filter((item) =>
    uniqueDatabaseIds.has(item.providerMatchId),
  );
  if (matched.length !== expectedMatches) {
    throw new Error(
      `Provider matched ${matched.length} database matches; expected ${expectedMatches}.`,
    );
  }
}

function parseScore(value: string) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 0 || score > 30) {
    throw new Error(`Invalid provider score: ${value}`);
  }
  return score;
}
