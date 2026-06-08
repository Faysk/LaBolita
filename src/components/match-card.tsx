"use client";

import { useState } from "react";
import {
  Check,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  Save,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateScore } from "@/lib/scoring";
import { TeamFlag } from "@/components/team-flag";
import {
  removeLocalPrediction,
  storeLocalPrediction,
  useLocalPrediction,
  useLocalResults,
} from "@/lib/local-state";
import type { DemoMatch, ScorePrediction } from "@/lib/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { friendlyServerError } from "@/lib/user-errors";
import { LocalMatchDateTime } from "@/components/local-match-date-time";

type EditablePrediction = {
  homeScore: number | "";
  awayScore: number | "";
  advancingTeamId?: string | null;
};

export function MatchCard({
  match,
  compact = false,
  isAuthenticated = true,
  termsAccepted = true,
}: {
  match: DemoMatch;
  compact?: boolean;
  isAuthenticated?: boolean;
  termsAccepted?: boolean;
}) {
  const router = useRouter();
  const storedPrediction = useLocalPrediction(match.id);
  const localResults = useLocalResults();
  const supabase = createBrowserSupabaseClient();
  const usesSupabase = Boolean(supabase && isUuid(match.id));
  const [confirmedPrediction, setConfirmedPrediction] = useState(match.prediction ?? null);
  const [draft, setDraft] = useState<EditablePrediction | null>(null);
  const [syncState, setSyncState] = useState<
    "idle" | "saving" | "error" | "auth-required" | "terms-required"
  >("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const persistedPrediction = usesSupabase
    ? confirmedPrediction
    : storedPrediction ?? match.prediction;
  const currentPrediction = draft ?? persistedPrediction ?? {
      homeScore: "",
      awayScore: "",
    };
  const { homeScore, awayScore } = currentPrediction;
  const result = usesSupabase ? match.result : localResults[match.id] ?? match.result;
  const effectiveLocked = match.locked || Boolean(result);
  const saved =
    draft === null &&
    Boolean(persistedPrediction);
  const dirty = draft !== null;
  const requiresAdvancingTeam =
    match.stage !== "group";
  const complete =
    isCompletePrediction(currentPrediction) &&
    (!requiresAdvancingTeam || Boolean(currentPrediction.advancingTeamId));
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
    setDraft(next);
    setSyncState("idle");
    setSyncMessage(null);
  }

  function updateAdvancingTeam(advancingTeamId: string) {
    setDraft({
      ...currentPrediction,
      advancingTeamId: advancingTeamId || null,
    });
    setSyncState("idle");
    setSyncMessage(null);
  }

  function discardChanges() {
    setDraft(null);
    setSyncState("idle");
    setSyncMessage(null);
  }

  async function savePrediction() {
    const next = draft ?? currentPrediction;
    if (
      !isCompletePrediction(next) ||
      (requiresAdvancingTeam && !next.advancingTeamId)
    ) {
      return;
    }

    if (!usesSupabase || !supabase) {
      storeLocalPrediction(match.id, next);
      setDraft(null);
      setSyncState("idle");
      setSyncMessage(null);
      navigator.vibrate?.(20);
      return;
    }

    if (!isAuthenticated) {
      setDraft(next);
      setSyncState("auth-required");
      setSyncMessage("Entre na sua conta para salvar este palpite.");
      navigator.vibrate?.([25, 30, 25]);
      return;
    }

    if (!termsAccepted) {
      setDraft(next);
      setSyncState("terms-required");
      setSyncMessage("Aceite os Termos de Serviço para salvar este palpite.");
      navigator.vibrate?.([25, 30, 25]);
      return;
    }

    setSyncState("saving");
    setSyncMessage(null);
    const { error } = await supabase.rpc("save_prediction", {
      p_match_id: match.id,
      p_home_score: next.homeScore,
      p_away_score: next.awayScore,
      p_advancing_team_id: next.advancingTeamId ?? null,
    });

    if (error) {
      removeLocalPrediction(match.id);
      setSyncState("error");
      setSyncMessage(
        friendlyServerError(error, "Não foi possível salvar o palpite. Revise e tente novamente."),
      );
      navigator.vibrate?.([25, 30, 25]);
      return;
    }

    removeLocalPrediction(match.id);
    setConfirmedPrediction(next);
    setDraft(null);
    setSyncState("idle");
    setSyncMessage(null);
    navigator.vibrate?.(20);
    router.refresh();
  }

  return (
    <article
      data-testid={`match-${match.id}`}
      className={`card match-card p-5 ${effectiveLocked ? "opacity-80" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand">
            {match.stageLabel}
          </p>
          <LocalMatchDateTime
            scheduledAt={match.scheduledAt}
            fallbackDate={match.dateLabel}
            fallbackTime={match.timeLabel}
            includeZone
            className="mt-1 block text-xs font-medium text-muted"
          />
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
            effectiveLocked
              ? "bg-surface-muted text-muted"
              : syncState === "error" || syncState === "auth-required" || syncState === "terms-required"
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
          ) : syncState === "error" || syncState === "auth-required" || syncState === "terms-required" ? (
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
            : syncState === "auth-required"
              ? "Entre para salvar"
              : syncState === "terms-required"
                ? "Aceite necessário"
                : syncState === "error"
                  ? "Erro"
              : syncState === "saving"
                ? "Salvando"
                : saved
                  ? "Salvo"
                  : dirty
                    ? "Não salvo"
                    : "Pendente"}
        </span>
      </div>

      <div className={`mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border bg-surface-muted/65 px-2 py-4 ${compact ? "" : "md:gap-5 md:px-4"}`}>
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
          {match.stage === "third_place" ? "Quem vence?" : "Quem avança?"}
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
      {!effectiveLocked && (
        <div className="mt-4 flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={discardChanges}
              disabled={syncState === "saving"}
              className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-3 text-xs font-extrabold text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Undo2 className="size-3.5" />
              Descartar
            </button>
          )}
          <button
            type="button"
            onClick={savePrediction}
            disabled={!dirty || !complete || syncState === "saving"}
            className="interactive inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-extrabold text-white shadow-lg shadow-brand/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:shadow-none"
          >
            {syncState === "saving" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {persistedPrediction ? "Salvar alterações" : "Salvar palpite"}
          </button>
        </div>
      )}
      {!compact && (
        <p className="mt-5 text-center text-xs text-muted">{match.venue}</p>
      )}
      {result && (
        <div className="mt-4 rounded-2xl bg-surface-muted p-3 text-center text-xs">
          <p className="font-black text-foreground">
            Resultado: {result.homeScore} × {result.awayScore}
          </p>
          {match.stage !== "group" && result.advancingTeamId && (
            <p className="mt-1 font-bold text-muted">
              {match.stage === "third_place" ? "Vencedor" : "Classificado"}:{" "}
              {result.advancingTeamId === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name}
              {result.homeScore === result.awayScore ? " (decidido nos pênaltis)" : ""}
            </p>
          )}
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
      {syncMessage && (
        <p aria-live="polite" className="mt-3 text-center text-xs font-bold text-red-700">
          {syncMessage}{" "}
          {syncState === "auth-required" && (
            <Link href="/entrar?next=%2Fpalpites" className="underline">
              Entrar agora
            </Link>
          )}
          {syncState === "terms-required" && (
            <Link href="/aceitar-termos?next=%2Fpalpites" className="underline">
              Aceitar agora
            </Link>
          )}
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
    <div className={`flex min-w-0 flex-col items-center ${align === "right" ? "md:items-end md:text-right" : "md:items-start md:text-left"}`}>
      <TeamFlag team={team} size={compact ? "md" : "lg"} />
      <p className={`mt-2 max-w-full truncate text-center font-black tracking-tight ${compact ? "text-xs" : "text-sm"}`}>
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
