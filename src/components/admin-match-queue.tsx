"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { storeLocalResult, useLocalResults } from "@/lib/local-state";
import type { DemoMatch } from "@/lib/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminMatchQueue({ matches }: { matches: DemoMatch[] }) {
  const results = useLocalResults();
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="divide-y">
      {matches.map((match) => {
        const effectiveResult = results[match.id] ?? match.result;
        return (
          <div
            key={match.id}
            data-testid={`admin-match-${match.id}`}
            className="p-5 md:px-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  {match.stageLabel} • {match.dateLabel}
                </p>
                <p className="mt-1 font-bold">
                  {match.homeTeam.flag} {match.homeTeam.name} x {match.awayTeam.name}{" "}
                  {match.awayTeam.flag}
                </p>
                {effectiveResult && (
                  <p className="mt-1 text-sm font-bold text-brand">
                    Resultado informado: {effectiveResult.homeScore} x{" "}
                    {effectiveResult.awayScore}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveId(activeId === match.id ? null : match.id)}
                className="flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-bold text-brand"
              >
                {activeId === match.id ? (
                  <X className="size-4" />
                ) : (
                  <Check className="size-4" />
                )}
                {effectiveResult ? "Corrigir resultado" : "Informar resultado"}
              </button>
            </div>
            {activeId === match.id && (
              <ResultForm
                match={match}
                existingResult={effectiveResult}
                onSuccess={() => setActiveId(null)}
              />
            )}
          </div>
        );
      })}
      {matches.length === 0 && (
        <p className="p-6 text-center text-sm text-muted">
          Nenhuma partida disponível. Importe a agenda oficial primeiro.
        </p>
      )}
    </div>
  );
}

function ResultForm({
  match,
  existingResult,
  onSuccess,
}: {
  match: DemoMatch;
  existingResult?: DemoMatch["result"];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(
    existingResult ? String(existingResult.homeScore) : "",
  );
  const [awayScore, setAwayScore] = useState(
    existingResult ? String(existingResult.awayScore) : "",
  );
  const [advancingTeamId, setAdvancingTeamId] = useState(
    existingResult?.advancingTeamId ?? "",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        advancingTeamId: advancingTeamId || null,
        finalizedAt: new Date().toISOString(),
      };
      const supabase = createBrowserSupabaseClient();

      if (supabase && isUuid(match.id)) {
        const { error: rpcError } = await supabase.rpc("finalize_match", {
          p_match_id: match.id,
          p_home_score: result.homeScore,
          p_away_score: result.awayScore,
          p_advancing_team_id: result.advancingTeamId,
          p_reason: reason.trim(),
        });
        if (rpcError) throw new Error(rpcError.message);
        router.refresh();
      } else {
        storeLocalResult(match.id, result);
      }

      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 flex flex-col gap-3 rounded-2xl bg-surface-muted p-4 sm:flex-row sm:items-end"
    >
      <ScoreField label={match.homeTeam.shortName} value={homeScore} onChange={setHomeScore} />
      <ScoreField label={match.awayTeam.shortName} value={awayScore} onChange={setAwayScore} />
      {match.stage !== "group" && match.stage !== "third_place" && (
        <label className="text-xs font-bold text-muted">
          Quem avançou
          <select
            required
            value={advancingTeamId}
            onChange={(event) => setAdvancingTeamId(event.target.value)}
            className="mt-1 block w-full rounded-xl border bg-white px-3 py-3 text-sm font-bold text-foreground outline-none focus:border-brand"
          >
            <option value="">Selecione</option>
            <option value={match.homeTeam.id}>{match.homeTeam.shortName}</option>
            <option value={match.awayTeam.id}>{match.awayTeam.shortName}</option>
          </select>
        </label>
      )}
      <label className="min-w-0 flex-1 text-xs font-bold text-muted">
        Motivo ou fonte
        <input
          required
          minLength={3}
          maxLength={200}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={existingResult ? "Ex.: correção oficial" : "Ex.: conferido na FIFA"}
          className="mt-1 block w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold text-foreground outline-none focus:border-brand"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {busy ? "Calculando..." : "Finalizar e pontuar"}
      </button>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
    </form>
  );
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-bold text-muted">
      {label}
      <input
        required
        type="number"
        min="0"
        max="30"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-xl border bg-white px-3 py-2.5 text-center text-base font-black text-foreground outline-none focus:border-brand sm:w-24"
      />
    </label>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
