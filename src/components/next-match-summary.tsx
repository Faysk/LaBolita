"use client";

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { useLocalResults } from "@/lib/local-state";
import type { DemoMatch } from "@/lib/types";

export function NextMatchSummary({ matches }: { matches: DemoMatch[] }) {
  const results = useLocalResults();
  const nextMatch = matches.find(
    (match) => !match.locked && !match.result && !results[match.id],
  );

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.13em] text-white/60">
          Próximo bloqueio
        </span>
        <Clock3 className="size-4 text-accent" />
      </div>
      <p className="text-3xl font-black tracking-tight">
        {nextMatch ? `${nextMatch.dateLabel} · ${nextMatch.timeLabel}` : "Em breve"}
      </p>
      <p className="mt-1 text-sm text-white/65">
        {nextMatch
          ? `${nextMatch.homeTeam.name} x ${nextMatch.awayTeam.name}`
          : "Agenda a definir"}
      </p>
      <Link
        href="/palpites"
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-extrabold text-brand-strong transition hover:brightness-95"
      >
        Completar palpites
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
