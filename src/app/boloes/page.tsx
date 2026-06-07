import type { Metadata } from "next";
import { PoolsWorkspace } from "@/components/pools-workspace";
import { requireUser } from "@/lib/auth";
import { getPoolsOverview } from "@/lib/data/pools";

export const metadata: Metadata = {
  title: "Bolões",
};

export default async function PoolsPage() {
  await requireUser("/boloes");
  const overview = await getPoolsOverview();
  return <PoolsWorkspace {...overview} />;
}
