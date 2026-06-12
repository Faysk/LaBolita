import type { Metadata } from "next";
import { PoolsWorkspace } from "@/components/pools-workspace";
import { getPoolsOverview } from "@/lib/data/pools";

export const metadata: Metadata = {
  title: "Bolões",
  description: "Descubra bolões públicos e acompanhe os rankings da Copa 2026.",
};

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; busca?: string }>;
}) {
  const params = await searchParams;
  const overview = await getPoolsOverview({
    publicPage: Number(params.pagina ?? 1),
    publicSearch: params.busca ?? "",
    includePublic: true,
  });
  return <PoolsWorkspace {...overview} />;
}
