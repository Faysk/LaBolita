import { demoMatches, demoRanking } from "@/lib/demo-data";
import type { MatchStage, RankingEntry } from "@/lib/types";

export type ScoreEvolutionRow = {
  participant_key: string;
  is_current_user: boolean;
  display_name: string;
  avatar_url: string | null;
  final_rank: number;
  final_total_points: number;
  final_exact_scores: number;
  final_correct_results: number;
  match_index: number;
  match_number: number;
  stage: MatchStage;
  stage_label: string;
  match_label: string;
  result_label: string;
  scheduled_at: string;
  points_in_match: number;
  total_points: number;
  exact_scores: number;
  correct_results: number;
  rank_after_match: number;
  previous_rank: number | null;
  position_delta: number;
};

export type ScoreEvolutionParticipant = {
  key: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  finalRank: number;
  finalTotalPoints: number;
  finalExactScores: number;
  finalCorrectResults: number;
  isCurrentUser: boolean;
};

export type ScoreEvolutionMatch = {
  index: number;
  number: number;
  stage: MatchStage;
  stageLabel: string;
  label: string;
  resultLabel: string;
  scheduledAt: string;
};

export type ScoreEvolutionPoint = {
  participantKey: string;
  matchIndex: number;
  matchNumber: number;
  pointsInMatch: number;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
  rankAfterMatch: number;
  previousRank: number | null;
  positionDelta: number;
};

export type ScoreEvolutionHighlight = {
  title: string;
  value: string;
  detail: string;
  tone: "up" | "down" | "neutral" | "gold";
};

export type ScoreEvolutionOverview = {
  available: boolean;
  generatedAt: string;
  participantCount: number;
  completedMatches: number;
  participants: ScoreEvolutionParticipant[];
  matches: ScoreEvolutionMatch[];
  points: ScoreEvolutionPoint[];
  highlights: ScoreEvolutionHighlight[];
};

export function buildScoreEvolutionOverview(
  rows: ScoreEvolutionRow[],
): ScoreEvolutionOverview {
  const generatedAt = new Date().toISOString();
  if (rows.length === 0) {
    return emptyScoreEvolutionOverview(generatedAt);
  }

  const participantsByKey = new Map<string, ScoreEvolutionParticipant>();
  const matchesByNumber = new Map<number, ScoreEvolutionMatch>();
  const points: ScoreEvolutionPoint[] = [];

  for (const row of rows) {
    if (!participantsByKey.has(row.participant_key)) {
      participantsByKey.set(row.participant_key, {
        key: row.participant_key,
        name: row.display_name,
        initials: initials(row.display_name),
        avatarUrl: row.avatar_url ?? undefined,
        finalRank: Number(row.final_rank),
        finalTotalPoints: Number(row.final_total_points),
        finalExactScores: Number(row.final_exact_scores),
        finalCorrectResults: Number(row.final_correct_results),
        isCurrentUser: row.is_current_user,
      });
    }

    if (!matchesByNumber.has(row.match_number)) {
      matchesByNumber.set(row.match_number, {
        index: Number(row.match_index),
        number: Number(row.match_number),
        stage: row.stage,
        stageLabel: row.stage_label,
        label: row.match_label,
        resultLabel: row.result_label,
        scheduledAt: row.scheduled_at,
      });
    }

    points.push({
      participantKey: row.participant_key,
      matchIndex: Number(row.match_index),
      matchNumber: Number(row.match_number),
      pointsInMatch: Number(row.points_in_match),
      totalPoints: Number(row.total_points),
      exactScores: Number(row.exact_scores),
      correctResults: Number(row.correct_results),
      rankAfterMatch: Number(row.rank_after_match),
      previousRank:
        row.previous_rank === null ? null : Number(row.previous_rank),
      positionDelta: Number(row.position_delta),
    });
  }

  const participants = [...participantsByKey.values()].sort(
    (left, right) =>
      left.finalRank - right.finalRank ||
      right.finalTotalPoints - left.finalTotalPoints ||
      left.name.localeCompare(right.name, "pt-BR"),
  );
  const matches = [...matchesByNumber.values()].sort(
    (left, right) => left.index - right.index,
  );

  return {
    available: participants.length > 0 && matches.length > 0,
    generatedAt,
    participantCount: participants.length,
    completedMatches: matches.length,
    participants,
    matches,
    points: points.sort(
      (left, right) =>
        left.matchIndex - right.matchIndex ||
        left.rankAfterMatch - right.rankAfterMatch,
    ),
    highlights: buildHighlights(participants, matches, points),
  };
}

