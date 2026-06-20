"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeInfo,
  ChevronRight,
  Goal,
  Images,
  LayoutGrid,
  List,
  Search,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { TeamFlag } from "@/components/team-flag";
import { specialMarketPath } from "@/lib/special-market-display";
import type { DemoTeam } from "@/lib/types";

export type PlayerCatalogAsset = {
  src: string;
  width: number;
  height: number;
};

export type PlayerCatalogItem = {
  key: string;
  name: string;
  fullName: string;
  number: number;
  position: "GK" | "DF" | "MF" | "FW";
  positionLabel: string;
  positionShortLabel: string;
  teamId: string;
  teamCode: string;
  teamName: string;
  teamShortName: string;
  teamFlag: string;
  groupName?: string;
  club: string;
  age: number;
  heightCm: number;
  caps: number;
  goals: number;
  sticker: PlayerCatalogAsset | null;
};

export type PlayerCatalogTeam = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  flag: string;
  groupName?: string;
  totalPlayers: number;
  stickerCount: number;
  topScorerName?: string;
  topScorerGoals?: number;
  mostCappedName?: string;
  mostCappedCaps?: number;
  averageAge?: number;
};

type PositionFilter = "all" | PlayerCatalogItem["position"];
type ViewMode = "cards" | "list";
type SortMode = "team" | "name" | "goals" | "caps" | "age" | "stickers";

const INITIAL_VISIBLE = 48;
const PAGE_SIZE = 48;

const positionFilters: Array<{ value: PositionFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "GK", label: "GOL" },
  { value: "DF", label: "DEF" },
  { value: "MF", label: "MEI" },
  { value: "FW", label: "ATA" },
];
const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: "team", label: "Seleção e camisa" },
  { value: "name", label: "Nome" },
  { value: "goals", label: "Mais gols" },
  { value: "caps", label: "Mais jogos" },
  { value: "age", label: "Mais jovens" },
  { value: "stickers", label: "Com figurinha" },
];

