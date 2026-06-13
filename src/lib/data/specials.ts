import "server-only";
import {
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
        "Palpites especiais ainda não foram publicados no banco deste ambiente.",
    };
  }

  const markets = (marketsData ?? []) as DatabaseSpecialMarket[];
  if (markets.length === 0) {
    return {
      available: false,
      markets: [],
      missingReason: "Nenhum palpite especial foi configurado para o torneio ativo.",
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
    throw new Error("Não foi possível carregar seus palpites especiais.", {
      cause: predictions.error,
    });
  }
  if (results.error) {
    throw new Error("Não foi possível carregar resultados especiais.", {
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