export function emptyScoreEvolutionOverview(
  generatedAt = new Date().toISOString(),
): ScoreEvolutionOverview {
  return {
    available: false,
    generatedAt,
    participantCount: 0,
    completedMatches: 0,
    participants: [],
    matches: [],
    points: [],
    highlights: [],
  };
}

export function demoScoreEvolutionOverview(): ScoreEvolutionOverview {
  const participants: Array<RankingEntry & { userId: string }> = demoRanking.map((player, index) => ({
    ...player,
    userId: `demo-${index + 1}`,
  }));
  const matches = Array.from({ length: 14 }, (_, index) => {
    const source = demoMatches[index % demoMatches.length];
    return {
      index: index + 1,
      number: index + 1,
      stage: index < 9 ? "group" : index < 12 ? "round_of_32" : "round_of_16",
      stageLabel: index < 9 ? source.stageLabel : index < 12 ? "Fase de 32" : "Oitavas",
      label: `${source.homeTeam.shortName} x ${source.awayTeam.shortName}`,
      resultLabel: `${(index + 1) % 4} x ${(index + 2) % 3}`,
      scheduledAt: source.scheduledAt ?? new Date().toISOString(),
    } satisfies ScoreEvolutionMatch;
  });
  const rawPoints = buildDemoPoints(participants, matches);
  return {
    available: true,
    generatedAt: new Date().toISOString(),
    participantCount: participants.length,
    completedMatches: matches.length,
    participants: participants
      .map((player) => ({
        key: player.userId,
        name: player.name,
        initials: player.initials,
        avatarUrl: player.avatarUrl,
        finalRank: player.position,
        finalTotalPoints: player.points,
        finalExactScores: player.exact,
        finalCorrectResults: player.correct,
        isCurrentUser: Boolean(player.isCurrentUser),
      }))
      .sort((left, right) => left.finalRank - right.finalRank),
    matches,
    points: rawPoints,
    highlights: buildHighlights(
      participants.map((player) => ({
        key: player.userId,
        name: player.name,
        initials: player.initials,
        avatarUrl: player.avatarUrl,
        finalRank: player.position,
        finalTotalPoints: player.points,
        finalExactScores: player.exact,
        finalCorrectResults: player.correct,
        isCurrentUser: Boolean(player.isCurrentUser),
      })),
      matches,
      rawPoints,
    ),
  };
}

function buildDemoPoints(
  participants: Array<RankingEntry & { userId: string }>,
  matches: ScoreEvolutionMatch[],
) {
  const totals = new Map<string, number>();
  const exacts = new Map<string, number>();
  const corrects = new Map<string, number>();
  const previousRanks = new Map<string, number>();
  const points: ScoreEvolutionPoint[] = [];

  for (const match of matches) {
    const rows = participants.map((player, participantIndex) => {
      const progress = match.index / matches.length;
      const wave =
        Math.sin((match.index + participantIndex * 1.7) * 0.9) * 0.09 +
        Math.cos((match.index + participantIndex) * 0.43) * 0.05;
      const target = Math.max(
        0,
        Math.round(player.points * Math.min(1, Math.max(0, progress + wave))),
      );
      const previous = totals.get(player.userId) ?? 0;
      const totalPoints = match.index === matches.length
        ? player.points
        : Math.max(previous, Math.min(player.points, target));
      totals.set(player.userId, totalPoints);
      exacts.set(
        player.userId,
        Math.min(player.exact, Math.floor(player.exact * progress)),
      );
      corrects.set(
        player.userId,
        Math.min(player.correct, Math.floor(player.correct * progress)),
      );
      return {
        player,
        pointsInMatch: Math.max(0, totalPoints - previous),
        totalPoints,
        exactScores: exacts.get(player.userId) ?? 0,
        correctResults: corrects.get(player.userId) ?? 0,
      };
    });

    const ranked = rows
      .toSorted(
        (left, right) =>
          right.totalPoints - left.totalPoints ||
          right.exactScores - left.exactScores ||
          right.correctResults - left.correctResults ||
          left.player.name.localeCompare(right.player.name, "pt-BR"),
      )
      .map((row, index) => ({ ...row, rank: index + 1 }));

    for (const row of ranked) {
      const previousRank = previousRanks.get(row.player.userId) ?? null;
      points.push({
        participantKey: row.player.userId,
        matchIndex: match.index,
        matchNumber: match.number,
        pointsInMatch: row.pointsInMatch,
        totalPoints: row.totalPoints,
        exactScores: row.exactScores,
        correctResults: row.correctResults,
        rankAfterMatch: row.rank,
        previousRank,
        positionDelta: (previousRank ?? row.rank) - row.rank,
      });
      previousRanks.set(row.player.userId, row.rank);
    }
  }

  return points.sort(
    (left, right) =>
      left.matchIndex - right.matchIndex ||
      left.rankAfterMatch - right.rankAfterMatch,
  );
}

