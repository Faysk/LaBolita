import type { Metadata } from "next";
import { PredictionBoard } from "@/components/prediction-board";
import { LiveRefresh } from "@/components/live-refresh";
import { PageShortcuts } from "@/components/page-shortcuts";
import { SpecialPredictionsEntry } from "@/components/special-predictions-entry";
import { isLiveMatch } from "@/lib/match-display";
import { requireUser } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";
import { getPredictionComparisonOverview } from "@/lib/data/prediction-comparisons";
import { getSpecialMarketsOverview } from "@/lib/data/specials";

export const metadata: Metadata = {
  title: "Meus palpites",
  robots: { index: false, follow: false },
};

type PredictionsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PredictionsPage({ searchParams }: PredictionsPageProps) {
  await requireUser("/palpites");
  const requestedMatchId = firstSearchParam((await searchParams).jogo);
  const matches = await getMatches();
  const [specialsOverview, comparisonOverview] = await Promise.all([
    getSpecialMarketsOverview(),
    getPredictionComparisonOverview(matches),
  ]);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );

  return (
    <main className="page-container py-7 md:py-10">
      <LiveRefresh active={matches.some(isLiveMatch) || awaitingOfficial} />
      <div className="mb-7">
        <p className="eyebrow">Seus placares</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
          Meus palpites
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted md:text-base">
          O mesmo placar vale em todos os seus bolões. Dá para mudar até o
          bloqueio de cada jogo. Depois disso, é acompanhar a rodada e somar.
        </p>
      </div>
      <PageShortcuts
        routeKeys={["dashboard", "games", "specials", "pools"]}
        className="mb-6"
      />
      <SpecialPredictionsEntry overview={specialsOverview} />
      <div id="lista-de-jogos" className="scroll-mt-28" aria-hidden="true" />
      <PredictionBoard
        matches={matches}
        comparisonOverview={comparisonOverview}
        focusMatchId={requestedMatchId}
      />
    </main>
  );
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
