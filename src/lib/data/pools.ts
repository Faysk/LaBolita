import "server-only";
import { demoPools, demoRanking } from "@/lib/demo-data";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PoolSummary, RankingEntry } from "@/lib/types";

const PUBLIC_PAGE_SIZE = 9;

type MyPoolRow = {
  pool_id: string;
  pool_name: string;
  invite_code: string;
  is_public: boolean;
  flag_code: string;
  archived_at: string | null;
  member_role: "owner" | "admin" | "member";
  member_count: number;
};

type PublicPoolRow = {
  pool_id: string;
  pool_name: string;
  owner_name: string;
  flag_code: string;
  member_count: number;
  total_count: number;
};

type RankingRow = {
  rank_position: number;
  provisional_rank_position?: number;
  user_id?: string | null;
  is_current_user?: boolean;
  display_name: string;
  avatar_url?: string | null;
  total_points: number;
  provisional_points?: number;
  exact_scores: number;
  correct_results: number;
};

export type PoolsOverview = {
  pools: PoolSummary[];
  publicPools: PoolSummary[];
  ranking: RankingEntry[];
  rankingName: string;
  rankingsByPool: Record<string, RankingEntry[]>;
  isAuthenticated: boolean;
  currentUserId?: string;
  publicPage: number;
  publicPages: number;
  publicSearch: string;
};

export type PublicPoolHighlight = PoolSummary & {
  totalPoints: number;
  topPlayers: RankingEntry[];
};