function buildHighlights(
  participants: ScoreEvolutionParticipant[],
  matches: ScoreEvolutionMatch[],
  points: ScoreEvolutionPoint[],
): ScoreEvolutionHighlight[] {
  if (participants.length === 0 || points.length === 0) return [];
  const participantsByKey = new Map(participants.map((player) => [player.key, player]));
  const matchesByNumber = new Map(matches.map((match) => [match.number, match]));
  const leader = participants[0];
  const runnerUp = participants[1];
  const bestMatch = points.toSorted(
    (left, right) => right.pointsInMatch - left.pointsInMatch,
  )[0];
  const biggestJump = points
    .filter((point) => point.positionDelta > 0)
    .toSorted((left, right) => right.positionDelta - left.positionDelta)[0];
  const biggestDrop = points
    .filter((point) => point.positionDelta < 0)
    .toSorted((left, right) => left.positionDelta - right.positionDelta)[0];
  const highlights: ScoreEvolutionHighlight[] = [];

  if (bestMatch) {
    const player = participantsByKey.get(bestMatch.participantKey);
    const match = matchesByNumber.get(bestMatch.matchNumber);
    highlights.push({
      title: "Melhor arrancada",
      value: player ? `${player.name} +${bestMatch.pointsInMatch}` : `+${bestMatch.pointsInMatch} pts`,
      detail: match ? `${match.label} · jogo ${match.number}` : "maior pontuação em um jogo",
      tone: "up",
    });
  }

  if (biggestJump) {
    const player = participantsByKey.get(biggestJump.participantKey);
    const match = matchesByNumber.get(biggestJump.matchNumber);
    highlights.push({
      title: "Ultrapassagem",
      value: player ? `${player.name} subiu ${biggestJump.positionDelta}` : `+${biggestJump.positionDelta} posições`,
      detail: match ? `Depois de ${match.label}` : "maior salto no ranking",
      tone: "gold",
    });
  }

  if (biggestDrop) {
    const player = participantsByKey.get(biggestDrop.participantKey);
    const match = matchesByNumber.get(biggestDrop.matchNumber);
    highlights.push({
      title: "Maior queda",
      value: player ? `${player.name} ${biggestDrop.positionDelta}` : `${biggestDrop.positionDelta} posições`,
      detail: match ? `No jogo ${match.number}` : "queda mais forte da corrida",
      tone: "down",
    });
  }

  if (leader) {
    const gap = runnerUp
      ? Math.max(0, leader.finalTotalPoints - runnerUp.finalTotalPoints)
      : 0;
    highlights.push({
      title: "Líder isolado",
      value: leader.name,
      detail: runnerUp ? `${gap} pts à frente de ${runnerUp.name}` : `${leader.finalTotalPoints} pts no topo`,
      tone: "neutral",
    });
  }

  return highlights.slice(0, 4);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
