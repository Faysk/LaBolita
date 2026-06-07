import { demoMatches } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DemoMatch, DemoTeam, MatchStage } from "@/lib/types";

type DatabaseTeam = {
  id: string;
  name: string;
  short_name: string;
  flag_emoji: string | null;
};

type DatabaseMatch = {
  id: string;
  stage: MatchStage;
  group_name: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  scheduled_at: string;
  prediction_lock_at: string;
  status: "scheduled" | "postponed" | "live" | "finished" | "cancelled";
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  advancing_team_id: string | null;
  live_home_score: number | null;
  live_away_score: number | null;
  provider_status: string | null;
  provider_updated_at: string | null;
  home_team: DatabaseTeam | null;
  away_team: DatabaseTeam | null;
};

type DatabasePrediction = {
  match_id: string;
  home_score: number;
  away_score: number;
  advancing_team_id: string | null;
};

export type ResultsSyncState = {
  status: "never" | "ok" | "error";
  source: string | null;
  fallbackUsed: boolean;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  errorMessage: string | null;
};

const STAGE_LABELS: Record<MatchStage, string> = {
  group: "Fase de grupos",
  round_of_32: "Fase de 32",
  round_of_16: "Oitavas de final",
  quarter_final: "Quartas de final",
  semi_final: "Semifinal",
  third_place: "Terceiro lugar",
  final: "Final",
};

export async function getMatches(): Promise<DemoMatch[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoMatches;

  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      `
        id,
        stage,
        group_name,
        home_placeholder,
        away_placeholder,
        scheduled_at,
        prediction_lock_at,
        status,
        venue,
        home_score,
        away_score,
        advancing_team_id,
        live_home_score,
        live_away_score,
        provider_status,
        provider_updated_at,
        home_team:teams!matches_home_team_id_tournament_id_fkey(id, name, short_name, flag_emoji),
        away_team:teams!matches_away_team_id_tournament_id_fkey(id, name, short_name, flag_emoji)
      `,
    )
    .order("scheduled_at")
    .limit(104);

  if (error) {
    console.error("Could not load matches", error);
    return [];
  }
  if (!matches?.length) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let predictions: DatabasePrediction[] = [];

  if (user) {
    const { data } = await supabase
      .from("predictions")
      .select("match_id, home_score, away_score, advancing_team_id")
      .eq("user_id", user.id);
    predictions = (data ?? []) as DatabasePrediction[];
  }

  const predictionsByMatch = new Map(
    predictions.map((prediction) => [prediction.match_id, prediction]),
  );

  return (matches as unknown as DatabaseMatch[]).map((match) => {
    const prediction = predictionsByMatch.get(match.id);
    return {
      id: match.id,
      stage: match.stage,
      stageLabel:
        match.stage === "group" && match.group_name
          ? `Grupo ${match.group_name}`
          : STAGE_LABELS[match.stage],
      dateLabel: formatDate(match.scheduled_at),
      timeLabel: formatTime(match.scheduled_at),
      venue: match.venue ?? "Local a definir",
      locked:
        !["scheduled", "postponed"].includes(match.status) ||
        Date.now() >= new Date(match.prediction_lock_at).getTime(),
      homeTeam: mapTeam(match.home_team, match.home_placeholder ?? "Mandante"),
      awayTeam: mapTeam(match.away_team, match.away_placeholder ?? "Visitante"),
      prediction: prediction
        ? {
            homeScore: prediction.home_score,
            awayScore: prediction.away_score,
            advancingTeamId: prediction.advancing_team_id,
          }
        : undefined,
      result:
        match.home_score !== null && match.away_score !== null
          ? {
              homeScore: match.home_score,
              awayScore: match.away_score,
              advancingTeamId: match.advancing_team_id,
            }
          : undefined,
      liveResult:
        match.live_home_score !== null && match.live_away_score !== null
          ? {
              homeScore: match.live_home_score,
              awayScore: match.live_away_score,
            }
          : undefined,
      providerStatus: match.provider_status,
      providerUpdatedAt: match.provider_updated_at,
    };
  });
}

export async function getTeams(): Promise<DemoTeam[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return Array.from(
      new Map(
        demoMatches
          .flatMap((match) => [match.homeTeam, match.awayTeam])
          .map((team) => [team.id, team]),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, short_name, flag_emoji")
    .order("name");
  if (error) return [];

  return ((data ?? []) as DatabaseTeam[]).map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.short_name,
    flag: team.flag_emoji ?? "•",
  }));
}

export async function getResultsSyncState(): Promise<ResultsSyncState | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("results_sync_state")
    .select("status, source, fallback_used, last_attempt_at, last_success_at, error_message")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return null;

  return {
    status: data.status as ResultsSyncState["status"],
    source: data.source,
    fallbackUsed: data.fallback_used,
    lastAttemptAt: data.last_attempt_at,
    lastSuccessAt: data.last_success_at,
    errorMessage: data.error_message,
  };
}

function mapTeam(team: DatabaseTeam | null, fallback: string): DemoTeam {
  return team
    ? {
        id: team.id,
        name: team.name,
        shortName: team.short_name,
        flag: team.flag_emoji ?? "•",
      }
    : {
        id: `unknown-${fallback.toLowerCase()}`,
        name: fallback,
        shortName: fallback,
        flag: "•",
      };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(date))
    .replace(".", "");
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}
