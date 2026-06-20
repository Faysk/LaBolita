import Link from "next/link";
import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { LinkPendingLabel } from "@/components/link-pending-feedback";
import {
  SPECIAL_LOCK_DATE_LABEL,
  specialMarketDisplay,
  specialMarketPath,
  specialProgress,
} from "@/lib/special-market-display";
import type { SpecialMarketsOverview } from "@/lib/data/specials";

export function SpecialHomeSummary({
  overview,
  isAuthenticated,
}: {
  overview: SpecialMarketsOverview | null;
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    return (
      <section className="mt-7 card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="rounded-2xl bg-brand/10 p-2 text-brand">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Palpites finais</p>
              <h2 className="mt-1 text-xl font-black">Especiais da Copa</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Entre para cravar artilheiro, campeão, Bola de Ouro e seleções destaque.
              </p>
            </div>
          </div>
          <Link
            href="/entrar?next=%2Fespeciais"
            prefetch={false}
            className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-brand-strong"
          >
            <LinkPendingLabel pendingLabel="Abrindo login...">
              Entrar nos especiais <ArrowRight className="size-4" />
            </LinkPendingLabel>
          </Link>
        </div>
      </section>
    );
  }

  if (!overview?.available) return null;

  const progress = specialProgress(overview.markets);
  const next = progress.next;
  const openPendingCount = progress.openPending.length;

  return (
    <section className="mt-7 card overflow-hidden">
      <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-2xl bg-brand/10 p-2 text-brand">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="eyebrow">Palpites finais</p>
            <h2 className="mt-1 text-xl font-black">
              {progress.completed}/{progress.total} finais preenchidos
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Fecha em {SPECIAL_LOCK_DATE_LABEL}.{" "}
              {next
                ? `Ainda ${openPendingCount === 1 ? "falta" : "faltam"} ${openPendingCount} ${openPendingCount === 1 ? "pendente aberto" : "pendentes abertos"}. Próximo da fila: ${specialMarketDisplay(next.key).shortTitle}.`
                : "Tudo preenchido, mas ainda dá para revisar."}
            </p>
            <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${
              next ? "status-warning" : "status-success"
            }`}>
              <CalendarClock className="size-3.5" />
              {next ? "Vale resolver antes do prazo" : "Tudo em dia"}
            </p>
          </div>
        </div>
        <Link
          href={next ? specialMarketPath(next.key) : "/especiais"}
          prefetch={false}
          className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-sm font-black text-brand-strong"
        >
          <LinkPendingLabel pendingLabel="Abrindo especiais...">
            {next ? "Completar agora" : "Revisar finais"}
            <ArrowRight className="size-4" />
          </LinkPendingLabel>
        </Link>
      </div>
    </section>
  );
}
