import type { Metadata } from "next";
import { LiveRefresh } from "@/components/live-refresh";
import { UserDashboard } from "@/components/user-dashboard";
import { requireUser } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";
import { getPoolsOverview } from "@/lib/data/pools";
import { getSpecialMarketsOverview } from "@/lib/data/specials";
import { isLiveMatch } from "@/lib/match-display";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  await requireUser("/painel");
  const matches = await getMatches();
  const [poolsOverview, specialsOverview] = await Promise.all([
    getPoolsOverview({ includeAllRankings: true }),
    getSpecialMarketsOverview({ matches }),
  ]);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );

  return (
    <>
      <LiveRefresh active={matches.some(isLiveMatch) || awaitingOfficial} />
      <UserDashboard
        matches={matches}
        poolsOverview={poolsOverview}
        specialsOverview={specialsOverview}
      />
    </>
  );
}