export function PlayersCatalog({
  players,
  teams,
}: {
  players: PlayerCatalogItem[];
  teams: PlayerCatalogTeam[];
}) {
  const [search, setSearch] = useState("");
  const [teamCode, setTeamCode] = useState("all");
  const [position, setPosition] = useState<PositionFilter>("all");
  const [onlyStickers, setOnlyStickers] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("team");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const normalizedSearch = normalizeText(search);
  const selectedTeam = teams.find((team) => team.code === teamCode) ?? null;
  const filteredPlayers = useMemo(() => {
    const rows = players.filter((player) => {
      if (teamCode !== "all" && player.teamCode !== teamCode) return false;
      if (position !== "all" && player.position !== position) return false;
      if (onlyStickers && !player.sticker) return false;
      if (!normalizedSearch) return true;
      return normalizeText(
        `${player.name} ${player.fullName} ${player.teamName} ${player.club} ${player.number}`,
      ).includes(normalizedSearch);
    });

    return rows.sort((left, right) => sortPlayers(left, right, sortMode, normalizedSearch));
  }, [normalizedSearch, onlyStickers, players, position, sortMode, teamCode]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);
  const stickerTotal = players.filter((player) => player.sticker).length;
  const activeFilterCount =
    (teamCode === "all" ? 0 : 1) +
    (position === "all" ? 0 : 1) +
    (onlyStickers ? 1 : 0) +
    (search.trim() ? 1 : 0);

  function resetVisible() {
    setVisibleCount(INITIAL_VISIBLE);
  }

  function clearFilters() {
    setSearch("");
    setTeamCode("all");
    setPosition("all");
    setOnlyStickers(false);
    setSortMode("team");
    resetVisible();
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Jogadores e figurinhas</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <CatalogPill icon={Users} label={`${players.length} atletas`} />
          <CatalogPill icon={Trophy} label={`${teams.length} seleções`} />
          <CatalogPill icon={Images} label={`${stickerTotal} figurinhas`} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[18.5rem_minmax(0,1fr)] xl:items-start">
        <aside className="rounded-[1.5rem] border bg-surface p-4 shadow-sm xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
                Filtros
              </p>
              <p className="mt-1 text-sm font-black">
                {activeFilterCount > 0 ? `${activeFilterCount} ativo${activeFilterCount === 1 ? "" : "s"}` : "Visão geral"}
              </p>
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="interactive inline-flex size-10 items-center justify-center rounded-xl border bg-surface-muted text-muted hover:text-brand"
                aria-label="Limpar filtros"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetVisible();
              }}
              placeholder="Nome, seleção ou clube"
              className="w-full rounded-2xl border bg-surface-muted py-3 pl-10 pr-3 text-sm font-bold outline-none placeholder:text-muted focus:border-brand focus:bg-surface"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
              Seleção
            </span>
            <select
              value={teamCode}
              onChange={(event) => {
                setTeamCode(event.target.value);
                resetVisible();
              }}
              className="mt-1 w-full rounded-2xl border bg-surface-muted px-3 py-3 text-sm font-bold outline-none focus:border-brand focus:bg-surface"
            >
              <option value="all">Todas as seleções</option>
              {teams.map((team) => (
                <option key={team.code} value={team.code}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
              Ordenar
            </span>
            <select
              value={sortMode}
              onChange={(event) => {
                setSortMode(event.target.value as SortMode);
                resetVisible();
              }}
              className="mt-1 w-full rounded-2xl border bg-surface-muted px-3 py-3 text-sm font-bold outline-none focus:border-brand focus:bg-surface"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
              Posição
            </p>
            <div className="mt-2 grid grid-cols-5 gap-1 rounded-2xl border bg-surface-muted p-1">
              {positionFilters.map((item) => {
                const active = item.value === position;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setPosition(item.value);
                      resetVisible();
                    }}
                    aria-pressed={active}
                    className={`interactive min-h-9 rounded-xl px-1 text-[10px] font-black ${
                      active ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-surface hover:text-brand"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-surface-muted px-3 py-2">
            <span className="min-w-0">
              <span className="block text-sm font-black">Só com figurinha</span>
              <span className="block text-xs font-bold text-muted">{stickerTotal} publicadas</span>
            </span>
            <input
              type="checkbox"
              checked={onlyStickers}
              onChange={(event) => {
                setOnlyStickers(event.target.checked);
                resetVisible();
              }}
              className="size-5 shrink-0 accent-[var(--brand)]"
            />
          </label>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                Seleções
              </p>
              <span className="text-xs font-black text-brand">{teams.length}</span>
            </div>
            <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 xl:mx-0 xl:max-h-[32rem] xl:flex-col xl:overflow-y-auto xl:px-0">
              <TeamFilterButton
                active={teamCode === "all"}
                onClick={() => {
                  setTeamCode("all");
                  resetVisible();
                }}
                label="Todas"
                sublabel={`${players.length} atletas`}
              />
              {teams.map((team) => (
                <TeamFilterButton
                  key={team.code}
                  active={team.code === teamCode}
                  onClick={() => {
                    setTeamCode(team.code);
                    resetVisible();
                  }}
                  team={team}
                  label={team.shortName}
                  sublabel={`${team.totalPlayers} atletas · ${team.stickerCount} fig.`}
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="rounded-[1.5rem] border bg-surface p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <SelectedTeamSummary team={selectedTeam} playersTotal={players.length} stickerTotal={stickerTotal} />
              <div className="flex shrink-0 items-center gap-2 rounded-2xl border bg-surface-muted p-1">
                <ViewButton
                  active={viewMode === "cards"}
                  icon={LayoutGrid}
                  label="Cartas"
                  onClick={() => setViewMode("cards")}
                />
                <ViewButton
                  active={viewMode === "list"}
                  icon={List}
                  label="Lista"
                  onClick={() => setViewMode("list")}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm font-bold text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>
                {filteredPlayers.length} resultado{filteredPlayers.length === 1 ? "" : "s"}
              </span>
              <span>
                Mostrando {visiblePlayers.length} de {filteredPlayers.length} · {sortLabel(sortMode)}
              </span>
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="mt-4 rounded-[1.5rem] border bg-surface p-8 text-center shadow-sm">
              <p className="text-lg font-black">Nenhum jogador encontrado</p>
              <p className="mt-2 text-sm font-bold text-muted">
                Ajuste os filtros para voltar ao catálogo completo.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="interactive mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-black text-white"
              >
                Limpar filtros
              </button>
            </div>
          ) : viewMode === "cards" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {visiblePlayers.map((player, index) => (
                <PlayerCard key={player.key} player={player} priority={index < 6} />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              {visiblePlayers.map((player, index) => (
                <PlayerListRow key={player.key} player={player} priority={index < 8} />
              ))}
            </div>
          )}

          {visiblePlayers.length < filteredPlayers.length ? (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                className="interactive min-h-12 rounded-2xl border bg-surface px-5 text-sm font-black text-brand hover:border-brand/70"
              >
                Mostrar mais jogadores
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PlayerCard({ player, priority }: { player: PlayerCatalogItem; priority: boolean }) {
  const team = teamForPlayer(player);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border bg-surface shadow-sm">
      <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-0 sm:grid-cols-1">
        <div className="relative min-h-48 bg-surface-muted sm:min-h-0">
          <div className="relative aspect-[2/3] h-full min-h-48 w-full overflow-hidden bg-surface-muted sm:h-auto sm:min-h-0">
            <PlayerImage player={player} priority={priority} sizes="(max-width: 640px) 136px, (max-width: 1536px) 45vw, 18rem" />
          </div>
          <div className="absolute left-3 top-3 rounded-xl bg-surface/95 p-1 shadow-sm">
            <TeamFlag team={team} size="sm" />
          </div>
          {player.sticker ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-black text-brand-strong shadow-sm">
              Figurinha
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
                {player.positionLabel} · #{player.number}
              </p>
              <h3 className="mt-1 line-clamp-2 text-xl font-black leading-tight tracking-tight">
                {player.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-muted">
                {player.fullName}
              </p>
            </div>
            <span className="rounded-full border bg-surface-muted px-2 py-1 text-[10px] font-black text-muted">
              {player.positionShortLabel}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-xs font-bold leading-5 text-muted">
            {player.teamName} · {player.club}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <MiniStat icon={Trophy} label="Jogos" value={player.caps} />
            <MiniStat icon={Goal} label="Gols" value={player.goals} />
            <MiniStat icon={Users} label="Idade" value={`${player.age}`} />
            <MiniStat icon={Shield} label="Altura" value={`${player.heightCm} cm`} />
          </div>
          <PlayerDetails player={player} />
          <Link
            href={`/competicao/selecoes/${encodeURIComponent(player.teamId)}`}
            className="interactive mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border bg-surface-muted px-3 text-xs font-black text-brand hover:border-brand/70"
          >
            Ver seleção <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PlayerListRow({ player, priority }: { player: PlayerCatalogItem; priority: boolean }) {
  const team = teamForPlayer(player);

  return (
    <article className="rounded-[1.25rem] border bg-surface p-3 shadow-sm">
      <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-3 md:grid-cols-[4.25rem_minmax(0,1.4fr)_minmax(0,1fr)_auto]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-surface-muted">
          <PlayerImage player={player} priority={priority} sizes="68px" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TeamFlag team={team} size="sm" />
            <span className="rounded-full border bg-surface-muted px-2 py-0.5 text-[10px] font-black text-muted">
              {player.positionShortLabel} · #{player.number}
            </span>
          </div>
          <h3 className="mt-1 truncate text-base font-black">{player.name}</h3>
          <p className="truncate text-xs font-bold text-muted">{player.fullName}</p>
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-black">{player.teamName}</p>
          <p className="truncate text-xs font-bold text-muted">{player.club}</p>
        </div>
        <div className="col-span-2 grid grid-cols-4 gap-1 text-center text-xs md:col-span-1 md:w-72">
          <CompactStat label="Jogos" value={player.caps} />
          <CompactStat label="Gols" value={player.goals} />
          <CompactStat label="Idade" value={player.age} />
          <CompactStat label="Fig." value={player.sticker ? "Sim" : "Não"} />
        </div>
      </div>
      <PlayerDetails player={player} compact />
    </article>
  );
}

function PlayerDetails({
  player,
  compact = false,
}: {
  player: PlayerCatalogItem;
  compact?: boolean;
}) {
  const specialLinks = playerSpecialLinks(player);

  return (
    <details className="group mt-3 rounded-2xl border bg-surface-muted/65">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-black text-brand [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <BadgeInfo className="size-4" />
          Dados do jogador
        </span>
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t px-3 py-3">
        <div className={`grid gap-2 ${compact ? "sm:grid-cols-3" : "grid-cols-2"}`}>
          <DetailStat label="Nome" value={player.fullName} />
          <DetailStat label="Clube" value={player.club} />
          <DetailStat label="Seleção" value={player.teamName} />
          <DetailStat label="Grupo" value={player.groupName ?? "A definir"} />
          <DetailStat label="Posição" value={player.positionLabel} />
          <DetailStat label="Camisa" value={`#${player.number}`} />
          <DetailStat label="Idade" value={`${player.age} anos`} />
          <DetailStat label="Altura" value={`${player.heightCm} cm`} />
          <DetailStat label="Jogos" value={`${player.caps}`} />
          <DetailStat label="Gols" value={`${player.goals}`} />
        </div>
        <div className="mt-3 rounded-xl border bg-surface px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
              Especiais relacionados
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {specialLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="interactive rounded-full border bg-surface-muted px-3 py-1.5 text-[11px] font-black text-brand hover:border-brand/70"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

function PlayerImage({
  player,
  priority,
  sizes,
}: {
  player: PlayerCatalogItem;
  priority: boolean;
  sizes: string;
}) {
  if (player.sticker) {
    return (
      <Image
        src={player.sticker.src}
        alt={`Figurinha de ${player.name}`}
        width={player.sticker.width}
        height={player.sticker.height}
        className="h-full w-full object-cover"
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    <div className="flex h-full min-h-20 w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(145deg,var(--surface-muted),var(--surface))] p-3 text-center">
      <span className="text-4xl font-black text-brand">#{player.number}</span>
      <span className="rounded-full border bg-surface px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {player.teamCode}
      </span>
    </div>
  );
}

function SelectedTeamSummary({
  team,
  playersTotal,
  stickerTotal,
}: {
  team: PlayerCatalogTeam | null;
  playersTotal: number;
  stickerTotal: number;
}) {
  if (!team) {
    return (
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
          Todas as seleções
        </p>
        <h3 className="mt-1 text-2xl font-black tracking-tight">Elencos completos</h3>
        <p className="mt-1 text-sm font-bold text-muted">
          {playersTotal} atletas · {stickerTotal} figurinhas publicadas
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <TeamFlag team={teamForSummary(team)} size="lg" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
          {team.groupName ?? "Seleção"}
        </p>
        <h3 className="mt-1 truncate text-2xl font-black tracking-tight">{team.name}</h3>
        <p className="mt-1 text-sm font-bold text-muted">
          {team.totalPlayers} atletas · {team.stickerCount} figurinhas · média {team.averageAge ?? "—"} anos
        </p>
        {team.topScorerName ? (
          <p className="mt-1 truncate text-xs font-bold text-muted">
            Artilheiro do elenco: {team.topScorerName} · {team.topScorerGoals ?? 0} gols
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TeamFilterButton({
  active,
  onClick,
  label,
  sublabel,
  team,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sublabel: string;
  team?: PlayerCatalogTeam;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`interactive flex min-w-44 items-center gap-2 rounded-2xl border px-3 py-2 text-left xl:min-w-0 ${
        active
          ? "border-brand bg-brand text-white shadow-sm"
          : "bg-surface-muted text-foreground hover:border-brand/70"
      }`}
    >
      {team ? (
        <TeamFlag team={teamForSummary(team)} size="sm" />
      ) : (
        <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
          active ? "border-white/20 bg-white/12 text-white" : "bg-surface text-brand"
        }`}>
          *
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-black">{label}</span>
        <span className={`block truncate text-[10px] font-bold ${active ? "text-white/65" : "text-muted"}`}>
          {sublabel}
        </span>
      </span>
    </button>
  );
}

function ViewButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof LayoutGrid;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black ${
        active ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-surface hover:text-brand"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function CatalogPill({
  icon: Icon,
  label,
}: {
  icon: typeof Users;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1.5 text-muted shadow-sm">
      <Icon className="size-3.5 text-brand" />
      {label}
    </span>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-surface-muted p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
        <Icon className="size-3.5 shrink-0 text-brand" />
      </div>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-surface-muted px-2 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-0.5 truncate font-black">{value}</p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black">{value}</p>
    </div>
  );
}

function playerSpecialLinks(player: PlayerCatalogItem) {
  if (player.position === "GK") {
    return [
      { label: "Luva de Ouro", href: specialMarketPath("golden_glove") },
      { label: "Bola de Ouro", href: specialMarketPath("golden_ball") },
    ];
  }
  if (player.position === "DF") {
    return [
      { label: "Bola de Ouro", href: specialMarketPath("golden_ball") },
      { label: "Assistências", href: specialMarketPath("top_assists") },
    ];
  }
  if (player.position === "MF") {
    return [
      { label: "Assistências", href: specialMarketPath("top_assists") },
      { label: "Bola de Ouro", href: specialMarketPath("golden_ball") },
      { label: "Artilheiro", href: specialMarketPath("top_scorer") },
    ];
  }
  return [
    { label: "Artilheiro", href: specialMarketPath("top_scorer") },
    { label: "Assistências", href: specialMarketPath("top_assists") },
    { label: "Bola de Ouro", href: specialMarketPath("golden_ball") },
  ];
}

function teamForPlayer(player: PlayerCatalogItem): DemoTeam {
  return {
    id: player.teamId,
    code: player.teamCode,
    name: player.teamName,
    shortName: player.teamShortName,
    flag: player.teamFlag,
  };
}

function teamForSummary(team: PlayerCatalogTeam): DemoTeam {
  return {
    id: team.id,
    code: team.code,
    name: team.name,
    shortName: team.shortName,
    flag: team.flag,
  };
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function searchRank(player: PlayerCatalogItem, search: string) {
  const name = normalizeText(player.name);
  const fullName = normalizeText(player.fullName);
  const team = normalizeText(player.teamName);
  if (name.startsWith(search)) return 0;
  if (fullName.startsWith(search)) return 1;
  if (team.startsWith(search)) return 2;
  return player.sticker ? 3 : 4;
}

function sortPlayers(
  left: PlayerCatalogItem,
  right: PlayerCatalogItem,
  sortMode: SortMode,
  search: string,
) {
  if (search) {
    const leftRank = searchRank(left, search);
    const rightRank = searchRank(right, search);
    if (leftRank !== rightRank) return leftRank - rightRank;
  }

  if (sortMode === "name") {
    return (
      left.name.localeCompare(right.name, "pt-BR") ||
      left.teamName.localeCompare(right.teamName, "pt-BR") ||
      left.number - right.number
    );
  }
  if (sortMode === "goals") {
    return right.goals - left.goals || right.caps - left.caps || defaultPlayerOrder(left, right);
  }
  if (sortMode === "caps") {
    return right.caps - left.caps || right.goals - left.goals || defaultPlayerOrder(left, right);
  }
  if (sortMode === "age") {
    return left.age - right.age || defaultPlayerOrder(left, right);
  }
  if (sortMode === "stickers") {
    return Number(Boolean(right.sticker)) - Number(Boolean(left.sticker)) || defaultPlayerOrder(left, right);
  }
  return defaultPlayerOrder(left, right);
}

function defaultPlayerOrder(left: PlayerCatalogItem, right: PlayerCatalogItem) {
  return (
    left.teamName.localeCompare(right.teamName, "pt-BR") ||
    left.number - right.number ||
    left.name.localeCompare(right.name, "pt-BR")
  );
}

function sortLabel(sortMode: SortMode) {
  return sortOptions.find((option) => option.value === sortMode)?.label ?? "Seleção e camisa";
}
