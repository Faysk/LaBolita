import type { Metadata } from "next";
import { LiveCenter } from "@/components/live-center";
import { LiveRefresh } from "@/components/live-refresh";
import { getMatches } from "@/lib/data/matches";
import { getPoolsOverview } from "@/lib/data/pools";
import { getPredictionComparisonOverview } from "@/lib/data/prediction-comparisons";
import { demoPools } from "@/lib/demo-data";
import { isLiveMatch } from "@/lib/match-display";
import {
  buildDemoMatchComparisons,
  type PredictionComparisonOverview,
} from "@/lib/prediction-comparisons";
import type { DemoMatch } from "@/lib/types";

export const metadata: Metadata = {
  title: "Ao vivo",
  description: "Acompanhe placares, ranking provisório e palpites do bolão em tempo real.",
  robots: { index: false, follow: false },
};

export default async function LivePage() {
  const matches = await getMatches();
  const [poolsOverview, rawComparisonOverview] = await Promise.all([
    getPoolsOverview({ includeAllRankings: true }),
    getPredictionComparisonOverview(matches),
  ]);
  const comparisonOverview = withDemoComparisons(matches, rawComparisonOverview);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );
  const hasLive = matches.some(isLiveMatch);

  return (
    <>
      <LiveRefresh active={hasLive || awaitingOfficial} intervalMs={hasLive ? 15_000 : 30_000} />
      <LiveCenter
        matches={matches}
        poolsOverview={poolsOverview}
        comparisonOverview={comparisonOverview}
      />
    </>
  );
}

function withDemoComparisons(
  matches: DemoMatch[],
  overview: PredictionComparisonOverview,
): PredictionComparisonOverview {
  if (overview.source !== "demo") return overview;

  const comparableMatches = matches.filter(
    (match) => match.locked || match.result || isLiveMatch(match),
  );

  return {
    source: "demo",
    pools: demoPools.map((pool) => ({
      id: pool.id,
      name: pool.name,
      flagCode: pool.flagCode,
      members: pool.members,
    })),
    comparisonsByMatch: Object.fromEntries(
      comparableMatches.map((match) => [
        match.id,
        buildDemoMatchComparisons({
          match,
          result: match.result ?? match.liveResult,
          currentPrediction: match.prediction,
        }),
      ]),
    ),
  };
}
