"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { useLocalPredictions, useLocalResults } from "@/lib/local-state";
import type { DemoMatch } from "@/lib/types";

const filters = [
  ["all", "Todos"],
  ["pending", "Pendentes"],
  ["group", "Grupos"],
] as const;

export function PredictionBoard({ matches }: { matches: DemoMatch[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const predictions = useLocalPredictions(matches);
  const results = useLocalResults();
  const isComplete = (match: DemoMatch) =>
    Boolean(match.prediction) || Boolean(predictions[match.id]);
  const openMatches = matches.filter(
    (match) => !match.locked && !match.result && !results[match.id],
  );
  const pendingMatches = openMatches.filter((match) => !isComplete(match));

  const visibleMatches = matches.filter((match) => {
    if (filter === "pending") {
      return (
        !isComplete(match) &&
        !match.locked &&
        !match.result &&
        !results[match.id]
      );
    }
    if (filter === "group") return match.stage === "group";
    return true;
  });

  return (
    <>
      <section className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="card flex gap-2 overflow-x-auto p-2">
          {filters.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${
                filter === value ? "bg-brand text-white" : "text-muted hover:bg-surface-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="card flex items-center gap-3 px-4 py-3 text-sm">
          <CircleDashed className="size-4 text-amber-600" />
          <span className="font-bold">{pendingMatches.length} pendentes</span>
          <span className="text-muted">de {openMatches.length} abertos</span>
        </div>
      </section>

      <div className="mb-4 flex items-center gap-2 text-xs font-bold text-muted">
        <CheckCircle2 className="size-4 text-brand" />
        Os palpites preenchidos são salvos automaticamente.
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        {visibleMatches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
        {visibleMatches.length === 0 && (
          <p className="card p-6 text-sm text-muted md:col-span-2">
            Nenhuma partida encontrada neste filtro.
          </p>
        )}
      </section>
    </>
  );
}
