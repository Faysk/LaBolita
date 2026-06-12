import type { RankingEntry } from "@/lib/types";

export function rankingPosition(
  player: RankingEntry,
  entries: RankingEntry[],
  provisional = false,
) {
  const playerScore = rankingScore(player, provisional);
  const tiedPositions = entries
    .filter((entry) => sameRankingScore(rankingScore(entry, provisional), playerScore))
    .map((entry) => basePosition(entry, provisional));

  return Math.min(basePosition(player, provisional), ...tiedPositions);
}

export function isRankingTied(
  player: RankingEntry,
  entries: RankingEntry[],
  provisional = false,
) {
  const playerScore = rankingScore(player, provisional);
  return entries.filter((entry) => sameRankingScore(rankingScore(entry, provisional), playerScore)).length > 1;
}

export function rankingLabel(
  player: RankingEntry,
  entries: RankingEntry[],
  {
    provisional = false,
    tiedSuffix = " emp.",
  }: {
    provisional?: boolean;
    tiedSuffix?: string;
  } = {},
) {
  const prefix = provisional ? "~" : "";
  const tied = isRankingTied(player, entries, provisional);
  return `${prefix}${rankingPosition(player, entries, provisional)}º${tied ? tiedSuffix : ""}`;
}

function basePosition(player: RankingEntry, provisional: boolean) {
  return provisional ? player.provisionalPosition ?? player.position : player.position;
}

function rankingScore(player: RankingEntry, provisional: boolean) {
  return {
    points: provisional ? player.provisionalPoints ?? player.points : player.points,
    exact: player.exact,
    correct: player.correct,
  };
}

function sameRankingScore(
  left: ReturnType<typeof rankingScore>,
  right: ReturnType<typeof rankingScore>,
) {
  return (
    left.points === right.points &&
    left.exact === right.exact &&
    left.correct === right.correct
  );
}
