import type { Metadata } from "next";
import { LiveRefresh } from "@/components/live-refresh";
import { UserDashboard } from "@/components/user-dashboard";
import { requireUser } from "@/lib/auth";
import { getAdminAlertsForCurrentUser } from "@/lib/data/admin-alerts";
import { getMatches } from "@/lib/data/matches";
import { getPoolsOverview } from "@/lib/data/pools";
import { getSpecialMarketsOverview } from "@/lib/data/specials";
import { isLiveMatch } from "@/lib/match-display";

export const metadata: Metadata = {
  title: "Meu painel",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  await requireUser("/painel");
  const matches = await getMatches();
  const [poolsOverview, specialsOverview, alerts] = await Promise.all([
    getPoolsOverview({ includeAllRankings: true }),
    getSpecialMarketsOverview({ matches }),
    getAdminAlertsForCurrentUser(),
  ]);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );

  return (
    <>
      <LiveRefresh active={matches.some(isLiveMatch) || awaitingOfficial} />
      <UserDashboard
        alerts={alerts}
        matches={matches}
        poolsOverview={poolsOverview}
        specialsOverview={specialsOverview}
      />
    </>
  );
}
