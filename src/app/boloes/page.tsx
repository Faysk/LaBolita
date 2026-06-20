import type { Metadata } from "next";
import { PoolsWorkspace } from "@/components/pools-workspace";
import { getMatches } from "@/lib/data/matches";
import { getPoolsOverview } from "@/lib/data/pools";
import { getPredictionComparisonOverview } from "@/lib/data/prediction-comparisons";
import { selectLiveOrNextMatch } from "@/lib/match-display";

export const metadata: Metadata = {
  title: "Bolões",
  description: "Descubra bolões públicos e acompanhe os rankings da Copa 2026.",
};

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; busca?: string }>;
}) {
  const params = await searchParams;
  const [overview, matches] = await Promise.all([
    getPoolsOverview({
      publicPage: Number(params.pagina ?? 1),
      publicSearch: params.busca ?? "",
      includePublic: true,
      includeAllRankings: true,
    }),
    getMatches(),
  ]);
  const comparisonOverview = await getPredictionComparisonOverview(matches);

  return (
    <PoolsWorkspace
      {...overview}
      matches={matches}
      comparisonOverview={comparisonOverview}
      spotlightMatch={selectLiveOrNextMatch(matches)}
    />
  );
}
