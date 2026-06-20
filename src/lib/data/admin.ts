import "server-only";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { getOptionalUser } from "@/lib/supabase/auth";
import {
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import type { ScorePrediction } from "@/lib/types";

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

export type AdminConnectionStatus = {
  key: "database" | "service_role" | "auth" | "results_feed" | "cron";
  label: string;
  status: "ok" | "warn" | "danger";
  detail: string;
};

export type AdminSummary = {
  generatedAt: string;
  users: {
    total: number;
    active: number;
    disabled: number;
    admins: number;
    termsPending: number;
  };
  pools: {
    total: number;
    active: number;
    archived: number;
    public: number;
    memberships: number;
  };
  predictions: {
    matchPredictions: number;
    changedMatchPredictions: number;
    scoredPredictions: number;
    specialPredictions: number;
  };
  audit: {
    recentTotal: number;
    resultChanges: number;
    userActions: number;
    poolActions: number;
    topActions: { action: string; count: number }[];
  };
  connections: AdminConnectionStatus[];
  nextActions: { label: string; detail: string; tone: "ok" | "warn" | "danger" }[];
};

export type AdminUserReport = {
  userId: string;
  identity: {
    email: string;
    providers: string[];
    createdAt: string | null;
    confirmedAt: string | null;
    lastSignInAt: string | null;
  };
  stats: {
    poolMemberships: number;
    poolsOwned: number;
    matchPredictions: number;
    changedPredictions: number;
    scoredPredictions: number;
    totalPoints: number;
    exactScores: number;
    correctResults: number;
    specialPicks: number;
    adminActionsAsActor: number;
    adminActionsAsTarget: number;
    resultChanges: number;
  };
  pools: {
    poolId: string;
    poolName: string;
    flagCode: string;
    role: string;
    isPublic: boolean;
    archivedAt: string | null;
    joinedAt: string;
    eligibleFrom: string;
  }[];
  recentPredictions: {
    matchId: string;
    matchLabel: string;
    stageLabel: string;
    scheduledAt: string | null;
    prediction: ScorePrediction;
    result: ScorePrediction | null;
    submittedAt: string;
    updatedAt: string;
    changed: boolean;
    points: number | null;
    category: string | null;
  }[];
  specialMarkets: {
    marketKey: string;
    marketTitle: string;
    picks: string[];
    updatedAt: string;
  }[];
  auditTrail: AuditEntry[];
};

export type MasterOverview = {
  isGlobalAdmin: boolean;
  isMaster: boolean;
  activeTab: MasterTab;
  search: string;
  page: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  pools: MasterPool[];
  users: MasterUser[];
  audit: AuditEntry[];
  termsEnforcementEnabled: boolean;
  summary: AdminSummary;
  userReports: Record<string, AdminUserReport>;
};

export type MasterTab = "pools" | "users" | "audit";

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

type DatabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type ServiceClient = NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>;

type PoolMembershipRow = {
  pool_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  eligible_from: string;
  pools:
    | {
        id: string;
        name: string;
        flag_code: string | null;
        is_public: boolean;
        archived_at: string | null;
      }
    | {
        id: string;
        name: string;
        flag_code: string | null;
        is_public: boolean;
        archived_at: string | null;
      }[]
    | null;
};

type PredictionRow = {
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  advancing_team_id: string | null;
  submitted_at: string;
  updated_at: string;
};

type PredictionScoreRow = {
  user_id: string;
  match_id: string;
  category: string;
  total_points: number;
};

type MatchLookupRow = {
  id: string;
  match_number: number;
  stage: string;
  group_name: string | null;
  scheduled_at: string;
  home_score: number | null;
  away_score: number | null;
  advancing_team_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type TeamLookupRow = {
  id: string;
  name: string;
  short_name: string;
};

type SpecialPredictionRow = {
  user_id: string;
  market_id: string;
  option_label: string;
  updated_at: string;
  special_markets:
    | {
        key: string;
        title: string;
      }
    | {
        key: string;
        title: string;
      }[]
    | null;
};

type AuditRow = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const EMPTY_SUMMARY: AdminSummary = {
  generatedAt: new Date(0).toISOString(),
  users: {
    total: 0,
    active: 0,
    disabled: 0,
    admins: 0,
    termsPending: 0,
  },
  pools: {
    total: 0,
    active: 0,
    archived: 0,
    public: 0,
    memberships: 0,
  },
  predictions: {
    matchPredictions: 0,
    changedMatchPredictions: 0,
    scoredPredictions: 0,
    specialPredictions: 0,
  },
  audit: {
    recentTotal: 0,
    resultChanges: 0,
    userActions: 0,
    poolActions: 0,
    topActions: [],
  },
  connections: [
    {
      key: "database",
      label: "Banco",
      status: "warn",
      detail: "Modo demonstração ou ambiente sem Supabase.",
    },
    {
      key: "service_role",
      label: "Service role",
      status: "warn",
      detail: "Relatórios profundos exigem chave server-side.",
    },
    {
      key: "auth",
      label: "Auth",
      status: "warn",
      detail: "Leitura administrativa de Auth indisponível.",
    },
    {
      key: "results_feed",
      label: "Feed",
      status: "warn",
      detail: "Resultados dependem de operação manual.",
    },
    {
      key: "cron",
      label: "Cron",
      status: "warn",
      detail: "Segredo de cron não configurado.",
    },
  ],
  nextActions: [
    {
      label: "Configurar ambiente",
      detail: "Conectar Supabase para liberar dados reais.",
      tone: "warn",
    },
  ],
};

export async function getMasterOverview({
  activeTab = "pools",
  search = "",
  page = 1,
}: {
  activeTab?: MasterTab;
  search?: string;
  page?: number;
} = {}): Promise<MasterOverview> {
  const cleanSearch = search.trim().slice(0, 80);
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const pageSize = activeTab === "audit" ? 50 : 24;
  const offset = (safePage - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      isGlobalAdmin: true,
      isMaster: true,
      activeTab,
      search: cleanSearch,
      page: safePage,
      hasPreviousPage: safePage > 1,
      hasNextPage: false,
      pools: [],
      users: [],
      audit: [],
      termsEnforcementEnabled: false,
      summary: emptyAdminSummary(false),
      userReports: {},
    };
  }

  const user = await getOptionalUser(supabase);
  if (!user) {
    return {
      isGlobalAdmin: false,
      isMaster: false,
      activeTab,
      search: cleanSearch,
      page: safePage,
      hasPreviousPage: false,
      hasNextPage: false,
      pools: [],
      users: [],
      audit: [],
      termsEnforcementEnabled: false,
      summary: emptyAdminSummary(true),
      userReports: {},
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
      activeTab,
      search: cleanSearch,
      page: safePage,
      hasPreviousPage: false,
      hasNextPage: false,
      pools: [],
      users: [],
      audit: [],
      termsEnforcementEnabled: false,
      summary: emptyAdminSummary(true),
      userReports: {},
    };
  }

  const serviceClient = createServiceRoleSupabaseClient();
  const [poolsResult, usersResult, auditResult, settingsResult, summary] = await Promise.all([
    activeTab === "pools"
      ? supabase.rpc("master_list_pools", {
          p_search: cleanSearch || null,
          p_limit: pageSize + 1,
          p_offset: offset,
        })
      : Promise.resolve({ data: [], error: null }),
    activeTab === "users"
      ? supabase.rpc("master_list_users", {
          p_search: cleanSearch || null,
          p_limit: pageSize + 1,
          p_offset: offset,
        })
      : Promise.resolve({ data: [], error: null }),
    activeTab === "audit"
      ? supabase
        .from("admin_audit_logs")
        .select("id, action, entity_type, entity_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize)
      : Promise.resolve({ data: [], error: null }),
    supabase.rpc("get_master_settings"),
    getAdminSummary({
      supabase,
      serviceClient,
    }),
  ]);
  const overviewError =
    poolsResult.error ?? usersResult.error ?? auditResult.error ?? settingsResult.error;
  if (overviewError) {
    throw new Error("Não foi possível carregar a administração master.", {
      cause: overviewError,
    });
  }

  const rawPools = (poolsResult.data ?? []) as MasterPoolRow[];
  const rawUsers = (usersResult.data ?? []) as MasterUserRow[];
  const rawAudit = auditResult.data ?? [];
  const hasNextPage =
    activeTab === "pools"
      ? rawPools.length > pageSize
      : activeTab === "users"
        ? rawUsers.length > pageSize
        : rawAudit.length > pageSize;

  const pools = rawPools.slice(0, pageSize).map((pool) => ({
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
  }));
  const users = rawUsers.slice(0, pageSize).map((profileRow) => ({
    userId: profileRow.user_id,
    displayName: profileRow.display_name,
    email: profileRow.email,
    isMasterAdmin: profileRow.is_master_admin,
    isAdmin: profileRow.is_admin,
    disabledAt: profileRow.disabled_at,
    termsAcceptedAt: profileRow.terms_accepted_at,
    poolsOwned: Number(profileRow.pools_owned),
    createdAt: profileRow.created_at,
  }));
  const audit = rawAudit.slice(0, pageSize).map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    metadata: (entry.metadata ?? {}) as Record<string, unknown>,
    createdAt: entry.created_at,
  }));
  const userReports =
    activeTab === "users" && users.length > 0
      ? await getAdminUserReports({ serviceClient, users })
      : {};

  return {
    isGlobalAdmin: true,
    isMaster: Boolean(profile.is_master_admin),
    activeTab,
    search: cleanSearch,
    page: safePage,
    hasPreviousPage: safePage > 1,
    hasNextPage,
    pools,
    users,
    audit,
    termsEnforcementEnabled: Boolean(settingsResult.data?.[0]?.terms_enforcement_enabled),
    summary,
    userReports,
  };
}

