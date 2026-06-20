import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Radio } from "lucide-react";
import { LiveRefresh } from "@/components/live-refresh";
import { MatchTimeline } from "@/components/match-timeline";
import { getMatches } from "@/lib/data/matches";
import { isLiveMatch, selectHomeTimelineMatches } from "@/lib/match-display";
import type { DemoMatch } from "@/lib/types";

export const metadata: Metadata = {
  title: "Jogos da Copa",
  description: "Agenda compacta dos jogos, placares ao vivo e partidas encerradas.",
};

export default async function GamesPage() {
  const matches = await getMatches();
  const liveMatches = matches.filter(isLiveMatch);
  const nextMatches = selectHomeTimelineMatches(matches, 6);
  const awaitingOfficial = matches.some(
    (match) => match.providerStatus === "finished" && !match.result,
  );
  const groups = groupMatchesByDate(matches);

  return (
    <main className="page-container py-7 md:py-10">
      <LiveRefresh active={liveMatches.length > 0 || awaitingOfficial} />
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Linha do tempo</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Jogos da Copa
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Veja o que já passou, o que está ao vivo e os próximos horários em
            uma agenda compacta.
          </p>
        </div>
        <Link
          href="/palpites"
          className="interactive inline-flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-brand"
        >
          Meus palpites <ArrowRight className="size-4" />
        </Link>
      </div>

      <section className="rounded-2xl border bg-surface p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">
              {liveMatches.length > 0 ? "Acontecendo agora" : "Próximos da fila"}
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight">
              {liveMatches.length > 0 ? "Ao vivo" : "Agora e depois"}
            </h2>
          </div>
          {liveMatches.length > 0 ? (
            <Radio className="size-5 animate-pulse text-emerald-600" />
          ) : (
            <CalendarDays className="size-5 text-brand" />
          )}
        </div>
        <MatchTimeline
          matches={liveMatches.length > 0 ? liveMatches : nextMatches.slice(0, 3)}
          variant="rail"
        />
      </section>

      <section className="mt-8 space-y-6">
        <div>
          <p className="eyebrow">Todos os horários</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Agenda completa</h2>
        </div>
        {groups.map(([date, groupMatches]) => (
          <section key={date} className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-5">
            <div className="md:pt-4">
              <h3 className="sticky top-24 rounded-2xl bg-surface-muted px-4 py-3 text-sm font-black text-brand">
                {date}
              </h3>
            </div>
            <MatchTimeline matches={groupMatches} />
          </section>
        ))}
      </section>
    </main>
  );
}

function groupMatchesByDate(matches: DemoMatch[]) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  });
  const groups = new Map<string, DemoMatch[]>();

  for (const match of matches) {
    const date = match.scheduledAt
      ? formatter.format(new Date(match.scheduledAt)).replace(".", "")
      : match.dateLabel;
    groups.set(date, [...(groups.get(date) ?? []), match]);
  }

  return [...groups.entries()];
}