export async function getPoolsOverview({
  publicPage = 1,
  publicSearch = "",
  includePublic = false,
}: {
  publicPage?: number;
  publicSearch?: string;
  includePublic?: boolean;
} = {}): Promise<PoolsOverview> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoOverview();

  const user = await getOptionalUser(supabase);
  const safePage = Math.max(1, Math.trunc(publicPage) || 1);
  const cleanSearch = publicSearch.trim().slice(0, 60);

  const [{ data: publicData, error: publicError }, myPoolsResult] = await Promise.all([
    includePublic
      ? supabase.rpc("get_public_pools", {
          p_search: cleanSearch || null,
          p_limit: PUBLIC_PAGE_SIZE,
          p_offset: (safePage - 1) * PUBLIC_PAGE_SIZE,
        })
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase.rpc("get_my_pools")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (publicError) {
    throw new Error("Não foi possível carregar os bolões públicos.", {
      cause: publicError,
    });
  }
  if (myPoolsResult.error) {
    throw new Error("Não foi possível carregar seus bolões.", {
      cause: myPoolsResult.error,
    });
  }
  const publicRows = (publicData ?? []) as PublicPoolRow[];
  const myPoolRows = (myPoolsResult.data ?? []) as MyPoolRow[];
  const pools = myPoolRows.map(
    (pool) =>
      ({
        id: pool.pool_id,
        name: pool.pool_name,
        flagCode: pool.flag_code,
        code: pool.invite_code,
        members: Number(pool.member_count),
        position: 1,
        isPublic: pool.is_public,
        isOwner: pool.member_role === "owner",
        isArchived: Boolean(pool.archived_at),
      }) satisfies PoolSummary,
  );
  const privateIds = new Set(pools.map((pool) => pool.id));
  const publicPools = publicRows
    .filter((pool) => !privateIds.has(pool.pool_id))
    .map(
      (pool) =>
        ({
          id: pool.pool_id,
          name: pool.pool_name,
          flagCode: pool.flag_code,
          members: Number(pool.member_count),
          position: 1,
          ownerName: pool.owner_name,
          isPublic: true,
        }) satisfies PoolSummary,
    );
  const rankingsByPool: Record<string, RankingEntry[]> = {};
  const primaryPrivatePool = pools.find((pool) => !pool.isArchived);
  if (primaryPrivatePool) {
    const { data, error } = await supabase.rpc("get_pool_ranking", {
      p_pool_id: primaryPrivatePool.id,
    });
    if (error) {
      throw new Error("Não foi possível carregar o ranking do bolão.", {
        cause: error,
      });
    }
    rankingsByPool[primaryPrivatePool.id] = mapRanking((data ?? []) as RankingRow[], user?.id);
  } else if (publicPools[0]) {
    const { data, error } = await supabase.rpc("get_public_pool_ranking", {
      p_pool_id: publicPools[0].id,
      p_limit: 25,
      p_offset: 0,
    });
    if (error) {
      throw new Error("Não foi possível carregar o ranking público.", {
        cause: error,
      });
    }
    rankingsByPool[publicPools[0].id] = mapRanking((data ?? []) as RankingRow[], user?.id);
  }
  const primaryPool = primaryPrivatePool ?? publicPools[0];
  const totalPublic = Number(publicRows[0]?.total_count ?? 0);

  return {
    pools,
    publicPools,
    ranking: primaryPool ? rankingsByPool[primaryPool.id] ?? [] : [],
    rankingName: primaryPool?.name ?? "Bolões públicos",
    rankingsByPool,
    isAuthenticated: Boolean(user),
    currentUserId: user?.id,
    publicPage: safePage,
    publicPages: Math.max(1, Math.ceil(totalPublic / PUBLIC_PAGE_SIZE)),
    publicSearch: cleanSearch,
  };
}

export async function getPublicGlobalRanking(): Promise<RankingEntry[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoRanking.slice(0, 3);
  const user = await getOptionalUser(supabase);

  const { data, error } = await supabase.rpc("get_public_global_ranking", {
    p_limit: 3,
  });
  if (error) {
    throw new Error("Não foi possível carregar o ranking público geral.", {
      cause: error,
    });
  }

  return mapRanking((data ?? []) as RankingRow[], user?.id);
}

export async function getPublicPoolHighlights(limit = 3): Promise<PublicPoolHighlight[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    const totalPoints = demoRanking.reduce((total, player) => total + player.points, 0);
    return demoPools.slice(0, limit).map((pool) => ({
      ...pool,
      isPublic: true,
      totalPoints,
      topPlayers: demoRanking.slice(0, 3),
    }));
  }

  const user = await getOptionalUser(supabase);
  const { data: publicData, error: publicError } = await supabase.rpc("get_public_pools", {
    p_search: null,
    p_limit: 12,
    p_offset: 0,
  });
  if (publicError) {
    console.error("Could not load public pool highlights", publicError);
    return [];
  }

  const highlights = await Promise.all(
    ((publicData ?? []) as PublicPoolRow[]).map(async (pool) => {
      const { data, error } = await supabase.rpc("get_public_pool_ranking", {
        p_pool_id: pool.pool_id,
        p_limit: 100,
        p_offset: 0,
      });
      if (error) {
        console.error("Could not load public pool highlight ranking", {
          poolId: pool.pool_id,
          code: error.code,
          message: error.message,
        });
        return {
          id: pool.pool_id,
          name: pool.pool_name,
          flagCode: pool.flag_code,
          members: Number(pool.member_count),
          position: 1,
          ownerName: pool.owner_name,
          isPublic: true,
          totalPoints: 0,
          topPlayers: [],
        } satisfies PublicPoolHighlight;
      }

      const ranking = mapRanking((data ?? []) as RankingRow[], user?.id);
      return {
        id: pool.pool_id,
        name: pool.pool_name,
        flagCode: pool.flag_code,
        members: Number(pool.member_count),
        position: 1,
        ownerName: pool.owner_name,
        isPublic: true,
        totalPoints: ranking.reduce(
          (total, player) => total + (player.provisionalPoints ?? player.points),
          0,
        ),
        topPlayers: ranking.slice(0, 3),
      } satisfies PublicPoolHighlight;
    }),
  );

  return highlights
    .sort(
      (left, right) =>
        right.totalPoints - left.totalPoints ||
        right.members - left.members ||
        left.name.localeCompare(right.name, "pt-BR"),
    )
    .slice(0, limit);
}

function demoOverview(): PoolsOverview {
  return {
    pools: demoPools.map((pool) => ({ ...pool, isOwner: true })),
    publicPools: [],
    ranking: demoRanking,
    rankingName: "Família Faysk",
    rankingsByPool: Object.fromEntries(demoPools.map((pool) => [pool.id, demoRanking])),
    isAuthenticated: true,
    currentUserId: "demo-user",
    publicPage: 1,
    publicPages: 1,
    publicSearch: "",
  };
}

function mapRanking(ranking: RankingRow[], currentUserId?: string): RankingEntry[] {
  return ranking.map((entry) => ({
    position: Number(entry.rank_position),
    provisionalPosition:
      entry.provisional_rank_position === undefined
        ? undefined
        : Number(entry.provisional_rank_position),
    name: entry.display_name,
    initials: initials(entry.display_name),
    points: Number(entry.total_points),
    provisionalPoints:
      entry.provisional_points === undefined
        ? undefined
        : Number(entry.provisional_points),
    exact: Number(entry.exact_scores),
    correct: Number(entry.correct_results),
    isCurrentUser:
      entry.is_current_user === true || entry.user_id === currentUserId,
    avatarUrl: entry.avatar_url ?? undefined,
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
