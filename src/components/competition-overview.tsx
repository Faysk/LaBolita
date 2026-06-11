"use client";

import { useState } from "react";
import { Radio, Table2, Trophy } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { TeamFlag } from "@/components/team-flag";
import { buildGroupStandings, groupKnockoutMatches } from "@/lib/competition";
import { isLiveMatch } from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

export function CompetitionOverview({ matches }: { matches: DemoMatch[] }) {
  const [view, setView] = useState<"groups" | "knockout">("groups");
  const groups = buildGroupStandings(matches);
  const knockout = groupKnockoutMatches(matches);
  const hasLive = matches.some(isLiveMatch);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );

  return (
    <>
      <LiveRefresh active={hasLive || awaitingOfficial} />
      {(hasLive || awaitingOfficial) && (
        <div className="status-live mb-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold">
          <Radio className="size-4" />
          {hasLive
            ? "Classificação atualizada com os placares ao vivo. Valores provisórios."
            : "Há placares aguardando confirmação oficial."}
        </div>
      )}
      <div className="card mb-6 grid grid-cols-2 gap-2 p-2">
        <ViewButton active={view === "groups"} onClick={() => setView("groups")} icon={Table2}>
          Fase de grupos
        </ViewButton>
        <ViewButton active={view === "knockout"} onClick={() => setView("knockout")} icon={Trophy}>
          Eliminatórias
        </ViewButton>
      </div>

      {view === "groups" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map(([group, standings]) => (
            <section key={group} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="font-black">Grupo {group}</h2>
                {standings.some((entry) => entry.provisional) && (
                  <span className="status-live rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                    Ao vivo
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead className="bg-surface-muted/65 text-[10px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Pos.</th>
                      <th className="px-2 py-2 text-left">Seleção</th>
                      {["Pts", "J", "V", "E", "D", "GP", "GC", "SG"].map((label) => (
                        <th key={label} className="px-2 py-2 text-center">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {standings.map((entry, index) => (
                      <tr key={entry.team.id} className={index < 2 ? "bg-accent/10" : undefined}>
                        <td className="px-4 py-3 text-center font-black text-muted">{index + 1}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2 font-bold">
                            <TeamFlag team={entry.team} size="sm" />
                            <span className="max-w-36 truncate">{entry.team.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center font-black">{entry.points}</td>
                        {[entry.played, entry.wins, entry.draws, entry.losses, entry.goalsFor, entry.goalsAgainst, entry.goalDifference].map((value, valueIndex) => (
                          <td key={valueIndex} className="px-2 py-3 text-center text-muted">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="grid min-w-max grid-flow-col auto-cols-[18rem] gap-4">
            {knockout.map(([stage, stageMatches]) => (
              <section key={stage}>
                <h2 className="mb-3 text-center text-sm font-black">{stage}</h2>
                <div className="grid gap-3">
                  {stageMatches.map((match) => (
                    <article key={match.id} className="card p-4">
                      <p className="mb-3 text-xs font-bold text-muted">
                        {match.dateLabel} · {match.timeLabel}
                      </p>
                      {[match.homeTeam, match.awayTeam].map((team, index) => (
                        <div key={`${match.id}-${team.id}-${index}`} className="flex items-center gap-2 py-1.5">
                          <TeamFlag team={team} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-sm font-bold">{team.shortName}</span>
                          <span className="font-black">
                            {match.result
                              ? index === 0
                                ? match.result.homeScore
                                : match.result.awayScore
                              : match.liveResult
                                ? index === 0
                                  ? match.liveResult.homeScore
                                  : match.liveResult.awayScore
                                : "—"}
                          </span>
                        </div>
                      ))}
                      {isLiveMatch(match) && <p className="status-live mt-3 rounded-xl border px-3 py-2 text-center text-xs font-black">Ao vivo · provisório</p>}
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {knockout.length === 0 && (
              <p className="card p-6 text-sm text-muted">A chave será exibida quando as partidas eliminatórias forem importadas.</p>
            )}
          </div>
        </div>
      )}
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
  icon: typeof Trophy;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`interactive flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black ${
        active ? "bg-brand text-white" : "text-muted hover:bg-surface-muted"
      }`}
    >
      <Icon className="size-4" /> {children}
    </button>
  );
}
