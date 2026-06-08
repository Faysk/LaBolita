import "server-only";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
};

export async function getMasterOverview(): Promise<MasterOverview> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      isGlobalAdmin: true,
      isMaster: true,
      pools: [],
      users: [],
      audit: [],
      termsEnforcementEnabled: false,
    };
  }

  const user = await getOptionalUser(supabase);
  if (!user) {
    return {
      isGlobalAdmin: false,
      isMaster: false,
      pools: [],
      users: [],
      audit: [],
      termsEnforcementEnabled: false,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin, is_master_admin")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;
  if (!profile?.is_admin) {
    return {
      isGlobalAdmin: false,
      isMaster: false,
      pools: [],
      users: [],
      audit: [],
      termsEnforcementEnabled: false,
    };
  }

  const [poolsResult, usersResult, auditResult, settingsResult] = await Promise.all([
    supabase.rpc("master_list_pools", {
      p_search: null,
      p_limit: 1000,
      p_offset: 0,
    }),
    supabase.rpc("master_list_users", {
      p_search: null,
      p_limit: 1000,
      p_offset: 0,
    }),
    supabase
      .from("admin_audit_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.rpc("get_master_settings"),
  ]);
  const overviewError =
    poolsResult.error ?? usersResult.error ?? auditResult.error ?? settingsResult.error;
  if (overviewError) {
    throw new Error("Não foi possível carregar a administração master.", {
      cause: overviewError,
    });
  }

  return {
    isGlobalAdmin: true,
    isMaster: Boolean(profile.is_master_admin),
    pools: ((poolsResult.data ?? []) as MasterPoolRow[]).map((pool) => ({
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
    users: ((usersResult.data ?? []) as MasterUserRow[]).map((profileRow) => ({
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
    audit: (auditResult.data ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      metadata: (entry.metadata ?? {}) as Record<string, unknown>,
      createdAt: entry.created_at,
    })),
    termsEnforcementEnabled: Boolean(settingsResult.data?.[0]?.terms_enforcement_enabled),
  };
}
