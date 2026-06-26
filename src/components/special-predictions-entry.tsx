import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Sparkles } from "lucide-react";

import {
  LinkPendingLabel,
  LinkPendingOverlay,
} from "@/components/link-pending-feedback";
import { ProgressiveList } from "@/components/progressive-list";
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
  const next = progress.next;
  const openPendingCount = progress.openPending.length;

  return (
    <section className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(20rem,1.15fr)]">
      <Link
        href="#lista-de-jogos"
        prefetch={false}
        className="card interactive relative flex items-center justify-between gap-3 overflow-hidden p-3 hover:border-brand/70"
      >
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
            Placar por partida
          </span>
          <h2 className="mt-2 text-lg font-black tracking-tight">
            Palpites dos jogos
          </h2>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-muted">
            Placar, vencedor do mata-mata e revisões até o bloqueio.
          </p>
        </div>
        <LinkPendingLabel
          className="shrink-0 justify-start text-sm font-black text-brand"
          pendingLabel="Indo para jogos..."
        >
          Ver jogos <ArrowRight className="size-4" />
        </LinkPendingLabel>
        <LinkPendingOverlay
          label="Indo para jogos..."
          className="rounded-[inherit]"
        />
      </Link>

      <div className="card overflow-hidden p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-2xl bg-brand/10 p-2 text-brand">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight">Palpites finais</h2>
              <p className="mt-0.5 truncate text-xs font-bold text-muted">
                {progress.completed}/{progress.total} preenchidos · {openPendingCount} abertos · prazo {SPECIAL_LOCK_DATE_LABEL}
              </p>
            </div>
          </div>
          <Link
            href={next ? specialMarketPath(next.key) : "/especiais"}
            prefetch={false}
            className="interactive inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-black text-white"
          >
            <LinkPendingLabel pendingLabel="Abrindo finais...">
              {next ? "Completar" : "Revisar"} <ArrowRight className="size-4" />
            </LinkPendingLabel>
          </Link>
        </div>
        {next ? (
          <p className="mt-2 inline-flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-black text-brand">
            <CalendarClock className="size-3.5" />
            Próximo: {specialMarketDisplay(next.key).shortTitle}
          </p>
        ) : null}
        <ProgressiveList
          initialCount={4}
          step={4}
          moreLabel="Ver mais finais"
          className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          buttonClassName="interactive mt-2 flex w-full items-center justify-center gap-2 rounded-xl border bg-surface-muted px-3 py-2 text-xs font-black text-brand hover:border-brand/60"
        >
          {overview.markets.map((market) => {
            const display = specialMarketDisplay(market.key);
            const Icon = display.icon;
            const complete = market.predictions.length === market.pickCount;

            return (
              <Link
                key={market.key}
                href={specialMarketPath(market.key)}
                prefetch={false}
                className="interactive relative min-h-14 overflow-hidden rounded-xl border bg-surface-muted p-2.5 hover:border-brand/70"
              >
                <div className="flex items-start gap-2">
                  <Icon className="size-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1 truncate text-xs font-black leading-tight">
                    {display.shortTitle}
                  </span>
                  {complete ? <CheckCircle2 className="size-4 shrink-0 text-brand" /> : null}
                </div>
                <LinkPendingLabel
                  className="mt-1 justify-start text-[10px] font-bold text-muted"
                  pendingLabel="Abrindo..."
                >
                  {complete ? "Salvo" : market.locked ? "Bloqueado" : "Aberto"}
                </LinkPendingLabel>
                <LinkPendingOverlay label="Abrindo..." className="rounded-xl" />
              </Link>
            );
          })}
        </ProgressiveList>
      </div>
    </section>
  );
}
