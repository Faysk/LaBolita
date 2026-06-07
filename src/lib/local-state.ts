"use client";

import { useSyncExternalStore } from "react";
import {
  parsePools,
  parsePrediction,
  parseResults,
  type LocalResult,
} from "@/lib/demo-engine";
import type { DemoMatch, PoolSummary, ScorePrediction } from "@/lib/types";

const RESULTS_KEY = "labolita:results";
const POOLS_KEY = "labolita:pools";
const PREDICTION_EVENT = "labolita:prediction";
const RESULTS_EVENT = "labolita:results";
const POOLS_EVENT = "labolita:pools";

export function useLocalPrediction(matchId: string) {
  const value = useSyncExternalStore(
    (onChange) => subscribe(PREDICTION_EVENT, onChange),
    () => window.localStorage.getItem(predictionKey(matchId)),
    () => null,
  );
  return parsePrediction(value);
}

export function useLocalPredictions(matches: DemoMatch[]) {
  const snapshot = useSyncExternalStore(
    (onChange) => subscribe(PREDICTION_EVENT, onChange),
    () =>
      matches
        .map((match) => `${match.id}:${window.localStorage.getItem(predictionKey(match.id)) ?? ""}`)
        .join("|"),
    () => "",
  );

  if (!snapshot) return {};

  return Object.fromEntries(
    matches.flatMap((match) => {
      const prediction = parsePrediction(window.localStorage.getItem(predictionKey(match.id)));
      return prediction ? [[match.id, prediction] as const] : [];
    }),
  );
}

export function useLocalResults() {
  const value = useSyncExternalStore(
    (onChange) => subscribe(RESULTS_EVENT, onChange),
    () => window.localStorage.getItem(RESULTS_KEY),
    () => null,
  );
  return parseResults(value);
}

export function useLocalPools() {
  const value = useSyncExternalStore(
    (onChange) => subscribe(POOLS_EVENT, onChange),
    () => window.localStorage.getItem(POOLS_KEY),
    () => null,
  );
  return parsePools(value);
}

export function storeLocalPrediction(matchId: string, prediction: ScorePrediction) {
  window.localStorage.setItem(predictionKey(matchId), JSON.stringify(prediction));
  window.dispatchEvent(new Event(PREDICTION_EVENT));
}

export function removeLocalPrediction(matchId: string) {
  window.localStorage.removeItem(predictionKey(matchId));
  window.dispatchEvent(new Event(PREDICTION_EVENT));
}

export function storeLocalResult(matchId: string, result: LocalResult) {
  const results = parseResults(window.localStorage.getItem(RESULTS_KEY));
  window.localStorage.setItem(RESULTS_KEY, JSON.stringify({ ...results, [matchId]: result }));
  window.dispatchEvent(new Event(RESULTS_EVENT));
}

export function storeLocalPool(pool: PoolSummary) {
  const pools = parsePools(window.localStorage.getItem(POOLS_KEY));
  window.localStorage.setItem(
    POOLS_KEY,
    JSON.stringify([...pools.filter((item) => item.id !== pool.id), pool]),
  );
  window.dispatchEvent(new Event(POOLS_EVENT));
}

function predictionKey(matchId: string) {
  return `prediction:${matchId}`;
}

function subscribe(eventName: string, onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(eventName, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(eventName, onChange);
  };
}
