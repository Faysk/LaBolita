import type { Metadata } from "next";
import { PredictionBoard } from "@/components/prediction-board";
import { requireUser } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";

export const metadata: Metadata = {
  title: "Palpites",
};

export default async function PredictionsPage() {
  await requireUser("/palpites");
  const matches = await getMatches();

  return (
    <main className="page-container py-7 md:py-10">
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
      <PredictionBoard matches={matches} />
    </main>
  );
}
