"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, CircleDashed, Layers3 } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { useLocalPredictions, useLocalResults } from "@/lib/local-state";
import {
  initialPredictionFilter,
  isLiveMatch,
  type PredictionFilter,
} from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

export function PredictionBoard({ matches }: { matches: DemoMatch[] }) {
  const [filter, setFilter] = useState<PredictionFilter>(() =>
    initialPredictionFilter(matches),
  );
  const [grouping, setGrouping] = useState<"stage" | "date">("date");
  const predictions = useLocalPredictions(matches);
  const results = useLocalResults();
  const isComplete = (match: DemoMatch) =>
    Boolean(match.prediction) || Boolean(predictions[match.id]);
  const openMatches = matches.filter(
    (match) => !match.locked && !match.result && !results[match.id],
  );
  const pendingMatches = openMatches.filter((match) => !isComplete(match));
  const liveMatches = matches.filter(isLiveMatch);
  const filters: [PredictionFilter, string][] = [
    ...(liveMatches.length > 0 ? [["live", "Ao vivo"] as [PredictionFilter, string]] : []),
    ["pending", "Pendentes"],
    ["all", "Todos"],
    ["saved", "Salvos"],
    ["group", "Grupos"],
    ["knockout", "Mata-mata"],
    ["locked", "Bloqueados"],
  ];

  const visibleMatches = matches.filter((match) => {
    if (filter === "live") return isLiveMatch(match);
    if (filter === "pending") {
      return (
        !isComplete(match) &&
        !match.locked &&
        !match.result &&
        !results[match.id]
      );
    }
    if (filter === "saved") return isComplete(match);
    if (filter === "group") return match.stage === "group";
    if (filter === "knockout") return match.stage !== "group";
    if (filter === "locked") {
      return match.locked || Boolean(match.result) || Boolean(results[match.id]);
    }
    return true;
  });
  const groups = groupMatches(visibleMatches, grouping);

  return (
    <>
      <section className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="card flex gap-2 overflow-x-auto p-2" aria-label="Filtros de palpites">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
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
        Revise o placar e toque em salvar. Assim nenhuma digitação parcial vira palpite.
      </div>
      <div className="mb-5 flex justify-end gap-2">
        <ViewButton active={grouping === "date"} onClick={() => setGrouping("date")} icon={CalendarDays}>
          Por data
        </ViewButton>
        <ViewButton active={grouping === "stage"} onClick={() => setGrouping("stage")} icon={Layers3}>
          Por fase
        </ViewButton>
      </div>
      <div className="grid gap-7">
        {groups.map(([label, groupedMatches]) => (
          <section key={label}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight">{label}</h2>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-muted">
                {groupedMatches.length} jogos
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {groupedMatches.map((match) => (
                <MatchCard key={match.id} match={match} isAuthenticated termsAccepted />
              ))}
            </div>
          </section>
        ))}
        {visibleMatches.length === 0 && (
          <p className="card p-6 text-sm text-muted">
            Nenhuma partida encontrada neste filtro.
          </p>
        )}
      </div>
    </>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Layers3;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`interactive flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${
        active ? "bg-brand text-white" : "bg-white text-muted"
      }`}
    >
      <Icon className="size-3.5" /> {children}
    </button>
  );
}

function groupMatches(matches: DemoMatch[], grouping: "stage" | "date") {
  const groups = new Map<string, DemoMatch[]>();
  for (const match of matches) {
    const label = grouping === "date" ? match.dateLabel : match.stageLabel;
    groups.set(label, [...(groups.get(label) ?? []), match]);
  }
  return [...groups.entries()];
}
