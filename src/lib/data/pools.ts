import { demoPools, demoRanking } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PoolSummary, RankingEntry } from "@/lib/types";

type MembershipRow = {
  pool_id: string;
  pool: {
    id: string;
    name: string;
    invite_code: string;
  } | null;
};

type RankingRow = {
  rank_position: number;
  user_id: string;
  display_name: string;
  total_points: number;
  exact_scores: number;
  correct_results: number;
};

export async function getPoolsOverview(): Promise<{
  pools: PoolSummary[];
  ranking: RankingEntry[];
  rankingName: string;
  rankingsByPool: Record<string, RankingEntry[]>;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoOverview();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { pools: [], ranking: [], rankingName: "Seus bolões", rankingsByPool: {} };
  }

  const { data, error } = await supabase
    .from("pool_members")
    .select("pool_id, pool:pools!pool_members_pool_id_fkey(id, name, invite_code)")
    .eq("user_id", user.id);

  if (error || !data?.length) {
    return {
      pools: [],
      ranking: [],
      rankingName: "Seu primeiro bolão",
      rankingsByPool: {},
    };
  }

  const memberships = data as unknown as MembershipRow[];
  const pools = await Promise.all(
    memberships.map(async ({ pool }) => {
      if (!pool) return null;
      const [{ count }, { data: rankingData }] = await Promise.all([
        supabase
          .from("pool_members")
          .select("*", { count: "exact", head: true })
          .eq("pool_id", pool.id),
        supabase.rpc("get_pool_ranking", { p_pool_id: pool.id }),
      ]);
      const ranking = (rankingData ?? []) as RankingRow[];
      const current = ranking.find((entry) => entry.user_id === user.id);

      return {
        summary: {
          id: pool.id,
          name: pool.name,
          code: pool.invite_code,
          members: count ?? ranking.length,
          position: current?.rank_position ?? 1,
        } satisfies PoolSummary,
        ranking: mapRanking(ranking, user.id),
      };
    }),
  );

  const availablePoolData = pools.filter(
    (
      pool,
    ): pool is {
      summary: PoolSummary;
      ranking: RankingEntry[];
    } => pool !== null,
  );
  const availablePools = availablePoolData.map((pool) => pool.summary);
  const rankingsByPool = Object.fromEntries(
    availablePoolData.map((pool) => [pool.summary.id, pool.ranking]),
  );
  const primaryPool = availablePools[0];
  if (!primaryPool) {
    return {
      pools: [],
      ranking: [],
      rankingName: "Seu primeiro bolão",
      rankingsByPool: {},
    };
  }
  const ranking = rankingsByPool[primaryPool.id] ?? [];

  return {
    pools: availablePools,
    ranking,
    rankingName: primaryPool.name,
    rankingsByPool,
  };
}

function demoOverview() {
  return {
    pools: demoPools,
    ranking: demoRanking,
    rankingName: "Família Faysk",
    rankingsByPool: Object.fromEntries(demoPools.map((pool) => [pool.id, demoRanking])),
  };
}

function mapRanking(ranking: RankingRow[], currentUserId: string): RankingEntry[] {
  return ranking.map((entry) => ({
    position: Number(entry.rank_position),
    name: entry.display_name,
    initials: initials(entry.display_name),
    points: Number(entry.total_points),
    exact: Number(entry.exact_scores),
    correct: Number(entry.correct_results),
    trend: "—",
    isCurrentUser: entry.user_id === currentUserId,
  }));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