function emptyAdminSummary(databaseConfigured: boolean): AdminSummary {
  return {
    ...EMPTY_SUMMARY,
    generatedAt: new Date().toISOString(),
    connections: EMPTY_SUMMARY.connections.map((connection) =>
      connection.key === "database"
        ? {
            ...connection,
            status: databaseConfigured ? "ok" : "warn",
            detail: databaseConfigured
              ? "Supabase respondeu para a sessão atual."
              : connection.detail,
          }
        : connection,
    ),
  };
}

async function getAdminSummary({
  supabase,
  serviceClient,
}: {
  supabase: DatabaseClient;
  serviceClient: ReturnType<typeof createServiceRoleSupabaseClient>;
}): Promise<AdminSummary> {
  if (!supabase) return emptyAdminSummary(false);
  const client = serviceClient ?? supabase;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const authReadable = serviceClient ? await canReadAuthAdmin(serviceClient) : false;

  const [
    totalUsers,
    disabledUsers,
    adminUsers,
    termsMissing,
    termsOutdated,
    totalPools,
    archivedPools,
    publicPools,
    memberships,
    matchPredictions,
    scoredPredictions,
    specialPredictions,
    recentAudit,
    resultAudit,
    userAudit,
    poolAudit,
    changedMatchPredictions,
    topActions,
  ] = await Promise.all([
    safeCount("profiles.total", client.from("profiles").select("id", { count: "exact", head: true })),
    safeCount(
      "profiles.disabled",
      client.from("profiles").select("id", { count: "exact", head: true }).not("disabled_at", "is", null),
    ),
    safeCount(
      "profiles.admins",
      client.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", true),
    ),
    safeCount(
      "profiles.terms_missing",
      client.from("profiles").select("id", { count: "exact", head: true }).is("terms_accepted_at", null),
    ),
    safeCount(
      "profiles.terms_outdated",
      client
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("terms_accepted_at", "is", null)
        .neq("terms_version", CURRENT_TERMS_VERSION),
    ),
    safeCount("pools.total", client.from("pools").select("id", { count: "exact", head: true })),
    safeCount(
      "pools.archived",
      client.from("pools").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
    ),
    safeCount(
      "pools.public",
      client.from("pools").select("id", { count: "exact", head: true }).eq("is_public", true),
    ),
    safeCount("pool_members.total", client.from("pool_members").select("pool_id", { count: "exact", head: true })),
    safeCount(
      "predictions.total",
      client.from("predictions").select("user_id", { count: "exact", head: true }),
    ),
    safeCount(
      "prediction_scores.total",
      client.from("prediction_scores").select("user_id", { count: "exact", head: true }),
    ),
    safeCount(
      "special_predictions.total",
      client.from("special_predictions").select("user_id", { count: "exact", head: true }),
    ),
    safeCount(
      "admin_audit_logs.recent",
      client.from("admin_audit_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
    ),
    safeCount(
      "admin_audit_logs.results",
      client
        .from("admin_audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "match")
        .gte("created_at", since),
    ),
    safeCount(
      "admin_audit_logs.users",
      client
        .from("admin_audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "user")
        .gte("created_at", since),
    ),
    safeCount(
      "admin_audit_logs.pools",
      client
        .from("admin_audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "pool")
        .gte("created_at", since),
    ),
    getChangedPredictionCount(client),
    getTopAuditActions(client, since),
  ]);

  const activeUsers = Math.max(totalUsers - disabledUsers, 0);
  const activePools = Math.max(totalPools - archivedPools, 0);
  const serviceRoleConfigured = Boolean(serviceClient);
  const resultsFeedConfigured = Boolean(process.env.RESULTS_FEED_URL);
  const cronConfigured = Boolean(process.env.CRON_SECRET);
  const nextActions = buildNextActions({
    serviceRoleConfigured,
    authReadable,
    disabledUsers,
    termsPending: termsMissing + termsOutdated,
    resultAudit,
    specialPredictions,
  });

  return {
    generatedAt: new Date().toISOString(),
    users: {
      total: totalUsers,
      active: activeUsers,
      disabled: disabledUsers,
      admins: adminUsers,
      termsPending: termsMissing + termsOutdated,
    },
    pools: {
      total: totalPools,
      active: activePools,
      archived: archivedPools,
      public: publicPools,
      memberships,
    },
    predictions: {
      matchPredictions,
      changedMatchPredictions,
      scoredPredictions,
      specialPredictions,
    },
    audit: {
      recentTotal: recentAudit,
      resultChanges: resultAudit,
      userActions: userAudit,
      poolActions: poolAudit,
      topActions,
    },
    connections: [
      {
        key: "database",
        label: "Banco",
        status: "ok",
        detail: "Supabase respondeu para a sessão atual.",
      },
      {
        key: "service_role",
        label: "Service role",
        status: serviceRoleConfigured ? "ok" : "warn",
        detail: serviceRoleConfigured
          ? "Relatórios server-side liberados."
          : "Relatórios profundos ficam limitados sem a chave server-side.",
      },
      {
        key: "auth",
        label: "Auth",
        status: authReadable ? "ok" : serviceRoleConfigured ? "danger" : "warn",
        detail: authReadable
          ? "Leitura administrativa de usuários disponível."
          : "Login/último acesso exigem Auth Admin via service role.",
      },
      {
        key: "results_feed",
        label: "Feed",
        status: resultsFeedConfigured ? "ok" : "warn",
        detail: resultsFeedConfigured
          ? "Fonte de resultados configurada."
          : "Resultados dependem de confirmação manual.",
      },
      {
        key: "cron",
        label: "Cron",
        status: cronConfigured ? "ok" : "warn",
        detail: cronConfigured
          ? "Segredo de automação configurado."
          : "Execução automática precisa do segredo de cron.",
      },
    ],
    nextActions,
  };
}

async function getAdminUserReports({
  serviceClient,
  users,
}: {
  serviceClient: ReturnType<typeof createServiceRoleSupabaseClient>;
  users: MasterUser[];
}): Promise<Record<string, AdminUserReport>> {
  if (!serviceClient) return {};
  const userIds = users.map((user) => user.userId);
  if (userIds.length === 0) return {};

  const [
    authUsers,
    memberships,
    predictions,
    scores,
    matches,
    teams,
    specialPredictions,
    actorAudit,
    targetAudit,
    resultChanges,
  ] = await Promise.all([
    getAuthUsersById(serviceClient, userIds),
    safeRows<PoolMembershipRow>(
      "pool_members.user_reports",
      serviceClient
        .from("pool_members")
        .select("pool_id, user_id, role, joined_at, eligible_from, pools(id, name, flag_code, is_public, archived_at)")
        .in("user_id", userIds)
        .order("joined_at", { ascending: false }),
    ),
    safeRows<PredictionRow>(
      "predictions.user_reports",
      serviceClient
        .from("predictions")
        .select("user_id, match_id, home_score, away_score, advancing_team_id, submitted_at, updated_at")
        .in("user_id", userIds)
        .order("updated_at", { ascending: false })
        .range(0, 9999),
    ),
    safeRows<PredictionScoreRow>(
      "prediction_scores.user_reports",
      serviceClient
        .from("prediction_scores")
        .select("user_id, match_id, category, total_points")
        .in("user_id", userIds)
        .range(0, 9999),
    ),
    safeRows<MatchLookupRow>(
      "matches.user_reports",
      serviceClient
        .from("matches")
        .select("id, match_number, stage, group_name, scheduled_at, home_score, away_score, advancing_team_id, home_team_id, away_team_id")
        .range(0, 300),
    ),
    safeRows<TeamLookupRow>(
      "teams.user_reports",
      serviceClient.from("teams").select("id, name, short_name").range(0, 300),
    ),
    safeRows<SpecialPredictionRow>(
      "special_predictions.user_reports",
      serviceClient
        .from("special_predictions")
        .select("user_id, market_id, option_label, updated_at, special_markets(key, title)")
        .in("user_id", userIds)
        .order("updated_at", { ascending: false })
        .range(0, 9999),
    ),
    safeRows<AuditRow>(
      "admin_audit_logs.actor_reports",
      serviceClient
        .from("admin_audit_logs")
        .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
        .in("actor_id", userIds)
        .order("created_at", { ascending: false })
        .limit(200),
    ),
    safeRows<AuditRow>(
      "admin_audit_logs.target_reports",
      serviceClient
        .from("admin_audit_logs")
        .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
        .in("entity_id", userIds)
        .order("created_at", { ascending: false })
        .limit(200),
    ),
    safeRows<{ changed_by: string | null }>(
      "match_result_history.user_reports",
      serviceClient
        .from("match_result_history")
        .select("changed_by")
        .in("changed_by", userIds)
        .range(0, 9999),
    ),
  ]);

  const membershipsByUser = groupBy(memberships, (membership) => membership.user_id);
  const predictionsByUser = groupBy(predictions, (prediction) => prediction.user_id);
  const scoresByUser = groupBy(scores, (score) => score.user_id);
  const scoresByUserAndMatch = new Map(
    scores.map((score) => [`${score.user_id}:${score.match_id}`, score]),
  );
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const specialsByUser = groupSpecialPredictions(specialPredictions);
  const actorAuditByUser = groupBy(actorAudit, (entry) => entry.actor_id ?? "");
  const targetAuditByUser = groupBy(targetAudit, (entry) => entry.entity_id ?? "");
  const resultChangesByUser = groupBy(resultChanges, (entry) => entry.changed_by ?? "");

  return Object.fromEntries(
    users.map((user) => {
      const authUser = authUsers.get(user.userId);
      const userMemberships = membershipsByUser.get(user.userId) ?? [];
      const userPredictions = predictionsByUser.get(user.userId) ?? [];
      const userScores = scoresByUser.get(user.userId) ?? [];
      const userSpecials = specialsByUser.get(user.userId) ?? [];
      const asActor = actorAuditByUser.get(user.userId) ?? [];
      const asTarget = targetAuditByUser.get(user.userId) ?? [];
      const auditTrail = uniqueAuditEntries([...asActor, ...asTarget]);
      const report: AdminUserReport = {
        userId: user.userId,
        identity: {
          email: authUser?.email ?? user.email,
          providers: authProviders(authUser),
          createdAt: authUser?.created_at ?? user.createdAt ?? null,
          confirmedAt: authUser?.email_confirmed_at ?? authUser?.confirmed_at ?? null,
          lastSignInAt: authUser?.last_sign_in_at ?? null,
        },
        stats: {
          poolMemberships: userMemberships.length,
          poolsOwned: user.poolsOwned,
          matchPredictions: userPredictions.length,
          changedPredictions: userPredictions.filter((prediction) =>
            hasMeaningfulUpdate(prediction.submitted_at, prediction.updated_at),
          ).length,
          scoredPredictions: userScores.length,
          totalPoints: userScores.reduce((total, score) => total + Number(score.total_points), 0),
          exactScores: userScores.filter((score) => score.category === "exact").length,
          correctResults: userScores.filter((score) =>
            ["exact", "refined", "result"].includes(score.category),
          ).length,
          specialPicks: userSpecials.reduce((total, market) => total + market.picks.length, 0),
          adminActionsAsActor: asActor.length,
          adminActionsAsTarget: asTarget.length,
          resultChanges: (resultChangesByUser.get(user.userId) ?? []).length,
        },
        pools: userMemberships.map((membership) => {
          const pool = firstRelation(membership.pools);
          return {
            poolId: membership.pool_id,
            poolName: pool?.name ?? "Bolão removido",
            flagCode: pool?.flag_code ?? "br",
            role: membership.role,
            isPublic: Boolean(pool?.is_public),
            archivedAt: pool?.archived_at ?? null,
            joinedAt: membership.joined_at,
            eligibleFrom: membership.eligible_from,
          };
        }),
        recentPredictions: userPredictions.map((prediction) => {
          const match = matchesById.get(prediction.match_id);
          const score = scoresByUserAndMatch.get(`${prediction.user_id}:${prediction.match_id}`);
          return {
            matchId: prediction.match_id,
            matchLabel: match ? matchLabel(match, teamsById) : "Partida não encontrada",
            stageLabel: match ? stageLabel(match.stage, match.group_name) : "Partida",
            scheduledAt: match?.scheduled_at ?? null,
            prediction: {
              homeScore: Number(prediction.home_score),
              awayScore: Number(prediction.away_score),
              advancingTeamId: prediction.advancing_team_id,
            },
            result:
              match?.home_score === null || match?.away_score === null || !match
                ? null
                : {
                    homeScore: Number(match.home_score),
                    awayScore: Number(match.away_score),
                    advancingTeamId: match.advancing_team_id,
                  },
            submittedAt: prediction.submitted_at,
            updatedAt: prediction.updated_at,
            changed: hasMeaningfulUpdate(prediction.submitted_at, prediction.updated_at),
            points: score ? Number(score.total_points) : null,
            category: score?.category ?? null,
          };
        }),
        specialMarkets: userSpecials,
        auditTrail,
      };
      return [user.userId, report];
    }),
  );
}

async function canReadAuthAdmin(serviceClient: ServiceClient) {
  const { error } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1 });
  return !error;
}

async function safeCount(
  label: string,
  request: PromiseLike<{ count: number | null; error: { message?: string } | null }>,
) {
  const { count, error } = await request;
  if (error) {
    console.warn(`Admin count failed: ${label}`, error.message ?? error);
    return 0;
  }
  return Number(count ?? 0);
}

async function safeRows<T>(
  label: string,
  request: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
) {
  const { data, error } = await request;
  if (error) {
    console.warn(`Admin rows failed: ${label}`, error.message ?? error);
    return [] as T[];
  }
  return (data ?? []) as T[];
}

async function getChangedPredictionCount(client: NonNullable<DatabaseClient>) {
  const rows = await safeRows<Pick<PredictionRow, "submitted_at" | "updated_at">>(
    "predictions.changed_count",
    client.from("predictions").select("submitted_at, updated_at").range(0, 9999),
  );
  return rows.filter((prediction) =>
    hasMeaningfulUpdate(prediction.submitted_at, prediction.updated_at),
  ).length;
}

async function getTopAuditActions(client: NonNullable<DatabaseClient>, since: string) {
  const rows = await safeRows<{ action: string }>(
    "admin_audit_logs.top_actions",
    client
      .from("admin_audit_logs")
      .select("action")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(250),
  );
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.action, (counts.get(row.action) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([action, count]) => ({ action, count }))
    .sort((left, right) => right.count - left.count || left.action.localeCompare(right.action));
}

async function getAuthUsersById(serviceClient: ServiceClient, userIds: string[]) {
  const users = new Map<string, Awaited<ReturnType<typeof serviceClient.auth.admin.getUserById>>["data"]["user"]>();
  const entries = await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } = await serviceClient.auth.admin.getUserById(userId);
      if (error) {
        console.warn("Admin auth user lookup failed", error.message);
        return [userId, null] as const;
      }
      return [userId, data.user] as const;
    }),
  );
  for (const [userId, authUser] of entries) {
    if (authUser) users.set(userId, authUser);
  }
  return users;
}

