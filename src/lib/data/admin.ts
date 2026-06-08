import "server-only";
import { getViewerContext } from "@/lib/auth";

const MASTER_PAGE_SIZE = 25;

export type MasterAdminTab = "pools" | "users" | "audit";

export type MasterOverviewParams = {
  activeTab?: MasterAdminTab;
  poolPage?: number;
  poolSearch?: string;
  userPage?: number;
  userSearch?: string;
};

export type MasterPool = {
  poolId: string;
  poolName: string;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
  isPublic: boolean;
  flagCode: string;
  archivedAt: string | null;
  memberCount: number;
  createdAt: string;
};

export type MasterUser = {
  userId: string;
  displayName: string;
  email: string;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  disabledAt: string | null;
  termsAcceptedAt: string | null;
  poolsOwned: number;
  createdAt: string;
};

export type AuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type MasterOverview = {
  isGlobalAdmin: boolean;
  isMaster: boolean;
  pools: MasterPool[];
  users: MasterUser[];
  audit: AuditEntry[];
  termsEnforcementEnabled: boolean;
  activeTab: MasterAdminTab;
  poolPage: number;
  poolPages: number;
  poolTotal: number;
  poolSearch: string;
  userPage: number;
  userPages: number;
  userTotal: number;
  userSearch: string;
};

type MasterPoolRow = {
  pool_id: string;
  pool_name: string;
  owner_id: string;
  owner_name: string;
  invite_code: string;
  is_public: boolean;
  flag_code: string;
  archived_at: string | null;
  member_count: number;
  created_at: string;
  total_count: number;
};

type MasterUserRow = {
  user_id: string;
  display_name: string;
  email: string;
  is_master_admin: boolean;
  is_admin: boolean;
  disabled_at: string | null;
  terms_accepted_at: string | null;
  pools_owned: number;
  created_at: string;
  total_count: number;
};

export async function getMasterOverview(
  params: MasterOverviewParams = {},
): Promise<MasterOverview> {
  const activeTab = params.activeTab ?? "pools";
  const poolPage = positivePage(params.poolPage);
  const userPage = positivePage(params.userPage);
  const poolSearch = cleanSearch(params.poolSearch);
  const userSearch = cleanSearch(params.userSearch);
  const emptyOverview = {
    pools: [],
    users: [],
    audit: [],
    termsEnforcementEnabled: false,
    activeTab,
    poolPage,
    poolPages: 1,
    poolTotal: 0,
    poolSearch,
    userPage,
    userPages: 1,
    userTotal: 0,
    userSearch,
  };
  const { supabase, user, profile, demoMode } = await getViewerContext();
  if (demoMode) {
    return {
      ...emptyOverview,
      isGlobalAdmin: true,
      isMaster: true,
    };
  }

  if (!user) {
    return {
      ...emptyOverview,
      isGlobalAdmin: false,
      isMaster: false,
    };
  }

  if (!profile?.is_admin) {
    return {
      ...emptyOverview,
      isGlobalAdmin: false,
      isMaster: false,
    };
  }

  const [poolsResult, usersResult, auditResult, settingsResult] = await Promise.all([
    supabase.rpc("master_list_pools", {
      p_search: poolSearch || null,
      p_limit: activeTab === "pools" ? MASTER_PAGE_SIZE : 1,
      p_offset: activeTab === "pools" ? (poolPage - 1) * MASTER_PAGE_SIZE : 0,
    }),
    supabase.rpc("master_list_users", {
      p_search: userSearch || null,
      p_limit: activeTab === "users" ? MASTER_PAGE_SIZE : 1,
      p_offset: activeTab === "users" ? (userPage - 1) * MASTER_PAGE_SIZE : 0,
    }),
    supabase
      .from("admin_audit_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(activeTab === "audit" ? 50 : 1),
    supabase.rpc("get_master_settings"),
  ]);
  const overviewError =
    poolsResult.error ?? usersResult.error ?? auditResult.error ?? settingsResult.error;
  if (overviewError) {
    throw new Error("Não foi possível carregar a administração master.", {
      cause: overviewError,
    });
  }
  const poolRows = (poolsResult.data ?? []) as MasterPoolRow[];
  const userRows = (usersResult.data ?? []) as MasterUserRow[];
  const poolTotal = Number(poolRows[0]?.total_count ?? 0);
  const userTotal = Number(userRows[0]?.total_count ?? 0);

  return {
    isGlobalAdmin: true,
    isMaster: Boolean(profile.is_master_admin),
    pools: (activeTab === "pools" ? poolRows : []).map((pool) => ({
      poolId: pool.pool_id,
      poolName: pool.pool_name,
      ownerId: pool.owner_id,
      ownerName: pool.owner_name,
      inviteCode: pool.invite_code,
      isPublic: pool.is_public,
      flagCode: pool.flag_code,
      archivedAt: pool.archived_at,
      memberCount: Number(pool.member_count),
      createdAt: pool.created_at,
    })),
    users: (activeTab === "users" ? userRows : []).map((profileRow) => ({
      userId: profileRow.user_id,
      displayName: profileRow.display_name,
      email: profileRow.email,
      isMasterAdmin: profileRow.is_master_admin,
      isAdmin: profileRow.is_admin,
      disabledAt: profileRow.disabled_at,
      termsAcceptedAt: profileRow.terms_accepted_at,
      poolsOwned: Number(profileRow.pools_owned),
      createdAt: profileRow.created_at,
    })),
    audit: (activeTab === "audit" ? (auditResult.data ?? []) : []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      metadata: (entry.metadata ?? {}) as Record<string, unknown>,
      createdAt: entry.created_at,
    })),
    termsEnforcementEnabled: Boolean(settingsResult.data?.[0]?.terms_enforcement_enabled),
    activeTab,
    poolPage,
    poolPages: pageCount(poolTotal),
    poolTotal,
    poolSearch,
    userPage,
    userPages: pageCount(userTotal),
    userTotal,
    userSearch,
  };
}

function positivePage(value?: number) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 1;
}

function cleanSearch(value?: string) {
  return value?.trim().slice(0, 100) ?? "";
}

function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / MASTER_PAGE_SIZE));
}
