import Link from "next/link";
import { LinkPendingLabel, LinkPendingOverlay } from "@/components/link-pending-feedback";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  groupSpecialMarkets,
  SPECIAL_LOCK_DATE_LABEL,
  SPECIAL_LOCK_RATIONALE,
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
  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-7">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="card-dark overflow-hidden rounded-[1.8rem] p-5 text-white md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-accent">
              Finais especiais
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/75">
              Até {SPECIAL_LOCK_DATE_LABEL}
            </span>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_13rem] md:items-end">
            <div>
              <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-[-0.05em] md:text-5xl">
                Seus palpites finais da Copa.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
                Aqui entram as escolhas que não são placar de jogo: artilheiro,
                assistências, prêmios individuais, seleções destaque e caminho
                do mata-mata.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                Progresso
              </p>
              <p className="mt-1 text-4xl font-black text-accent">{progressPercent}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-white/62">
                {progress.completed} de {progress.total} especiais salvos
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <HeroMiniStat label="Pendentes" value={String(progress.pending)} />
            <HeroMiniStat label="Abertos" value={String(progress.openPending.length)} />
            <HeroMiniStat label="Bloqueados" value={String(progress.lockedPending.length)} />
          </div>
        </div>

        <div className="card flex flex-col p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Próxima ação</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                {nextDisplay ? nextDisplay.shortTitle : "Tudo preenchido"}
              </h2>
            </div>
            {nextDisplay ? (
              <CalendarClock className="size-6 text-brand" />
            ) : (
              <Trophy className="size-6 text-brand" />
            )}
          </div>
          <p className="mt-3 flex-1 text-sm leading-6 text-muted">
            {nextDisplay
              ? nextDisplay.teaser
              : "Você já registrou todos os especiais abertos. Ainda dá para revisar enquanto o prazo estiver aberto."}
          </p>
          <p className="mt-4 rounded-2xl border bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
            {SPECIAL_LOCK_RATIONALE}
          </p>
          <Link
            href={progress.next ? specialMarketPath(progress.next.key) : "/especiais"}
            prefetch={false}
            className="interactive relative mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-accent px-4 text-sm font-black text-brand-strong"
          >
            <LinkPendingLabel pendingLabel="Abrindo especiais...">
              {progress.next ? "Completar agora" : "Revisar escolhas"}
              <ArrowRight className="size-4" />
            </LinkPendingLabel>
          </Link>
        </div>
      </section>

      {progress.openPending.length > 0 ? (
        <section className="rounded-[1.5rem] border bg-surface/80 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Ainda aberto</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">
                {progress.openPending.length} escolha
                {progress.openPending.length === 1 ? "" : "s"} para completar
              </h2>
            </div>
            <p className="inline-flex items-center gap-2 text-xs font-black text-muted">
              <Clock3 className="size-4 text-brand" />
              Bloqueia em {SPECIAL_LOCK_DATE_LABEL}
            </p>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {progress.openPending.map((market) => {
              const display = specialMarketDisplay(market.key);
              const Icon = display.icon;

              return (
                <Link
                  key={market.key}
                  href={specialMarketPath(market.key)}
                  prefetch={false}
                  className="interactive inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border bg-surface px-3 text-sm font-black text-brand hover:border-brand/70"
                >
                  <Icon className="size-4" />
                  {display.shortTitle}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <MarketGroup
        title="Jogadores"
        description="Artilharia, criação e prêmios individuais."
        markets={grouped.players}
      />
      <MarketGroup
        title="Seleções"
        description="Ataque mais produtivo e defesa menos vazada."
        markets={grouped.teams}
      />
      <MarketGroup
        title="Mata-mata"
        description="Campeão, vice e semifinalistas."
        markets={grouped.knockout}
      />
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
  const selectedLabel = market.predictions.map((pick) => pick.label).join(", ");
  const statusLabel = market.status === "resolved"
    ? "Resolvido"
    : market.locked
      ? "Bloqueado"
      : completed
        ? "Salvo"
        : "Pendente aberto";
  const statusClass = completed
    ? "status-success"
    : market.locked
      ? "status-neutral"
      : "status-warning";

  return (
    <Link
      href={specialMarketPath(market.key)}
      prefetch={false}
      className="interactive card group relative flex min-h-64 flex-col overflow-hidden p-5 hover:border-brand/70"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon className="size-5" />
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black ${statusClass}`}
        >
          {completed ? <CheckCircle2 className="size-3" /> : <Sparkles className="size-3" />}
          {statusLabel}
        </span>
      </div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
        {display.eyebrow} · {market.exactPoints} pts
      </p>
      <h3 className="mt-1 text-2xl font-black tracking-tight">{display.shortTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{display.teaser}</p>
      <div className="mt-4 grid gap-2">
        <MarketValue
          label={display.pickLabel}
          value={
            completed
              ? selectedLabel
              : `${market.pickCount - market.predictions.length} escolha${
                  market.pickCount - market.predictions.length === 1 ? "" : "s"
                } pendente${market.pickCount - market.predictions.length === 1 ? "" : "s"}`
          }
          active={completed}
        />
        <MarketValue label="Pontuação" value={market.scoringNote || `${market.exactPoints} pts`} />
      </div>
      <LinkPendingLabel className="mt-auto pt-5 justify-start text-sm font-black text-brand" pendingLabel="Abrindo palpite...">
        {completed ? "Revisar carta" : "Escolher carta"}
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </LinkPendingLabel>
      <LinkPendingOverlay label="Abrindo palpite..." className="rounded-[inherit]" />
    </Link>
  );
}

function MarketValue({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-3 ${active ? "bg-success-bg text-success-fg" : "bg-surface-muted"}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-black leading-tight">{value}</p>
    </div>
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
