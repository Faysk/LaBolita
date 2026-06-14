import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpecialMarketPicker } from "@/components/special-market-picker";
import { requireUser } from "@/lib/auth";
import { getSpecialMarketsOverview } from "@/lib/data/specials";
import {
  specialMarketDisplay,
  specialMarketKeyFromSlug,
} from "@/lib/special-market-display";

export const metadata: Metadata = {
  title: "Palpite especial",
  robots: { index: false, follow: false },
};

export default async function SpecialMarketPage({
  params,
}: {
  params: Promise<{ marketKey: string }>;
}) {
  const { marketKey: marketSlug } = await params;
  const marketKey = specialMarketKeyFromSlug(marketSlug);

  await requireUser(`/especiais/${marketSlug}`);
  const overview = await getSpecialMarketsOverview();
  const market = overview.available
    ? overview.markets.find((candidate) => candidate.key === marketKey)
    : null;

  if (!market) {
    notFound();
  }

  const display = specialMarketDisplay(market.key);

  return (
    <main className="page-container py-7 md:py-10">
      <div className="mb-7">
        <p className="eyebrow">Palpite especial</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
          {display.heroTitle}
        </h1>
      </div>
      <SpecialMarketPicker market={market} />
    </main>
  );
}
