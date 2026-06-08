"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { storeLocalResult } from "@/lib/local-state";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { DemoMatch, DemoTeam } from "@/lib/types";

export function TeamAssignmentForm({
  match,
  teams,
  onSuccess,
}: {
  match: DemoMatch;
  teams: DemoTeam[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [homeTeamId, setHomeTeamId] = useState(isUuid(match.homeTeam.id) ? match.homeTeam.id : "");
  const [awayTeamId, setAwayTeamId] = useState(isUuid(match.awayTeam.id) ? match.awayTeam.id : "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (homeTeamId === awayTeamId) throw new Error("Selecione duas seleções diferentes.");
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Supabase não está configurado.");

      const { error: rpcError } = await supabase.rpc("assign_match_teams", {
        p_match_id: match.id,
        p_home_team_id: homeTeamId,
        p_away_team_id: awayTeamId,
        p_reason: reason.trim(),
      });
      if (rpcError) throw new Error(rpcError.message);

      router.refresh();
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
      className="mt-4 grid gap-3 rounded-2xl bg-surface-muted p-4 md:grid-cols-2"
    >
      <TeamSelect label="Mandante" value={homeTeamId} teams={teams} onChange={setHomeTeamId} />
      <TeamSelect label="Visitante" value={awayTeamId} teams={teams} onChange={setAwayTeamId} />
      <label className="text-xs font-bold text-muted md:col-span-2">
        Motivo ou fonte
        <input
          required
          minLength={3}
          maxLength={200}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex.: classificação oficial confirmada pela FIFA"
          className="mt-1 block w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold text-foreground outline-none focus:border-brand"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !homeTeamId || !awayTeamId || homeTeamId === awayTeamId}
        aria-busy={busy}
        className="interactive flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60 md:col-span-2"
      >
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        {busy ? "Salvando..." : "Confirmar participantes"}
      </button>
      {error && <p className="text-sm font-medium text-red-700 md:col-span-2">{error}</p>}
    </form>
  );
}

function TeamSelect({
  label,
  value,
  teams,
  onChange,
}: {
  label: string;
  value: string;
  teams: DemoTeam[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-bold text-muted">
      {label}
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-xl border bg-white px-3 py-3 text-sm font-bold text-foreground outline-none focus:border-brand"
      >
        <option value="">Selecione</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.flag} {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ResultForm({
  match,
  existingResult,
  providerResult,
  onSuccess,
}: {
  match: DemoMatch;
  existingResult?: DemoMatch["result"];
  providerResult?: DemoMatch["liveResult"];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const suggestedResult = existingResult ?? providerResult;
  const [homeScore, setHomeScore] = useState(
    suggestedResult ? String(suggestedResult.homeScore) : "",
  );
  const [awayScore, setAwayScore] = useState(
    suggestedResult ? String(suggestedResult.awayScore) : "",
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
      {match.stage !== "group" && (
        <label className="text-xs font-bold text-muted">
          {match.stage === "third_place" ? "Quem venceu" : "Quem avançou"}
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
        aria-busy={busy}
        className="interactive flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {busy && <LoaderCircle className="size-4 animate-spin" />}
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

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
