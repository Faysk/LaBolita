import type { Metadata } from "next";
import { PredictionBoard } from "@/components/prediction-board";
import { LiveRefresh } from "@/components/live-refresh";
import { SpecialPredictionsEntry } from "@/components/special-predictions-entry";
import { isLiveMatch } from "@/lib/match-display";
import { requireUser } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";
import { getSpecialMarketsOverview } from "@/lib/data/specials";

export const metadata: Metadata = {
  title: "Palpites",
  robots: { index: false, follow: false },
};

export default async function PredictionsPage() {
  await requireUser("/palpites");
  const [matches, specialsOverview] = await Promise.all([
    getMatches(),
    getSpecialMarketsOverview(),
  ]);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );

  return (
    <main className="page-container py-7 md:py-10">
      <LiveRefresh active={matches.some(isLiveMatch) || awaitingOfficial} />
      <div className="mb-7">
        <p className="eyebrow">A bola está com você</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
          Seus palpites
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted md:text-base">
          O mesmo palpite vale em todos os seus bolões. Você pode alterar até o
          horário de bloqueio de cada partida.
        </p>
      </div>
      <SpecialPredictionsEntry overview={specialsOverview} />
      <div id="lista-de-jogos" className="scroll-mt-28" aria-hidden="true" />
      <PredictionBoard matches={matches} />
    </main>
  );
}
