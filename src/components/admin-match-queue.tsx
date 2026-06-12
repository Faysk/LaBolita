"use client";

import {
  CalendarDays,
  Check,
  Layers3,
  LoaderCircle,
  Search,
  TriangleAlert,
  UserRoundCog,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TeamFlag } from "@/components/team-flag";
import { storeLocalResult, useLocalResults } from "@/lib/local-state";
import type { DemoMatch, DemoTeam } from "@/lib/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminMatchQueue({
  matches,
  teams,
}: {
  matches: DemoMatch[];
  teams: DemoTeam[];
}) {
  const results = useLocalResults();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "action" | "live" | "divergence" | "upcoming" | "finished" | "all"
  >(() =>
    matches.some((match) => match.providerStatus === "live" && !match.result)
      ? "live"
      : "action",
  );
  const [grouping, setGrouping] = useState<"stage" | "date">("date");
  const [search, setSearch] = useState("");
  const statuses = matches.map((match) => ({
    match,
    effectiveResult: results[match.id] ?? match.result,
    hasDivergence:
      Boolean(results[match.id] ?? match.result) &&
      Boolean(match.liveResult) &&
      ((results[match.id] ?? match.result)!.homeScore !== match.liveResult!.homeScore ||
        (results[match.id] ?? match.result)!.awayScore !== match.liveResult!.awayScore),
    needsTeamAssignment:
      isUuid(match.id) &&
      match.stage !== "group" &&
      (!isUuid(match.homeTeam.id) || !isUuid(match.awayTeam.id)),
  }));
  const needsAction = (item: (typeof statuses)[number]) =>
    item.needsTeamAssignment ||
    item.hasDivergence ||
    (!item.effectiveResult && item.match.providerStatus === "finished");
  const isLiveItem = (item: (typeof statuses)[number]) =>
    !item.effectiveResult && item.match.providerStatus === "live";
  const isUpcomingItem = (item: (typeof statuses)[number]) =>
    !item.effectiveResult && !isLiveItem(item) && !needsAction(item);
  const liveCount = statuses.filter(isLiveItem).length;
  const actionCount = statuses.filter(needsAction).length;
  const divergenceCount = statuses.filter((item) => item.hasDivergence).length;
  const upcomingCount = statuses.filter(isUpcomingItem).length;
  const finishedCount = statuses.filter((item) => item.effectiveResult).length;
  const cleanSearch = search.trim().toLocaleLowerCase("pt-BR");
  const visible = statuses.filter((item) => {
    const matchesSearch =
      !cleanSearch ||
      `${item.match.homeTeam.name} ${item.match.awayTeam.name} ${item.match.stageLabel}`
        .toLocaleLowerCase("pt-BR")
        .includes(cleanSearch);
    if (!matchesSearch) return false;
    if (filter === "action") return needsAction(item);
    if (filter === "live") return isLiveItem(item);
    if (filter === "divergence") return item.hasDivergence;
    if (filter === "finished") return Boolean(item.effectiveResult);
    if (filter === "upcoming") return isUpcomingItem(item);
    return true;
  });
  const grouped = groupAdminMatches(visible, grouping);

  return (
    <div>
      <div className="border-b bg-surface-muted/55 p-4 md:p-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {([
            ...(liveCount > 0
              ? [["live", "Ao vivo", liveCount] as const]
              : []),
            ["action", "Precisam de ação", actionCount],
            ["divergence", "Divergências", divergenceCount],
            ["upcoming", "Próximos", upcomingCount],
            ["finished", "Finalizados", finishedCount],
            ["all", "Todos", statuses.length],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`interactive whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black ${
                filter === value ? "bg-brand text-white" : "border bg-white text-muted"
              }`}
            >
              {label} · {count}
            </button>
          ))}
        </div>
        <label className="relative mt-2 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar seleção, grupo ou fase"
            className="w-full rounded-xl border bg-white py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-brand"
          />
        </label>
        <div className="mt-3 flex justify-end gap-2">
          <GroupingButton
            active={grouping === "date"}
            onClick={() => setGrouping("date")}
            icon={CalendarDays}
          >
            Por data
          </GroupingButton>
          <GroupingButton
            active={grouping === "stage"}
            onClick={() => setGrouping("stage")}
            icon={Layers3}
          >
            Por grupo/fase
          </GroupingButton>
        </div>
      </div>
      <div className="divide-y">
        {grouped.map(([group, items]) => (
          <section key={group}>
            <div className="sticky top-[4.25rem] z-10 flex items-center justify-between border-b bg-white/95 px-5 py-3 backdrop-blur">
              <h3 className="text-sm font-black text-brand">{group}</h3>
              <span className="text-xs font-bold text-muted">{items.length} jogos</span>
            </div>
            {items.map(({ match, effectiveResult, needsTeamAssignment }) => (
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
                <p className="mt-2 flex flex-wrap items-center gap-2 font-bold">
                  <TeamFlag team={match.homeTeam} size="sm" />
                  {match.homeTeam.name}
                  <span className="text-xs font-black text-muted">×</span>
                  <TeamFlag team={match.awayTeam} size="sm" />
                  {match.awayTeam.name}
                </p>
                {effectiveResult && (
                  <p className="mt-1 text-sm font-bold text-brand">
                    Resultado informado: {effectiveResult.homeScore} x{" "}
                    {effectiveResult.awayScore}
                  </p>
                )}
                {!effectiveResult && match.liveResult && (
                  <p className="mt-1 text-sm font-bold text-amber-700">
                    Provedor: {match.liveResult.homeScore} x {match.liveResult.awayScore}
                    {match.providerStatus === "finished"
                      ? " · aguardando confirmação"
                      : " · ao vivo"}
                  </p>
                )}
                {needsTeamAssignment && (
                  <p className="mt-1 text-sm font-bold text-amber-700">
                    Participantes ainda não definidos
                  </p>
                )}
                {effectiveResult && match.liveResult &&
                  (effectiveResult.homeScore !== match.liveResult.homeScore ||
                    effectiveResult.awayScore !== match.liveResult.awayScore) && (
                    <p className="mt-1 flex items-center gap-1 text-sm font-bold text-red-700">
                      <TriangleAlert className="size-4" />
                      Divergência com o provedor: {match.liveResult.homeScore} x{" "}
                      {match.liveResult.awayScore}
                    </p>
                  )}
              </div>
              <button
                type="button"
                onClick={() => setActiveId(activeId === match.id ? null : match.id)}
                className="interactive flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-bold text-brand"
              >
                {activeId === match.id ? (
                  <X className="size-4" />
                ) : needsTeamAssignment ? (
                  <UserRoundCog className="size-4" />
                ) : (
                  <Check className="size-4" />
                )}
                {needsTeamAssignment
                  ? "Definir participantes"
                  : effectiveResult
                  ? "Corrigir resultado"
                  : match.providerStatus === "finished"
                    ? "Confirmar resultado"
                    : "Informar resultado"}
              </button>
            </div>
            {activeId === match.id &&
              (needsTeamAssignment ? (
                <TeamAssignmentForm
                  match={match}
                  teams={teams}
                  onSuccess={() => setActiveId(null)}
                />
              ) : (
                <ResultForm
                  match={match}
                  existingResult={effectiveResult}
                  providerResult={match.liveResult}
                  onSuccess={() => setActiveId(null)}
                />
              ))}
          </div>
            ))}
          </section>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="p-6 text-center text-sm text-muted">
          Nenhuma partida encontrada neste filtro.
        </p>
      )}
    </div>
  );
}

