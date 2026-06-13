import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Sparkles } from "lucide-react";
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

  return (
    <section className="mb-7 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
      <Link
        href="/palpites"
        className="card interactive flex flex-col justify-between overflow-hidden p-5 hover:border-brand/70"
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
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-brand">
          Ver jogos abaixo <ArrowRight className="size-4" />
        </span>
      </Link>

      <div className="card overflow-hidden">
        <div className="grid gap-4 border-b bg-surface-muted/70 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="rounded-2xl bg-brand/10 p-2 text-brand">
              <Sparkles className="size-5" />
            </span>
            <span>
              <span className="block text-xl font-black">Palpites especiais</span>
              <span className="mt-1 block text-sm leading-6 text-muted">
                Artilheiro, assistências, Bola de Ouro, seleções e mata-mata.
              </span>
            </span>
          </div>
          <Link
            href="/especiais"
            className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-brand-strong"
          >
            Abrir especiais <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-2xl border bg-surface-muted p-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-muted">
              <CalendarClock className="size-4" />
              Prazo
            </p>
            <p className="mt-2 text-2xl font-black">{SPECIAL_LOCK_DATE_LABEL}</p>
            <p className="mt-1 text-xs font-bold text-muted">
              {progress.completed}/{progress.total} preenchidos
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((market) => {
              const display = specialMarketDisplay(market.key);
              const Icon = display.icon;
              const complete = market.predictions.length === market.pickCount;
              return (
                <Link
                  key={market.key}
                  href={specialMarketPath(market.key)}
                  className="interactive rounded-2xl border bg-surface-muted p-3 hover:border-brand/70"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-brand" />
                    <span className="min-w-0 flex-1 truncate text-sm font-black">
                      {display.shortTitle}
                    </span>
                    {complete && <CheckCircle2 className="size-4 text-brand" />}
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-muted">
                    {complete ? "Salvo" : "Pendente"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
