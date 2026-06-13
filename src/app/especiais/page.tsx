import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SpecialPredictionsBoard } from "@/components/special-predictions-board";
import { requireUser } from "@/lib/auth";
import { getSpecialMarketsOverview } from "@/lib/data/specials";

export const metadata: Metadata = {
  title: "Palpites especiais",
  robots: { index: false, follow: false },
};

export default async function SpecialPredictionsPage() {
  await requireUser("/especiais");
  const overview = await getSpecialMarketsOverview();

  return (
    <main className="page-container py-7 md:py-10">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Além do placar</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Palpites especiais
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Uma área para escolher artilheiro, assistências, prêmios individuais,
            seleções destaque e caminho até a final. Entre em cada card para ver
            dados do elenco e salvar sua escolha.
          </p>
        </div>
        <Link
          href="/palpites"
          className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-surface px-4 text-sm font-black text-brand hover:border-brand/70"
        >
          <ArrowLeft className="size-4" />
          Voltar aos palpites
        </Link>
      </div>
      <SpecialPredictionsBoard overview={overview} />
    </main>
  );
}
