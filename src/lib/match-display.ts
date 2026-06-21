import type { DemoMatch } from "@/lib/types";

export type PredictionFilter =
  | "live"
  | "pending"
  | "all"
  | "saved"
  | "group"
  | "knockout"
  | "locked";

export function isLiveMatch(match: DemoMatch) {
  return match.providerStatus === "live" && !match.result;
}

export function isOpenMatch(match: DemoMatch) {
  return !match.locked && !match.result;
}

export function isHomeTimelineMatch(match: DemoMatch) {
  return isLiveMatch(match) || isOpenMatch(match);
}

export function hasSavedPrediction(match: DemoMatch) {
  return Boolean(match.prediction);
}

export function initialPredictionFilter(matches: DemoMatch[]): PredictionFilter {
  if (matches.some(isLiveMatch)) return "live";
  if (matches.some((match) => isOpenMatch(match) && !hasSavedPrediction(match))) {
    return "pending";
  }
  return "all";
}

export function prioritizeHomeMatches(matches: DemoMatch[]) {
  return [...matches].sort((left, right) => {
    const priorityDifference = homePriority(left) - homePriority(right);
    if (priorityDifference !== 0) return priorityDifference;
    return scheduledTime(left) - scheduledTime(right);
  });
}

export function selectHomeTimelineMatches(matches: DemoMatch[], limit = 3) {
  return prioritizeHomeMatches(matches).filter(isHomeTimelineMatch).slice(0, limit);
}

export function selectLiveOrNextMatch(matches: DemoMatch[]) {
  return (
    prioritizeHomeMatches(matches).find(
      (match) => isLiveMatch(match) || (!match.result && match.providerStatus !== "finished"),
    ) ?? null
  );
}

function homePriority(match: DemoMatch) {
  if (isLiveMatch(match)) return 0;
  if (!match.result && match.providerStatus !== "finished") return 1;
  if (!match.result) return 2;
  return 3;
}

function scheduledTime(match: DemoMatch) {
  const value = match.scheduledAt ? new Date(match.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}
