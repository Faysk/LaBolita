type MatchStatus = "scheduled" | "postponed" | "live" | "finished" | "cancelled";
type ProviderStatus = "scheduled" | "live" | "finished";

type MatchState = {
  status: MatchStatus;
  providerStatus: string | null;
  liveHomeScore: number | null;
  liveAwayScore: number | null;
};

type ProviderObservationState = {
  status: ProviderStatus;
  homeScore: number | null;
  awayScore: number | null;
};

export type ProviderSyncDecision = "apply" | "skip" | "regression";

export function providerObservationSyncDecision(
  match: MatchState,
  observation: ProviderObservationState,
): ProviderSyncDecision {
  if (match.status === "finished") {
    if (observation.status !== "finished") return "skip";
    return providerSnapshotMatches(match, observation) ? "skip" : "apply";
  }

  if (isStatusRegression(match.providerStatus, observation.status)) return "regression";

  return providerSnapshotMatches(match, observation) ? "skip" : "apply";
}

function providerSnapshotMatches(match: MatchState, observation: ProviderObservationState) {
  return (
    match.providerStatus === observation.status &&
    match.liveHomeScore === observation.homeScore &&
    match.liveAwayScore === observation.awayScore
  );
}

function isStatusRegression(current: string | null, incoming: ProviderStatus) {
  const order: Record<string, number> = { scheduled: 0, live: 1, finished: 2 };
  return current !== null && (order[incoming] ?? 0) < (order[current] ?? 0);
}
