import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Sparkles } from "lucide-react";

import {
  LinkPendingLabel,
  LinkPendingOverlay,
} from "@/components/link-pending-feedback";
import {
  SPECIAL_LOCK_DATE_LABEL,
  specialMarketDisplay,
  specialMarketPath,
  specialProgress,
} from "@/lib/special-market-display";
import type { SpecialMarketsOverview } from "@/lib/data/specials";

export function SpecialPredictionsEntry({
  overview,
}: {
  overview: SpecialMarketsOverview;
}) {
  if (!overview.available) return null;

  const progress = specialProgress(overview.markets);
  const featured = overview.markets.slice(0, 5);
  const next = progress.next;
  const openPendingCount = progress.openPending.length;

  return (
    <section className="mb-7 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
      <Link
        href="#lista-de-jogos"
        prefetch={false}
        className="card interactive relative flex flex-col justify-between overflow-hidden p-5 hover:border-brand/70"
      >
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
            Placar por partida
          </span>
          <h2 className="mt-4 text-2xl font-black tracking-tight">
            Palpites dos jogos
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Continue preenchendo placares, vencedores do mata-mata e alterações
            até o bloqueio de cada partida.
          </p>
        </div>
        <LinkPendingLabel
          className="mt-5 justify-start text-sm font-black text-brand"
          pendingLabel="Indo para jogos..."
        >
          Ver jogos abaixo <ArrowRight className="size-4" />
        </LinkPendingLabel>
        <LinkPendingOverlay
          label="Indo para jogos..."
          className="rounded-[inherit]"
        />
      </Link>

      <div className="relative overflow-hidden rounded-[1.8rem] border border-brand/25 bg-gradient-to-r from-[#075f2d] via-[#16a85a] to-[#86e06f] text-white shadow-2xl shadow-brand/15">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_16%,rgba(218,255,72,0.28),transparent_30%),linear-gradient(90deg,rgba(0,0,0,0.12),transparent_45%,rgba(0,0,0,0.2))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:42px_42px]"
        />

        <div className="relative">
          <div className="grid gap-4 border-b border-white/15 bg-white/5 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <span className="rounded-2xl bg-white/15 p-2 text-accent shadow-inner shadow-white/10">
                <Sparkles className="size-5" />
              </span>
              <span>
                <span className="block text-xl font-black">
                  Palpites especiais
                </span>
                <span className="mt-1 block text-sm leading-6 text-white/80">
                  Artilheiro, assistências, Bola de Ouro, seleções e mata-mata.
                </span>
              </span>
            </div>
            <Link
              href={next ? specialMarketPath(next.key) : "/especiais"}
              prefetch={false}
              className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-[#063b22] shadow-lg shadow-accent/20"
            >
              <LinkPendingLabel pendingLabel="Abrindo especiais...">
                {next ? "Completar pendente" : "Revisar especiais"} <ArrowRight className="size-4" />
              </LinkPendingLabel>
            </Link>
          </div>

          <div className="grid gap-3 p-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-inner shadow-white/5">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/70">
                <CalendarClock className="size-4" />
                Prazo
              </p>
              <p className="mt-2 text-2xl font-black">
                {SPECIAL_LOCK_DATE_LABEL}
              </p>
              <p className="mt-1 text-xs font-bold text-white/75">
                {progress.completed}/{progress.total} preenchidos · {openPendingCount} abertos
              </p>
              {next && (
                <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-accent">
                  Próximo: {specialMarketDisplay(next.key).shortTitle}
                </p>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {featured.map((market) => {
                const display = specialMarketDisplay(market.key);
                const Icon = display.icon;
                const complete = market.predictions.length === market.pickCount;

                return (
                  <Link
                    key={market.key}
                    href={specialMarketPath(market.key)}
                    prefetch={false}
                    className="interactive relative min-h-20 overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-3 hover:border-accent/80 hover:bg-white/15"
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="size-4 text-accent" />
                      <span className="min-w-0 flex-1 text-sm font-black leading-tight">
                        {display.shortTitle}
                      </span>
                      {complete && (
                        <CheckCircle2 className="size-4 text-accent" />
                      )}
                    </div>
                    <LinkPendingLabel
                      className="mt-1 justify-start text-[11px] font-bold text-white/75"
                      pendingLabel="Abrindo..."
                    >
                      {complete ? "Salvo" : market.locked ? "Bloqueado" : "Pendente aberto"}
                    </LinkPendingLabel>
                    <LinkPendingOverlay
                      label="Abrindo..."
                      className="rounded-2xl"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
