export type MatchStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type DemoTeam = {
  id: string;
  code?: string;
  name: string;
  shortName: string;
  flag: string;
};

export type DemoMatch = {
  id: string;
  matchNumber?: number;
  stage: MatchStage;
  stageLabel: string;
  dateLabel: string;
  timeLabel: string;
  scheduledAt?: string;
  venue: string;
  locked: boolean;
  homeSourceMatchNumber?: number | null;
  awaySourceMatchNumber?: number | null;
  homeTeam: DemoTeam;
  awayTeam: DemoTeam;
  prediction?: {
    homeScore: number;
    awayScore: number;
    advancingTeamId?: string | null;
  };
  result?: MatchResult;
  liveResult?: MatchResult;
  providerStatus?: string | null;
  providerUpdatedAt?: string | null;
};

export type ScorePrediction = {
  homeScore: number;
  awayScore: number;
  advancingTeamId?: string | null;
};

export type MatchResult = {
  homeScore: number;
  awayScore: number;
  advancingTeamId?: string | null;
};

export type ScoreBreakdown = {
  category:
    | "exact"
    | "refined"
    | "result"
    | "one-score"
    | "miss";
  basePoints: number;
  multiplier: number;
  matchPoints: number;
  advancementPoints: number;
  totalPoints: number;
};

export type PoolSummary = {
  id: string;
  name: string;
  flagCode?: string;
  code?: string;
  members: number;
  position: number;
  eligibleFrom?: string;
  ownerName?: string;
  isPublic?: boolean;
  isOfficial?: boolean;
  isOwner?: boolean;
  isArchived?: boolean;
  isMember?: boolean;
};

export type RankingEntry = {
  userId?: string;
  position: number;
  provisionalPosition?: number;
  name: string;
  initials: string;
  points: number;
  provisionalPoints?: number;
  exact: number;
  correct: number;
  isCurrentUser?: boolean;
  avatarUrl?: string;
};
