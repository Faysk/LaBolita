import "server-only";
import {
  attachTeamStats,
  buildSpecialOptions,
  computeAutomaticSuggestions,
  type AutomaticSuggestion,
  type SpecialMarketAutomaticKey,
  type SpecialMarketOptionSource,
  type SpecialMarketValueType,
  type SpecialOption,
} from "@/lib/special-markets";
import { getMatches, getTeams } from "@/lib/data/matches";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DemoMatch, DemoTeam } from "@/lib/types";

type DatabaseSpecialMarket = {
  id: string;
  key: string;
  title: string;
  description: string;
  value_type: SpecialMarketValueType;
  option_source: SpecialMarketOptionSource;
  automatic_key: SpecialMarketAutomaticKey | null;
  pick_count: number;
  lock_at: string;
  status: "open" | "resolved" | "void";
  exact_points: number;
  partial_points: number;
  sort_order: number;
  scoring_note: string;
};

type DatabaseSpecialPick = {
  market_id: string;
  position: number;
  option_key: string;
  option_label: string;
  option_team_id: string | null;
};

type DatabaseSpecialGlobalRankingRow = {
  rank_position: number;
  is_current_user?: boolean | null;
  display_name: string;
  avatar_url?: string | null;
  total_points: number;
  exact_hits: number;
  partial_hits: number;
  completed_markets: number;
  submitted_markets: number;
  participant_count: number;
};

export type SpecialPickView = {
  position: number;
  key: string;
  label: string;
  teamId: string | null;
};

export type SpecialMarketView = {
  id: string;
  key: string;
  title: string;
  description: string;
  valueType: SpecialMarketValueType;
  optionSource: SpecialMarketOptionSource;
  automaticKey: SpecialMarketAutomaticKey | null;
  pickCount: number;
  lockAt: string;
  locked: boolean;
  status: "open" | "resolved" | "void";
  exactPoints: number;
  partialPoints: number;
  scoringNote: string;
  options: SpecialOption[];
  predictions: SpecialPickView[];
  results: SpecialPickView[];
  automaticSuggestions: AutomaticSuggestion[];
};

export type SpecialMarketsOverview = {
  available: boolean;
  markets: SpecialMarketView[];
  missingReason?: string;
};

export type SpecialGlobalRankingEntry = {
  position: number;
  name: string;
  initials: string;
  avatarUrl?: string;
  points: number;
  exactHits: number;
  partialHits: number;
  completedMarkets: number;
  submittedMarkets: number;
  isCurrentUser: boolean;
};

export type SpecialGlobalRankingOverview = {
  available: boolean;
  entries: SpecialGlobalRankingEntry[];
  participantCount: number;
  missingReason?: string;
};

