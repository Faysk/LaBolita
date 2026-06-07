"use client";

import { useState } from "react";
import { Check, Clock3, LoaderCircle, LockKeyhole, TriangleAlert } from "lucide-react";
import { calculateScore } from "@/lib/scoring";
import {
  removeLocalPrediction,
  storeLocalPrediction,
  useLocalPrediction,
  useLocalResults,
} from "@/lib/local-state";
import type { DemoMatch, ScorePrediction } from "@/lib/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type EditablePrediction = {
  homeScore: number | "";
  awayScore: number | "";
  advancingTeamId?: string | null;
};

export function MatchCard({
  match,
  compact = false,
}: {
  match: DemoMatch;
  compact?: boolean;
}) {
  const storedPrediction = useLocalPrediction(match.id);
  const localResults = useLocalResults();
  const supabase = createBrowserSupabaseClient();
  const usesSupabase = Boolean(supabase && isUuid(match.id));
  const [confirmedPrediction, setConfirmedPrediction] = useState(match.prediction ?? null);
  const [draft, setDraft] = useState<EditablePrediction | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "error">("idle");
  const currentPrediction = draft ??
    (usesSupabase ? confirmedPrediction : storedPrediction ?? match.prediction) ?? {
      homeScore: "",
      awayScore: "",
    };
  const { homeScore, awayScore } = currentPrediction;
  const result = usesSupabase ? match.result : localResults[match.id] ?? match.result;
  const effectiveLocked = match.locked || Boolean(result);
  const saved =
    draft === null &&
    Boolean(usesSupabase ? confirmedPrediction : storedPrediction ?? match.prediction);
  const requiresAdvancingTeam =
    match.stage !== "group" && match.stage !== "third_place";
  const score =
    result && isCompletePrediction(currentPrediction)
      ? calculateScore(currentPrediction, result, match.stage)
      : null;

  function updatePrediction(side: "home" | "away", rawValue: string) {
    const parsedValue = Number(rawValue);
    const value =
      rawValue === "" || !Number.isFinite(parsedValue)
        ? ""
        : Math.max(0, Math.min(30, Math.trunc(parsedValue)));
    const next = {
      ...currentPrediction,
      homeScore: side === "home" ? value : homeScore,
      awayScore: side === "away" ? value : awayScore,
    };
    void persistOrDraft(next);
  }

  function updateAdvancingTeam(advancingTeamId: string) {
    void persistOrDraft({
      ...currentPrediction,
      advancingTeamId: advancingTeamId || null,
    });
  }

  async function persistOrDraft(next: EditablePrediction) {
    const complete =
      next.homeScore !== "" &&
      next.awayScore !== "" &&
      (!requiresAdvancingTeam || Boolean(next.advancingTeamId));

    if (!complete) {
      setDraft(next);
      setSyncState("idle");
      return;
    }

    if (!usesSupabase || !supabase) {
      storeLocalPrediction(match.id, next as ScorePrediction);
      setDraft(null);
      setSyncState("idle");
      return;
    }

    setDraft(next);
    setSyncState("saving");
    const { error } = await supabase.rpc("save_prediction", {
      p_match_id: match.id,
      p_home_score: next.homeScore,
      p_away_score: next.awayScore,
      p_advancing_team_id: next.advancingTeamId ?? null,
    });

    if (error) {
      removeLocalPrediction(match.id);
      setSyncState("error");
      return;
    }

    removeLocalPrediction(match.id);
    setConfirmedPrediction(next as ScorePrediction);
    setDraft(null);
    setSyncState("idle");
  }

  return (
    <article
      data-testid={`match-${match.id}`}
      className={`card p-5 ${effectiveLocked ? "opacity-80" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand">
            {match.stageLabel}
          </p>
          <p className="mt-1 text-xs font-medium text-muted">
            {match.dateLabel} • {match.timeLabel}
          </p>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
            effectiveLocked
              ? "bg-surface-muted text-muted"
              : syncState === "error"
                ? "bg-red-50 text-red-700"
                : syncState === "saving"
                  ? "bg-blue-50 text-blue-700"
              : saved
                ? "bg-emerald-50 text-brand"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {effectiveLocked ? (
            <LockKeyhole className="size-3" />
          ) : syncState === "error" ? (
            <TriangleAlert className="size-3" />
          ) : syncState === "saving" ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : saved ? (
            <Check className="size-3" />
          ) : (
            <Clock3 className="size-3" />
          )}
          {effectiveLocked
            ? result
              ? "Finalizado"
              : "Bloqueado"
            : syncState === "error"
              ? "Erro"
              : syncState === "saving"
                ? "Salvando"
                : saved
                  ? "Salvo"
                  : "Pendente"}
        </span>
      </div>

      <div className={`mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 ${compact ? "" : "md:gap-5"}`}>
        <Team team={match.homeTeam} align="right" compact={compact} />
        <div className="flex items-center gap-2">
          <ScoreInput
            value={homeScore}
            disabled={effectiveLocked || syncState === "saving"}
            label={`Gols de ${match.homeTeam.name}`}
            onChange={(value) => updatePrediction("home", value)}
          />
          <span className="text-xs font-black text-muted">×</span>
          <ScoreInput
            value={awayScore}
            disabled={effectiveLocked || syncState === "saving"}
            label={`Gols de ${match.awayTeam.name}`}
            onChange={(value) => updatePrediction("away", value)}
          />
        </div>
        <Team team={match.awayTeam} align="left" compact={compact} />
      </div>
      {requiresAdvancingTeam && (
        <label className="mt-4 block text-xs font-bold text-muted">
          Quem avança?
          <select
            disabled={effectiveLocked || syncState === "saving"}
            value={currentPrediction.advancingTeamId ?? ""}
            onChange={(event) => updateAdvancingTeam(event.target.value)}
            className="mt-1 w-full rounded-xl border bg-surface-muted px-3 py-2.5 text-sm font-bold text-foreground outline-none focus:border-brand focus:bg-white disabled:cursor-not-allowed"
          >
            <option value="">Selecione uma seleção</option>
            <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
            <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
          </select>
        </label>
      )}
      {!compact && (
        <p className="mt-5 text-center text-xs text-muted">{match.venue}</p>
      )}
      {result && (
        <div className="mt-4 rounded-2xl bg-surface-muted p-3 text-center text-xs">
          <p className="font-black text-foreground">
            Resultado: {result.homeScore} × {result.awayScore}
          </p>
          {score && (
            <p className="mt-1 font-bold text-brand">
              Seu palpite rendeu {score.totalPoints} pontos
            </p>
          )}
        </div>
      )}
      {!result && match.liveResult && (
        <div className="mt-4 rounded-2xl border border-brand/20 bg-emerald-50 p-3 text-center text-xs">
          <p className="font-black text-foreground">
            {match.providerStatus === "finished"
              ? "Placar aguardando confirmação"
              : "Placar ao vivo"}
            : {match.liveResult.homeScore} × {match.liveResult.awayScore}
          </p>
          <p className="mt-1 font-semibold text-muted">
            O ranking só muda após confirmação administrativa.
          </p>
        </div>
      )}
      {syncState === "error" && (
        <p className="mt-3 text-center text-xs font-bold text-red-700">
          O servidor recusou o palpite. Revise e tente novamente.
        </p>
      )}
    </article>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isCompletePrediction(prediction: EditablePrediction): prediction is ScorePrediction {
  return prediction.homeScore !== "" && prediction.awayScore !== "";
}

function Team({
  team,
  align,
  compact,
}: {
  team: DemoMatch["homeTeam"];
  align: "left" | "right";
  compact: boolean;
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <span className="text-2xl" role="img" aria-label={team.name}>
        {team.flag}
      </span>
      <p className={`mt-1 truncate font-black tracking-tight ${compact ? "text-xs" : "text-sm"}`}>
        {team.shortName}
      </p>
    </div>
  );
}

function ScoreInput({
  value,
  disabled,
  label,
  onChange,
}: {
  value: number | "";
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="score-input size-11 rounded-xl border bg-surface-muted text-center text-lg font-black outline-none transition focus:border-brand focus:bg-white disabled:cursor-not-allowed md:size-12"
      type="number"
      min="0"
      max="30"
      inputMode="numeric"
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
