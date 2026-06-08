"use client";

import { Check, Copy, Globe2, LoaderCircle, Plus, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { CountryFlag } from "@/components/country-flag";
import { UserAvatar } from "@/components/user-avatar";
import type { PoolSummary, RankingEntry } from "@/lib/types";

export function PoolSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export function PoolCard({
  pool,
  selected,
  copied,
  onCopy,
  onSelect,
  onManage,
}: {
  pool: PoolSummary;
  selected: boolean;
  copied: boolean;
  onCopy: () => void;
  onSelect: () => void;
  onManage?: () => void;
}) {
  return (
    <article data-testid={`pool-${pool.id}`} className={`card p-5 ${selected ? "card-dark text-white" : ""}`}>
      <div className="flex items-start justify-between">
        <CountryFlag code={pool.flagCode} />
        <div className="flex items-center gap-2">
          {pool.isPublic && <Globe2 className="size-4 opacity-60" aria-label="Bolão público" />}
          {onManage && (
            <button type="button" aria-label={`Gerenciar ${pool.name}`} onClick={onManage} className="interactive rounded-xl p-2">
              <Settings2 className="size-4" />
            </button>
          )}
        </div>
      </div>
      <h3 className="mt-6 text-xl font-black tracking-tight">{pool.name}</h3>
      <p className={`mt-2 flex items-center gap-1 text-sm ${selected ? "text-white/60" : "text-muted"}`}>
        <Users className="size-4" /> {pool.members} jogadores
      </p>
      {pool.code && (
        <div className={`mt-5 flex items-center justify-between rounded-2xl p-3 ${selected ? "bg-white/10" : "bg-surface-muted"}`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-55">Código</p>
            <p className="mt-0.5 font-mono text-sm font-bold">{pool.code}</p>
          </div>
          <button type="button" aria-label={`Copiar código ${pool.code}`} onClick={onCopy} className="interactive rounded-xl p-2">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
      )}
      <button type="button" onClick={onSelect} className={`interactive mt-3 w-full rounded-xl px-3 py-2 text-xs font-black ${selected ? "bg-accent text-brand-strong" : "bg-surface-muted text-brand"}`}>
        {selected ? "Ranking selecionado" : "Ver ranking"}
      </button>
    </article>
  );
}

export function PublicPoolCard({
  pool,
  selected,
  joining,
  onSelect,
  onJoin,
}: {
  pool: PoolSummary;
  selected: boolean;
  joining: boolean;
  onSelect: () => void;
  onJoin: () => void;
}) {
  return (
    <article className={`card p-5 ${selected ? "ring-2 ring-brand" : ""}`}>
      <div className="flex items-center justify-between">
        <CountryFlag code={pool.flagCode} />
        <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-black text-brand-strong">Público</span>
      </div>
      <h3 className="mt-5 text-xl font-black tracking-tight">{pool.name}</h3>
      <p className="mt-2 text-sm text-muted">Por {pool.ownerName ?? "organizador"} · {pool.members} jogadores</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onSelect} className="interactive rounded-xl bg-surface-muted px-3 py-2 text-xs font-black text-brand">
          Ver ranking
        </button>
        <button type="button" disabled={joining || pool.isMember} aria-busy={joining} onClick={onJoin} className="interactive flex items-center justify-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-black text-white disabled:opacity-60">
          {joining ? <LoaderCircle className="size-3 animate-spin" /> : pool.isMember ? <Check className="size-3" /> : <Plus className="size-3" />}
          {joining ? "Entrando..." : pool.isMember ? "Participando" : "Participar"}
        </button>
      </div>
    </article>
  );
}

export function EmptyCard({ text }: { text: string }) {
  return <p className="card p-6 text-sm text-muted md:col-span-2 lg:col-span-3">{text}</p>;
}

export function PaginationLink({
  page,
  disabled,
  search,
  children,
}: {
  page: number;
  disabled: boolean;
  search: string;
  children: React.ReactNode;
}) {
  const href = `/boloes?pagina=${page}${search ? `&busca=${encodeURIComponent(search)}` : ""}`;
  return disabled ? (
    <span className="rounded-xl border px-4 py-2 text-muted opacity-40">{children}</span>
  ) : (
    <Link className="interactive rounded-xl border bg-white px-4 py-2 text-brand" href={href}>{children}</Link>
  );
}

export function Ranking({
  entries,
  name,
  memberCount,
  loading,
}: {
  entries: RankingEntry[];
  name: string;
  memberCount: number;
  loading: boolean;
}) {
  return (
    <section data-testid="pool-ranking" className="card mt-8 overflow-hidden">
      <div className="flex items-center justify-between border-b p-5 md:p-6">
        <div><p className="eyebrow">{name}</p><h2 className="mt-1 text-2xl font-black tracking-tight">Classificação</h2></div>
        <div className="rounded-2xl bg-accent px-3 py-2 text-xs font-black text-brand-strong">{memberCount} jogadores</div>
      </div>
      <div className="divide-y">
        {loading && Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-3 px-5 py-4"><span className="skeleton size-10 rounded-full" /><span className="skeleton h-4 flex-1 rounded-xl" /><span className="skeleton h-4 w-16 rounded-xl" /></div>)}
        {!loading && entries.map((player) => (
          <div key={`${player.position}-${player.name}`} data-testid={player.isCurrentUser ? "ranking-current-user" : undefined} className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-4 md:grid-cols-[3rem_1fr_6rem_6rem_6rem] md:px-6 ${player.isCurrentUser ? "bg-accent/20" : ""}`}>
            <span className="text-center text-sm font-black text-muted">{player.position}</span>
            <div className="flex min-w-0 items-center gap-3"><UserAvatar name={player.name} initials={player.initials} avatarUrl={player.avatarUrl} /><div className="min-w-0"><p className="truncate text-sm font-bold">{player.name}</p><p className="text-xs text-muted md:hidden">{player.exact} cravadas</p></div></div>
            <span className="text-right text-sm font-black text-brand">{player.points} pts</span>
            <span className="hidden text-center text-sm text-muted md:block">{player.exact} exatos</span>
            <span className="hidden text-center text-sm text-muted md:block">{player.correct} resultados</span>
            <span className="hidden text-center text-sm font-bold text-brand md:block">{player.trend}</span>
          </div>
        ))}
        {!loading && entries.length === 0 && <p className="p-6 text-center text-sm text-muted">O ranking aparece assim que o bolão tiver participantes.</p>}
      </div>
    </section>
  );
}