export async function getSpecialMarketsOverview(input?: {
  matches?: DemoMatch[];
  teams?: DemoTeam[];
  includeAutomatic?: boolean;
}): Promise<SpecialMarketsOverview> {
  const supabase = await createServerSupabaseClient();
  const [matches, teams] = await Promise.all([
    input?.matches ? Promise.resolve(input.matches) : getMatches(),
    input?.teams ? Promise.resolve(input.teams) : getTeams(),
  ]);

  if (!supabase) {
    return {
      available: false,
      markets: [],
      missingReason: "Supabase não está configurado neste ambiente.",
    };
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id")
    .eq("is_active", true)
    .single();
  if (tournamentError || !tournament) {
    return {
      available: false,
      markets: [],
      missingReason: "Não foi possível identificar o torneio ativo.",
    };
  }

  const { data: marketsData, error: marketsError } = await supabase
    .from("special_markets")
    .select(
      "id, key, title, description, value_type, option_source, automatic_key, pick_count, lock_at, status, exact_points, partial_points, sort_order, scoring_note",
    )
    .eq("tournament_id", tournament.id)
    .order("sort_order");

  if (marketsError) {
    console.warn("Could not load special markets", marketsError);
    return {
      available: false,
      markets: [],
      missingReason:
        "Palpites finais ainda não foram publicados no banco deste ambiente.",
    };
  }

  const markets = (marketsData ?? []) as DatabaseSpecialMarket[];
  if (markets.length === 0) {
    return {
      available: false,
      markets: [],
      missingReason: "Nenhum palpite final foi configurado para o torneio ativo.",
    };
  }

  const marketIds = markets.map((market) => market.id);
  const user = await getOptionalUser(supabase);
  const [predictions, results] = await Promise.all([
    user
      ? supabase
          .from("special_predictions")
          .select("market_id, position, option_key, option_label, option_team_id")
          .eq("user_id", user.id)
          .in("market_id", marketIds)
          .order("position")
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("special_market_results")
      .select("market_id, position, option_key, option_label, option_team_id")
      .in("market_id", marketIds)
      .order("position"),
  ]);

  if (predictions.error) {
    throw new Error("Não foi possível carregar seus palpites finais.", {
      cause: predictions.error,
    });
  }
  if (results.error) {
    throw new Error("Não foi possível carregar resultados dos palpites finais.", {
      cause: results.error,
    });
  }

  const predictionsByMarket = groupPicks(
    (predictions.data ?? []) as DatabaseSpecialPick[],
  );
  const resultsByMarket = groupPicks((results.data ?? []) as DatabaseSpecialPick[]);
  const optionsBySource = new Map<SpecialMarketOptionSource, SpecialOption[]>();
  const now = Date.now();

  return {
    available: true,
    markets: markets.map((market) => {
      let options = optionsBySource.get(market.option_source);
      if (!options) {
        options = buildSpecialOptions(teams, market.option_source);
        if (market.option_source === "teams" || market.option_source === "players" || market.option_source === "goalkeepers") {
          options = attachTeamStats(options, matches);
        }
        optionsBySource.set(market.option_source, options);
      }

      return {
        id: market.id,
        key: market.key,
        title: market.title,
        description: market.description,
        valueType: market.value_type,
        optionSource: market.option_source,
        automaticKey: market.automatic_key,
        pickCount: market.pick_count,
        lockAt: market.lock_at,
        locked: market.status !== "open" || new Date(market.lock_at).getTime() <= now,
        status: market.status,
        exactPoints: market.exact_points,
        partialPoints: market.partial_points,
        scoringNote: market.scoring_note,
        options,
        predictions: predictionsByMarket.get(market.id) ?? [],
        results: resultsByMarket.get(market.id) ?? [],
        automaticSuggestions:
          input?.includeAutomatic && market.automatic_key
            ? computeAutomaticSuggestions(market.automatic_key, matches, teams)
            : [],
      };
    }),
  };
}

export async function getSpecialGlobalRanking({
  limit = 100,
}: {
  limit?: number;
} = {}): Promise<SpecialGlobalRankingOverview> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      available: false,
      entries: [],
      participantCount: 0,
      missingReason: "Supabase não está configurado neste ambiente.",
    };
  }

  const user = await getOptionalUser(supabase);
  if (!user) {
    return {
      available: false,
      entries: [],
      participantCount: 0,
      missingReason: "Entre para acompanhar o ranking global dos finais.",
    };
  }

  const { data, error } = await supabase.rpc("get_special_global_ranking", {
    p_limit: limit,
  });
  if (error) {
    console.warn("Could not load special global ranking", error);
    return {
      available: false,
      entries: [],
      participantCount: 0,
      missingReason: "Ranking global dos finais ainda não publicado neste ambiente.",
    };
  }

  const rows = (data ?? []) as DatabaseSpecialGlobalRankingRow[];
  return {
    available: true,
    entries: rows.map((row) => ({
      position: Number(row.rank_position),
      name: row.display_name,
      initials: initials(row.display_name),
      avatarUrl: row.avatar_url ?? undefined,
      points: Number(row.total_points),
      exactHits: Number(row.exact_hits),
      partialHits: Number(row.partial_hits),
      completedMarkets: Number(row.completed_markets),
      submittedMarkets: Number(row.submitted_markets),
      isCurrentUser: row.is_current_user === true,
    })),
    participantCount: Number(rows[0]?.participant_count ?? rows.length),
  };
}

function groupPicks(rows: DatabaseSpecialPick[]) {
  const grouped = new Map<string, SpecialPickView[]>();
  for (const row of rows) {
    const current = grouped.get(row.market_id) ?? [];
    current.push({
      position: row.position,
      key: row.option_key,
      label: row.option_label,
      teamId: row.option_team_id,
    });
    grouped.set(row.market_id, current);
  }

  for (const picks of grouped.values()) {
    picks.sort((left, right) => left.position - right.position);
  }
  return grouped;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