function groupBy<T>(items: T[], keyFor: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function groupSpecialPredictions(rows: SpecialPredictionRow[]) {
  const byUserAndMarket = new Map<string, AdminUserReport["specialMarkets"][number]>();
  for (const row of rows) {
    const market = firstRelation(row.special_markets);
    const key = `${row.user_id}:${row.market_id}`;
    const current =
      byUserAndMarket.get(key) ??
      ({
        marketKey: market?.key ?? row.market_id,
        marketTitle: market?.title ?? "Palpite especial",
        picks: [],
        updatedAt: row.updated_at,
      } satisfies AdminUserReport["specialMarkets"][number]);
    current.picks.push(row.option_label);
    if (Date.parse(row.updated_at) > Date.parse(current.updatedAt)) {
      current.updatedAt = row.updated_at;
    }
    byUserAndMarket.set(key, current);
  }

  const byUser = new Map<string, AdminUserReport["specialMarkets"]>();
  for (const [key, market] of byUserAndMarket) {
    const userId = key.split(":")[0];
    byUser.set(userId, [...(byUser.get(userId) ?? []), market]);
  }
  for (const markets of byUser.values()) {
    markets.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }
  return byUser;
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function uniqueAuditEntries(entries: AuditRow[]) {
  const byId = new Map<number, AuditEntry>();
  for (const entry of entries) {
    byId.set(entry.id, {
      id: entry.id,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      metadata: entry.metadata ?? {},
      createdAt: entry.created_at,
    });
  }
  return [...byId.values()].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function authProviders(authUser: {
  app_metadata?: Record<string, unknown>;
  identities?: { provider?: string }[] | null;
} | null | undefined) {
  const providers = authUser?.app_metadata?.providers;
  if (Array.isArray(providers)) return providers.map(String).filter(Boolean);
  const provider = authUser?.app_metadata?.provider;
  if (typeof provider === "string" && provider) return [provider];
  return (authUser?.identities ?? []).map((identity) => identity.provider).filter(Boolean) as string[];
}

function hasMeaningfulUpdate(submittedAt: string, updatedAt: string) {
  return Date.parse(updatedAt) - Date.parse(submittedAt) > 1000;
}

function stageLabel(stage: string, groupName: string | null) {
  if (stage === "group") return groupName ? `Grupo ${groupName}` : "Fase de grupos";
  return (
    {
      round_of_32: "16 avos",
      round_of_16: "Oitavas",
      quarter_final: "Quartas",
      semi_final: "Semifinal",
      third_place: "Terceiro lugar",
      final: "Final",
    }[stage] ?? "Partida"
  );
}

function matchLabel(match: MatchLookupRow, teamsById: Map<string, TeamLookupRow>) {
  const home = match.home_team_id ? teamsById.get(match.home_team_id)?.short_name : null;
  const away = match.away_team_id ? teamsById.get(match.away_team_id)?.short_name : null;
  return `Jogo ${match.match_number}: ${home ?? "Mandante"} x ${away ?? "Visitante"}`;
}

function buildNextActions({
  serviceRoleConfigured,
  authReadable,
  disabledUsers,
  termsPending,
  resultAudit,
  specialPredictions,
}: {
  serviceRoleConfigured: boolean;
  authReadable: boolean;
  disabledUsers: number;
  termsPending: number;
  resultAudit: number;
  specialPredictions: number;
}) {
  const actions: AdminSummary["nextActions"] = [];
  if (!serviceRoleConfigured || !authReadable) {
    actions.push({
      label: "Liberar auditoria profunda",
      detail: "Service role valida último login, Auth e relatórios completos.",
      tone: "warn",
    });
  }
  if (termsPending > 0) {
    actions.push({
      label: "Termos pendentes",
      detail: `${termsPending} usuário(s) ainda precisam aceitar a versão atual.`,
      tone: "warn",
    });
  }
  if (disabledUsers > 0) {
    actions.push({
      label: "Contas suspensas",
      detail: `${disabledUsers} conta(s) exigem acompanhamento administrativo.`,
      tone: "warn",
    });
  }
  if (resultAudit > 0) {
    actions.push({
      label: "Placares alterados",
      detail: `${resultAudit} ação(ões) de resultado nas últimas 24h.`,
      tone: "ok",
    });
  }
  if (specialPredictions === 0) {
    actions.push({
      label: "Especiais sem volume",
      detail: "Acompanhar adesão antes do prazo final.",
      tone: "warn",
    });
  }
  if (actions.length === 0) {
    actions.push({
      label: "Operação estável",
      detail: "Nenhuma pendência crítica encontrada nos sinais globais.",
      tone: "ok",
    });
  }
  return actions.slice(0, 4);
}
