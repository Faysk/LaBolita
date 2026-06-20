"use client";

import { useMemo, useState } from "react";
import { FinishedMatchesReview } from "@/components/prediction-board";
import { useLocalPredictions, useLocalResults } from "@/lib/local-state";
import { isLiveMatch } from "@/lib/match-display";
import {
  buildDemoMatchComparisons,
  type PredictionComparisonOverview,
} from "@/lib/prediction-comparisons";
import type { DemoMatch, MatchResult } from "@/lib/types";

export function GamesMatchExplorer({
  matches,
  comparisonOverview,
}: {
  matches: DemoMatch[];
  comparisonOverview: PredictionComparisonOverview;
}) {
  const predictions = useLocalPredictions(matches);
  const results = useLocalResults();
  const comparableMatches = useMemo(
    () =>
      matches.filter((match) =>
        isComparableMatch(match, results[match.id]),
      ),
    [matches, results],
  );
  const [selectedMatchId, setSelectedMatchId] = useState(
    () => comparableMatches[0]?.id ?? "",
  );
  const selectedMatch =
    comparableMatches.find((match) => match.id === selectedMatchId) ??
    comparableMatches[0] ??
    null;
  const selectedPrediction = selectedMatch
    ? predictions[selectedMatch.id] ?? selectedMatch.prediction ?? null
    : null;
  const selectedResult = selectedMatch
    ? results[selectedMatch.id] ?? selectedMatch.result ?? selectedMatch.liveResult ?? undefined
    : undefined;
  const comparisons = useMemo(() => {
    if (!selectedMatch) return [];
    const serverComparisons = comparisonOverview.comparisonsByMatch[selectedMatch.id] ?? [];
    if (comparisonOverview.source === "supabase") return serverComparisons;
    return buildDemoMatchComparisons({
      match: selectedMatch,
      result: selectedResult,
      currentPrediction: selectedPrediction,
    });
  }, [comparisonOverview, selectedMatch, selectedPrediction, selectedResult]);

  if (!selectedMatch || comparableMatches.length === 0) return null;

  return (
    <FinishedMatchesReview
      matches={comparableMatches}
      selectedMatch={selectedMatch}
      selectedPrediction={selectedPrediction}
      selectedResult={selectedResult}
      comparisons={comparisons}
      comparisonSource={comparisonOverview.source}
      onSelectMatch={setSelectedMatchId}
      eyebrow="Escolha um jogo"
      title="Palpites do bolão por partida"
    />
  );
}

function isComparableMatch(match: DemoMatch, localResult?: MatchResult) {
  return (
    isLiveMatch(match) ||
    match.locked ||
    Boolean(localResult ?? match.result ?? match.liveResult) ||
    match.providerStatus === "finished"
  );
}
