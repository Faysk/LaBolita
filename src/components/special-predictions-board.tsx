import Link from "next/link";
import { LinkPendingLabel, LinkPendingOverlay } from "@/components/link-pending-feedback";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  LockKeyhole,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  groupSpecialMarkets,
  SPECIAL_LOCK_DATE_LABEL,
  specialMarketDisplay,
  specialMarketPath,
  specialProgress,
} from "@/lib/special-market-display";
import type { SpecialMarketView, SpecialMarketsOverview } from "@/lib/data/specials";

export function SpecialPredictionsBoard({
  overview,
}: {
  overview: SpecialMarketsOverview;
}) {
  if (!overview.available) {
    return (
      <section className="card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
            <LockKeyhole className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-black">Palpites especiais aguardando publicação</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {overview.missingReason ??
                "Assim que o banco receber a nova migration, esta área fica disponível."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const progress = specialProgress(overview.markets);
  const grouped = groupSpecialMarkets(overview.markets);
  const nextDisplay = progress.next ? specialMarketDisplay(progress.next.key) : null;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="card-dark overflow-hidden rounded-[1.8rem] p-6 text-white">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-accent">
              Extras da Copa
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/75">
              Até {SPECIAL_LOCK_DATE_LABEL}
            </span>
          </div>
          <h2 className="mt-5 max-w-xl text-3xl font-black leading-tight tracking-[-0.05em] md:text-5xl">
            Escolha craques, seleções e caminhos até a final.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
            Os palpites especiais ficam separados dos placares. Você pode completar
            aos poucos e voltar para alterar enquanto cada mercado estiver aberto.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroMiniStat label="Feitos" value={`${progress.completed}/${progress.total}`} />
            <HeroMiniStat
              label="Abertos"
              value={String(progress.openPending.length)}
            />
            <HeroMiniStat label="Prazo" value={SPECIAL_LOCK_DATE_LABEL} />
          </div>
          {nextDisplay && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-accent">
              <CalendarClock className="size-4" />
              Próximo pendente: {nextDisplay.shortTitle}
            </p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Próxima escolha</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                {nextDisplay ? nextDisplay.shortTitle : "Tudo preenchido"}
              </h2>
            </div>
            <Trophy className="size-6 text-brand" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            {nextDisplay
              ? nextDisplay.teaser
              : "Você já registrou todos os palpites especiais abertos. Ainda dá para revisar até o bloqueio."}
          </p>
          <Link
            href={progress.next ? specialMarketPath(progress.next.key) : "/especiais"}
            prefetch={false}
            className="interactive relative mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-accent px-4 text-sm font-black text-brand-strong"
          >
            <LinkPendingLabel pendingLabel="Abrindo especiais...">
              {progress.next ? "Completar agora" : "Revisar escolhas"}
              <ArrowRight className="size-4" />
            </LinkPendingLabel>
          </Link>
        </div>
      </section>

      <MarketGroup title="Jogadores" description="Artilharia, criação e prêmios individuais." markets={grouped.players} />
      <MarketGroup title="Seleções" description="Ataque mais produtivo e defesa menos vazada." markets={grouped.teams} />
      <MarketGroup title="Mata-mata" description="Campeão, vice e semifinalistas." markets={grouped.knockout} />
    </div>
  );
}

function MarketGroup({
  title,
  description,
  markets,
}: {
  title: string;
  description: string;
  markets: SpecialMarketView[];
}) {
  if (markets.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{description}</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">{title}</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {markets.map((market) => (
          <MarketCard key={market.key} market={market} />
        ))}
      </div>
    </section>
  );
}

function MarketCard({ market }: { market: SpecialMarketView }) {
  const display = specialMarketDisplay(market.key);
  const Icon = display.icon;
  const completed = market.predictions.length === market.pickCount;
  const statusLabel = market.status === "resolved"
    ? "Resolvido"
    : market.locked
      ? "Bloqueado"
      : completed
        ? "Salvo"
        : "Pendente aberto";

  return (
    <Link
      href={specialMarketPath(market.key)}
      prefetch={false}
      className="interactive card group relative flex min-h-56 flex-col overflow-hidden p-5 hover:border-brand/70"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon className="size-5" />
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black ${
            completed ? "status-success" : market.locked ? "status-neutral" : "status-warning"
          }`}
        >
          {completed ? <CheckCircle2 className="size-3" /> : <Sparkles className="size-3" />}
          {statusLabel}
        </span>
      </div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
        {display.eyebrow} · {market.exactPoints} pts
      </p>
      <h3 className="mt-1 text-2xl font-black tracking-tight">{display.shortTitle}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{display.teaser}</p>
      {completed && (
        <p className="mt-3 line-clamp-2 rounded-2xl bg-surface-muted p-3 text-xs font-bold text-muted">
          {market.predictions.map((pick) => pick.label).join(", ")}
        </p>
      )}
      <LinkPendingLabel className="mt-5 justify-start text-sm font-black text-brand" pendingLabel="Abrindo palpite...">
        Abrir palpite <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </LinkPendingLabel>
      <LinkPendingOverlay label="Abrindo palpite..." className="rounded-[inherit]" />
    </Link>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-accent">{value}</p>
    </div>
  );
}
