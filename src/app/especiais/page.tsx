import type { Metadata } from "next";
import { PageShortcuts } from "@/components/page-shortcuts";
import { SpecialPredictionsBoard } from "@/components/special-predictions-board";
import { requireUser } from "@/lib/auth";
import { getSpecialMarketsOverview } from "@/lib/data/specials";

export const metadata: Metadata = {
  title: "Palpites finais",
  robots: { index: false, follow: false },
};

export default async function SpecialPredictionsPage() {
  await requireUser("/especiais");
  const overview = await getSpecialMarketsOverview();

  return (
    <main className="page-container py-7 md:py-10">
      <div className="mb-7">
        <div>
          <p className="eyebrow">Além do placar</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Palpites finais
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Aqui entram as apostas de temporada: artilheiro, assistências,
            prêmios individuais, seleções destaque e caminho até a final. Cada
            palpite final abre um baralho de cartas para buscar, comparar e salvar.
          </p>
        </div>
      </div>
      <PageShortcuts
        routeKeys={["predictions", "players", "dashboard", "rules"]}
        className="mb-6"
      />
      <SpecialPredictionsBoard overview={overview} />
    </main>
  );
}