function GroupingButton({
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

function groupAdminMatches<T extends { match: DemoMatch }>(
  items: T[],
  grouping: "stage" | "date",
) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const label = grouping === "date" ? item.match.dateLabel : item.match.stageLabel;
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return [...groups.entries()];
}

function TeamAssignmentForm({
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
      <TeamSelect
        label="Mandante"
        value={homeTeamId}
        teams={teams}
        onChange={setHomeTeamId}
      />
      <TeamSelect
        label="Visitante"
        value={awayTeamId}
        teams={teams}
        onChange={setAwayTeamId}
      />
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

function ResultForm({
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
  const scoreWinner =
    homeScore !== "" && awayScore !== "" && Number(homeScore) !== Number(awayScore)
      ? Number(homeScore) > Number(awayScore)
        ? match.homeTeam.id
        : match.awayTeam.id
      : null;
  const advancingSelectionValid =
    match.stage === "group" || !scoreWinner || advancingTeamId === scoreWinner;

  function updateScore(side: "home" | "away", value: string) {
    const nextHome = side === "home" ? value : homeScore;
    const nextAway = side === "away" ? value : awayScore;
    setHomeScore(nextHome);
    setAwayScore(nextAway);
    if (
      match.stage !== "group" &&
      nextHome !== "" &&
      nextAway !== "" &&
      Number(nextHome) !== Number(nextAway)
    ) {
      setAdvancingTeamId(
        Number(nextHome) > Number(nextAway) ? match.homeTeam.id : match.awayTeam.id,
      );
    }
  }

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
      <ScoreField label={match.homeTeam.shortName} value={homeScore} onChange={(value) => updateScore("home", value)} />
      <ScoreField label={match.awayTeam.shortName} value={awayScore} onChange={(value) => updateScore("away", value)} />
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
          <span className="mt-1.5 block max-w-52 text-[10px] font-medium leading-4">
            Placar após prorrogação, sem somar cobranças. Em empate, informe quem venceu nos pênaltis.
          </span>
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
        disabled={busy || !advancingSelectionValid}
        aria-busy={busy}
        className="interactive flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        {busy ? "Calculando..." : "Finalizar e pontuar"}
      </button>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      {!advancingSelectionValid && (
        <p className="status-danger rounded-xl border px-3 py-2 text-xs font-bold">
          O vencedor selecionado contradiz o placar informado.
        </p>
      )}
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
