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
    <main className="page-container py-5 md:py-7">
      <LiveRefresh active={matches.some(isLiveMatch) || awaitingOfficial} />
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Seus placares</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-4xl">
            Meus palpites
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Preencha os jogos abertos e acompanhe, nos finalizados, o resultado e a
          pontuação de cada participante.
        </p>
      </div>
      <PageShortcuts
        routeKeys={["dashboard", "games", "specials", "pools"]}
        className="mb-4"
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
