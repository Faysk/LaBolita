import type { Metadata } from "next";
import { CompetitionOverview } from "@/components/competition-overview";
import { PageShortcuts } from "@/components/page-shortcuts";
import { getMatches } from "@/lib/data/matches";

export const metadata: Metadata = {
  title: "Copa 2026",
  description: "Classificação dos grupos e chave eliminatória da Copa 2026.",
};

export default async function CompetitionPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const params = await searchParams;
  const matches = await getMatches();
  const view = params.aba === "eliminatorias" ? "knockout" : "groups";

  return (
    <main className="page-container py-7 md:py-10">
      <div className="mb-7">
        <div>
          <p className="eyebrow">Acompanhe a competição</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">Copa 2026</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Veja a classificação dos grupos e o caminho até a final. Placares ao vivo aparecem como provisórios até a confirmação.
          </p>
        </div>
      </div>
      <PageShortcuts
        routeKeys={["games", "players", "specials", "live"]}
        className="mb-6"
      />
      <CompetitionOverview matches={matches} view={view} />
    </main>
  );
}
