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

export type AuditSource = "all" | "admin" | "activity" | "predictions" | "specials";
export type AuditPeriod = "24h" | "7d" | "30d" | "all";

export type AuditSourceSummary = {
  source: Exclude<AuditSource, "all">;
  label: string;
  count: number;
};

export type AuditEntry = {
  id: string;
  numericId: number;
  source: Exclude<AuditSource, "all">;
  action: string;
  title: string;
  actorId: string | null;
  userId: string | null;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AuditFilters = {
  source: AuditSource;
  period: AuditPeriod;
  query: string;
  periodStart: string | null;
  sourceSummary: AuditSourceSummary[];
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
    userActivityEvents: number;
    predictionChanges: number;
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
    matchPredictionChanges: number;
    specialPredictionChanges: number;
    activityEvents: number;
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
  predictionChanges: {
    id: number;
    matchId: string;
    matchLabel: string;
    action: string;
    previousPrediction: Record<string, unknown> | null;
    newPrediction: Record<string, unknown>;
    createdAt: string;
  }[];
  specialPredictionChanges: {
    id: number;
    marketId: string;
    marketKey: string;
    marketTitle: string;
    action: string;
    previousOptions: unknown[];
    newOptions: unknown[];
    createdAt: string;
  }[];
  activity: {
    id: number;
    eventType: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }[];
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
  auditFilters: AuditFilters;
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

type SpecialMarketLookupRow = {
  id: string;
  key: string;
  title: string;
};

type PredictionChangeRow = {
  id: number;
  user_id: string;
  match_id: string;
  action: string;
  previous_prediction: Record<string, unknown> | null;
  new_prediction: Record<string, unknown>;
  created_at: string;
};

type SpecialPredictionChangeRow = {
  id: number;
  user_id: string;
  market_id: string;
  action: string;
  previous_options: unknown;
  new_options: unknown;
  created_at: string;
};

type UserActivityRow = {
  id: number;
  user_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
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

const AUDIT_SOURCES = new Set<AuditSource>(["all", "admin", "activity", "predictions", "specials"]);
const AUDIT_PERIODS = new Set<AuditPeriod>(["24h", "7d", "30d", "all"]);
const AUDIT_SOURCE_LABELS: Record<Exclude<AuditSource, "all">, string> = {
  admin: "Admin",
  activity: "Usuários",
  predictions: "Palpites",
  specials: "Especiais",
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
    userActivityEvents: 0,
    predictionChanges: 0,
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
  auditSource = "all",
  auditPeriod = "7d",
  auditQuery = "",
}: {
  activeTab?: MasterTab;
  search?: string;
  page?: number;
  auditSource?: string;
  auditPeriod?: string;
  auditQuery?: string;
} = {}): Promise<MasterOverview> {
  const cleanSearch = search.trim().slice(0, 80);
  const cleanAuditSource = normalizeAuditSource(auditSource);
  const cleanAuditPeriod = normalizeAuditPeriod(auditPeriod);
  const cleanAuditQuery = auditQuery.trim().slice(0, 80);
  const emptyFilters = emptyAuditFilters(cleanAuditSource, cleanAuditPeriod, cleanAuditQuery);
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
      auditFilters: emptyFilters,
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
      auditFilters: emptyFilters,
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
      auditFilters: emptyFilters,
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
      ? getProjectAuditEntries({
          client: serviceClient ?? supabase,
          source: cleanAuditSource,
          period: cleanAuditPeriod,
          query: cleanAuditQuery,
          limit: pageSize + 1,
          offset,
        })
      : Promise.resolve({
          data: [],
          error: null,
          summary: emptyAuditSourceSummary(),
        }),
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
    numericId: entry.numericId,
    source: entry.source,
    action: entry.action,
    title: entry.title,
    actorId: entry.actorId,
    userId: entry.userId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? {},
    createdAt: entry.createdAt,
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
    auditFilters: {
      source: cleanAuditSource,
      period: cleanAuditPeriod,
      query: cleanAuditQuery,
      periodStart: auditPeriodStart(cleanAuditPeriod),
      sourceSummary: auditResult.summary,
    },
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

function normalizeAuditSource(source?: string): AuditSource {
  return AUDIT_SOURCES.has(source as AuditSource) ? (source as AuditSource) : "all";
}

function normalizeAuditPeriod(period?: string): AuditPeriod {
  return AUDIT_PERIODS.has(period as AuditPeriod) ? (period as AuditPeriod) : "7d";
}

function auditPeriodStart(period: AuditPeriod) {
  const now = Date.now();
  const hours =
    period === "24h" ? 24 : period === "7d" ? 7 * 24 : period === "30d" ? 30 * 24 : null;
  return hours ? new Date(now - hours * 60 * 60 * 1000).toISOString() : null;
}

function emptyAuditSourceSummary(): AuditSourceSummary[] {
  return (["admin", "activity", "predictions", "specials"] as const).map((source) => ({
    source,
    label: AUDIT_SOURCE_LABELS[source],
    count: 0,
  }));
}

function emptyAuditFilters(source: AuditSource, period: AuditPeriod, query: string): AuditFilters {
  return {
    source,
    period,
    query,
    periodStart: auditPeriodStart(period),
    sourceSummary: emptyAuditSourceSummary(),
  };
}

async function getProjectAuditEntries({
  client,
  source,
  period,
  query,
  limit,
  offset,
}: {
  client: NonNullable<DatabaseClient> | ServiceClient;
  source: AuditSource;
  period: AuditPeriod;
  query: string;
  limit: number;
  offset: number;
}): Promise<{ data: AuditEntry[]; error: null; summary: AuditSourceSummary[] }> {
  const periodStart = auditPeriodStart(period);
  const fetchLimit = query ? 500 : Math.min(Math.max(offset + limit, limit), 500);

  const [adminRows, activityRows, predictionRows, specialRows] = await Promise.all([
    safeRows<AuditRow>(
      "project_audit.admin",
      periodStart
        ? client
            .from("admin_audit_logs")
            .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
            .gte("created_at", periodStart)
            .order("created_at", { ascending: false })
            .limit(fetchLimit)
        : client
            .from("admin_audit_logs")
            .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
            .order("created_at", { ascending: false })
            .limit(fetchLimit),
    ),
    safeRows<UserActivityRow>(
      "project_audit.activity",
      periodStart
        ? client
            .from("user_activity_events")
            .select("id, user_id, event_type, entity_type, entity_id, metadata, created_at")
            .gte("created_at", periodStart)
            .order("created_at", { ascending: false })
            .limit(fetchLimit)
        : client
            .from("user_activity_events")
            .select("id, user_id, event_type, entity_type, entity_id, metadata, created_at")
            .order("created_at", { ascending: false })
            .limit(fetchLimit),
    ),
    safeRows<PredictionChangeRow>(
      "project_audit.predictions",
      periodStart
        ? client
            .from("prediction_change_events")
            .select("id, user_id, match_id, action, previous_prediction, new_prediction, created_at")
            .gte("created_at", periodStart)
            .order("created_at", { ascending: false })
            .limit(fetchLimit)
        : client
            .from("prediction_change_events")
            .select("id, user_id, match_id, action, previous_prediction, new_prediction, created_at")
            .order("created_at", { ascending: false })
            .limit(fetchLimit),
    ),
    safeRows<SpecialPredictionChangeRow>(
      "project_audit.specials",
      periodStart
        ? client
            .from("special_prediction_change_events")
            .select("id, user_id, market_id, action, previous_options, new_options, created_at")
            .gte("created_at", periodStart)
            .order("created_at", { ascending: false })
            .limit(fetchLimit)
        : client
            .from("special_prediction_change_events")
            .select("id, user_id, market_id, action, previous_options, new_options, created_at")
            .order("created_at", { ascending: false })
            .limit(fetchLimit),
    ),
  ]);

  const entries = [
    ...adminRows.map(adminAuditEntry),
    ...activityRows.map(activityAuditEntry),
    ...predictionRows.map(predictionAuditEntry),
    ...specialRows.map(specialAuditEntry),
  ]
    .filter((entry) => auditEntryMatchesQuery(entry, query))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const counts = new Map<Exclude<AuditSource, "all">, number>();
  for (const entry of entries) {
    counts.set(entry.source, (counts.get(entry.source) ?? 0) + 1);
  }
  const visibleEntries =
    source === "all" ? entries : entries.filter((entry) => entry.source === source);

  return {
    data: visibleEntries.slice(offset, offset + limit),
    error: null,
    summary: emptyAuditSourceSummary().map((item) => ({
      ...item,
      count: counts.get(item.source) ?? 0,
    })),
  };
}

function adminAuditEntry(row: AuditRow): AuditEntry {
  return {
    id: `admin-${row.id}`,
    numericId: row.id,
    source: "admin",
    action: row.action,
    title: auditEventTitle(row.action),
    actorId: row.actor_id,
    userId: null,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function activityAuditEntry(row: UserActivityRow): AuditEntry {
  return {
    id: `activity-${row.id}`,
    numericId: row.id,
    source: "activity",
    action: row.event_type,
    title: auditEventTitle(row.event_type),
    actorId: null,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function predictionAuditEntry(row: PredictionChangeRow): AuditEntry {
  const previous = predictionPayloadSummary(row.previous_prediction);
  const next = predictionPayloadSummary(row.new_prediction);
  return {
    id: `prediction-${row.id}`,
    numericId: row.id,
    source: "predictions",
    action: `match_prediction_${row.action}`,
    title: row.action === "created" ? "Palpite de jogo criado" : "Palpite de jogo alterado",
    actorId: null,
    userId: row.user_id,
    entityType: "match",
    entityId: row.match_id,
    metadata: {
      user_id: row.user_id,
      match_id: row.match_id,
      previous,
      next,
      raw_previous: row.previous_prediction,
      raw_next: row.new_prediction,
    },
    createdAt: row.created_at,
  };
}

function specialAuditEntry(row: SpecialPredictionChangeRow): AuditEntry {
  const previous = optionsPayloadSummary(arrayFromJson(row.previous_options));
  const next = optionsPayloadSummary(arrayFromJson(row.new_options));
  return {
    id: `special-${row.id}`,
    numericId: row.id,
    source: "specials",
    action: `special_prediction_${row.action}`,
    title: row.action === "created" ? "Palpite final criado" : "Palpite final alterado",
    actorId: null,
    userId: row.user_id,
    entityType: "special_market",
    entityId: row.market_id,
    metadata: {
      user_id: row.user_id,
      market_id: row.market_id,
      previous,
      next,
      raw_previous: arrayFromJson(row.previous_options),
      raw_next: arrayFromJson(row.new_options),
    },
    createdAt: row.created_at,
  };
}

function auditEntryMatchesQuery(entry: AuditEntry, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    entry.action,
    entry.title,
    entry.source,
    entry.actorId,
    entry.userId,
    entry.entityType,
    entry.entityId,
    JSON.stringify(entry.metadata),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

function auditEventTitle(action: string) {
  return (
    {
      finalize_match: "Resultado finalizado",
      update_match_result: "Resultado corrigido",
      assign_match_teams: "Mata-mata definido",
      update_user: "Usuário alterado",
      disable_user: "Conta suspensa",
      restore_user: "Conta reativada",
      promote_admin: "Admin promovido",
      remove_admin: "Admin removido",
      update_pool: "Bolão alterado",
      archive_pool: "Bolão arquivado",
      restore_pool: "Bolão recuperado",
      remove_pool_member: "Membro removido",
      set_terms_enforcement: "Termos alterados",
      resolve_special_market: "Especial resolvido",
      create_admin_alert: "Alerta criado",
      login_completed: "Login concluído",
      terms_accepted: "Termos aceitos",
      match_prediction_created: "Palpite criado",
      match_prediction_updated: "Palpite alterado",
      special_prediction_created: "Especial criado",
      special_prediction_updated: "Especial alterado",
      pool_created: "Bolão criado",
      pool_joined: "Entrou no bolão",
      admin_alert_dismissed: "Alerta dispensado",
    }[action] ?? humanizeAuditKey(action)
  );
}

function predictionPayloadSummary(value: Record<string, unknown> | null) {
  if (!value) return "primeiro envio";
  const home = value.home_score ?? value.homeScore;
  const away = value.away_score ?? value.awayScore;
  if (typeof home === "number" && typeof away === "number") {
    return `${home} x ${away}`;
  }
  return "palpite registrado";
}

function optionsPayloadSummary(options: unknown[]) {
  if (options.length === 0) return "primeiro envio";
  const labels = options
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const label = (option as { label?: unknown }).label;
      return typeof label === "string" ? label : null;
    })
    .filter((label): label is string => Boolean(label));
  return labels.length > 0 ? labels.join(", ") : `${options.length} opção(ões)`;
}

function humanizeAuditKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
    userActivityEvents,
    predictionChanges,
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
    safeCount(
      "user_activity_events.recent",
      client
        .from("user_activity_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
    ),
    safeCount(
      "prediction_change_events.recent",
      client
        .from("prediction_change_events")
        .select("id", { count: "exact", head: true })
        .eq("action", "updated")
        .gte("created_at", since),
    ),
    getTopAuditActions(client, since),
  ]);

  const activeUsers = Math.max(totalUsers - disabledUsers, 0);
  const activePools = Math.max(totalPools - archivedPools, 0);
  const recentAuditTotal = recentAudit + userActivityEvents + predictionChanges;
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
      recentTotal: recentAuditTotal,
      resultChanges: resultAudit,
      userActions: userAudit,
      poolActions: poolAudit,
      userActivityEvents,
      predictionChanges,
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
    specialMarkets,
    predictionChanges,
    specialPredictionChanges,
    activityEvents,
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
    safeRows<SpecialMarketLookupRow>(
      "special_markets.user_reports",
      serviceClient.from("special_markets").select("id, key, title").range(0, 100),
    ),
    safeRows<PredictionChangeRow>(
      "prediction_change_events.user_reports",
      serviceClient
        .from("prediction_change_events")
        .select("id, user_id, match_id, action, previous_prediction, new_prediction, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(500),
    ),
    safeRows<SpecialPredictionChangeRow>(
      "special_prediction_change_events.user_reports",
      serviceClient
        .from("special_prediction_change_events")
        .select("id, user_id, market_id, action, previous_options, new_options, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(500),
    ),
    safeRows<UserActivityRow>(
      "user_activity_events.user_reports",
      serviceClient
        .from("user_activity_events")
        .select("id, user_id, event_type, entity_type, entity_id, metadata, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(500),
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
  const specialMarketsById = new Map(specialMarkets.map((market) => [market.id, market]));
  const specialsByUser = groupSpecialPredictions(specialPredictions);
  const predictionChangesByUser = groupBy(predictionChanges, (change) => change.user_id);
  const specialPredictionChangesByUser = groupBy(
    specialPredictionChanges,
    (change) => change.user_id,
  );
  const activityEventsByUser = groupBy(activityEvents, (event) => event.user_id);
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
      const userPredictionChanges = predictionChangesByUser.get(user.userId) ?? [];
      const userSpecialPredictionChanges = specialPredictionChangesByUser.get(user.userId) ?? [];
      const userActivityEvents = activityEventsByUser.get(user.userId) ?? [];
      const asActor = actorAuditByUser.get(user.userId) ?? [];
      const asTarget = targetAuditByUser.get(user.userId) ?? [];
      const auditTrail = uniqueAuditEntries([...asActor, ...asTarget]);
      const inferredChangedPredictions = userPredictions.filter((prediction) =>
        hasMeaningfulUpdate(prediction.submitted_at, prediction.updated_at),
      ).length;
      const recordedPredictionUpdates = userPredictionChanges.filter(
        (change) => change.action === "updated",
      ).length;
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
          changedPredictions: Math.max(inferredChangedPredictions, recordedPredictionUpdates),
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
          matchPredictionChanges: userPredictionChanges.length,
          specialPredictionChanges: userSpecialPredictionChanges.length,
          activityEvents: userActivityEvents.length,
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
        predictionChanges: userPredictionChanges.map((change) => {
          const match = matchesById.get(change.match_id);
          return {
            id: change.id,
            matchId: change.match_id,
            matchLabel: match ? matchLabel(match, teamsById) : "Partida não encontrada",
            action: change.action,
            previousPrediction: change.previous_prediction,
            newPrediction: change.new_prediction,
            createdAt: change.created_at,
          };
        }),
        specialPredictionChanges: userSpecialPredictionChanges.map((change) => {
          const market = specialMarketsById.get(change.market_id);
          return {
            id: change.id,
            marketId: change.market_id,
            marketKey: market?.key ?? change.market_id,
            marketTitle: market?.title ?? "Palpite final",
            action: change.action,
            previousOptions: arrayFromJson(change.previous_options),
            newOptions: arrayFromJson(change.new_options),
            createdAt: change.created_at,
          };
        }),
        activity: userActivityEvents.map((event) => ({
          id: event.id,
          eventType: event.event_type,
          entityType: event.entity_type,
          entityId: event.entity_id,
          metadata: event.metadata ?? {},
          createdAt: event.created_at,
        })),
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
        marketTitle: market?.title ?? "Palpite final",
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

function arrayFromJson(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function uniqueAuditEntries(entries: AuditRow[]) {
  const byId = new Map<number, AuditEntry>();
  for (const entry of entries) {
    byId.set(entry.id, {
      id: `admin-${entry.id}`,
      numericId: entry.id,
      source: "admin",
      action: entry.action,
      title: auditEventTitle(entry.action),
      actorId: entry.actor_id,
      userId: null,
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
