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
  scheduled_at: string;
  prediction_lock_at: string;
  status: "scheduled" | "postponed" | "live" | "finished" | "cancelled";
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  advancing_team_id: string | null;
  home_team: DatabaseTeam | null;
  away_team: DatabaseTeam | null;
};

type DatabasePrediction = {
  match_id: string;
  home_score: number;
  away_score: number;
  advancing_team_id: string | null;
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
        scheduled_at,
        prediction_lock_at,
        status,
        venue,
        home_score,
        away_score,
        advancing_team_id,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, flag_emoji),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, flag_emoji)
      `,
    )
    .order("scheduled_at")
    .limit(104);

  if (error || !matches?.length) return [];

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
      homeTeam: mapTeam(match.home_team, "Mandante"),
      awayTeam: mapTeam(match.away_team, "Visitante"),
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
    };
  });
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
        name: "A definir",
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
