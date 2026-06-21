import Image from "next/image";
import { ChevronDown, Goal, Images, ShieldCheck, Trophy, Users } from "lucide-react";
import { CarouselRail } from "@/components/carousel-rail";
import { PageShortcuts } from "@/components/page-shortcuts";
import {
  PlayersCatalog,
  type PlayerCatalogItem,
  type PlayerCatalogTeam,
} from "@/components/players-catalog";
import { ProgressiveList } from "@/components/progressive-list";
import { TeamFlag } from "@/components/team-flag";
import { uniqueTeams } from "@/lib/competition";
import { getMatches } from "@/lib/data/matches";
import { PLAYER_STICKER_ASSETS, playerStickerAsset } from "@/lib/player-sticker-assets";
import { appRoute } from "@/lib/app-routes";
import { playerOptionKey } from "@/lib/special-markets";
import {
  allPlayers,
  getSquadByCode,
  playerAge,
  positionLabel,
  positionShortLabel,
  sourceVersionLabel,
  squadSummary,
} from "@/lib/squads";
import type { SquadPlayer } from "@/lib/squads";
import type { DemoMatch, DemoTeam } from "@/lib/types";

type PlayerWithTeam = ReturnType<typeof allPlayers>[number];

export async function PlayersDirectory({
  backHref = "/competicao",
  backLabel = "Voltar para Copa",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  const matches = await getMatches();
  const teams = uniqueTeams(matches);
  const players = allPlayers();
  const groupsByTeamCode = groupNamesByTeamCode(matches);
  const teamsByCode = new Map(
    teams
      .filter((team) => team.code)
      .map((team) => [team.code!.toUpperCase(), team]),
  );
  const catalogPlayers = buildCatalogPlayers(players, teamsByCode, groupsByTeamCode);
  const stickerCountByTeam = catalogPlayers.reduce((counts, player) => {
    if (player.sticker) {
      counts.set(player.teamCode, (counts.get(player.teamCode) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>());
  const catalogTeams = buildCatalogTeams(teams, groupsByTeamCode, stickerCountByTeam);
  const topScorers = [...players]
    .sort((left, right) => right.goals - left.goals || right.caps - left.caps);
  const mostCapped = [...players]
    .sort((left, right) => right.caps - left.caps || right.goals - left.goals);
  const stickerCount = Object.keys(PLAYER_STICKER_ASSETS).length;
  const averageAge = Math.round(
    players.reduce((total, player) => total + playerAge(player), 0) / players.length,
  );
  const featuredStickers = players
    .filter((player) => playerStickerAsset(stickerKey(player)))
    .sort((left, right) => right.goals - left.goals || right.caps - left.caps);
  const contextRoute =
    backHref === appRoute("games").href
      ? appRoute("games")
      : appRoute("competition");
  const secondaryRoute =
    contextRoute.href === appRoute("competition").href
      ? appRoute("games")
      : appRoute("competition");
  const contextShortcut = {
    ...contextRoute,
    label: backLabel,
  };

  return (
    <main className="page-container min-w-0 overflow-hidden py-7 md:py-10">
      <section className="mb-7">
        <div>
          <p className="eyebrow">Elencos oficiais</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Jogadores da Copa
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Elencos, camisas, clubes e figurinhas para consultar antes de
            palpitar. As figurinhas aparecem quando já foram publicadas no app.
          </p>
          <p className="mt-2 text-xs font-bold leading-5 text-muted">
            {sourceVersionLabel()}
          </p>
        </div>
      </section>

      <PageShortcuts
        items={[
          appRoute("specials"),
          contextShortcut,
          appRoute("predictions"),
          secondaryRoute,
        ]}
        className="mb-6"
      />

      <section className="grid gap-4 md:grid-cols-5">
        <InfoCard icon={Users} title="Jogadores" value={String(players.length)} />
        <InfoCard icon={Trophy} title="Seleções" value={String(teams.length)} />
        <InfoCard icon={Goal} title="Média de idade" value={`${averageAge} anos`} />
        <InfoCard icon={Images} title="Figurinhas" value={String(stickerCount)} />
        <InfoCard icon={ShieldCheck} title="Fonte" value="FIFA" />
      </section>

      {featuredStickers.length > 0 && (
        <section className="mt-8 overflow-hidden rounded-2xl border bg-surface p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Álbum publicado</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Figurinhas em destaque</h2>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-black text-brand-strong">
              {stickerCount} no app
            </span>
          </div>
          <div className="-mx-5 px-5 pb-2">
            <CarouselRail
              ariaLabel="Figurinhas em destaque"
              initialCount={10}
              step={10}
              moreLabel="Ver mais figurinhas"
              trackClassName="auto-cols-[8.5rem] gap-3"
            >
              {featuredStickers.map((player) => (
                <PlayerStickerCard
                  key={stickerKey(player)}
                  player={player}
                  team={teamForPlayer(player, teamsByCode)}
                />
              ))}
            </CarouselRail>
          </div>
        </section>
      )}

      <PlayersCatalog players={catalogPlayers} teams={catalogTeams} />

      <section className="mt-8 grid min-w-0 gap-5 lg:grid-cols-2">
        <Leaderboard
          title="Artilheiros pela seleção"
          subtitle="Gols acumulados antes da Copa, conforme lista oficial."
          players={topScorers}
          teamsByCode={teamsByCode}
          metric={(player) => `${player.goals} gols`}
        />
        <Leaderboard
          title="Mais jogos pela seleção"
          subtitle="Experiência internacional declarada na lista oficial."
          players={mostCapped}
          teamsByCode={teamsByCode}
          metric={(player) => `${player.caps} jogos`}
        />
      </section>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Trophy;
  title: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border bg-surface p-5 shadow-sm">
      <span className="inline-flex rounded-2xl bg-surface-muted p-3 text-brand">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-2xl font-black">{value}</p>
      <h2 className="text-sm font-bold text-muted">{title}</h2>
    </article>
  );
}

function Leaderboard({
  title,
  subtitle,
  players,
  teamsByCode,
  metric,
}: {
  title: string;
  subtitle: string;
  players: PlayerWithTeam[];
  teamsByCode: Map<string, DemoTeam>;
  metric: (player: SquadPlayer) => string;
}) {
  return (
    <section className="lazy-render-panel min-w-0 overflow-hidden rounded-2xl border bg-surface p-5 shadow-sm">
      <div>
        <p className="eyebrow">Destaques</p>
        <h2 className="mt-1 text-xl font-black tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p>
      </div>
      <ProgressiveList
        initialCount={8}
        step={8}
        moreLabel="Ver mais jogadores"
        className="mt-5 grid gap-2"
      >
        {players.map((player, index) => (
          <PlayerLeaderboardRow
            key={`${player.team.code}-${player.number}`}
            index={index}
            player={player}
            team={teamForPlayer(player, teamsByCode)}
            metric={metric(player)}
          />
        ))}
      </ProgressiveList>
    </section>
  );
}

function PlayerLeaderboardRow({
  index,
  player,
  team,
  metric,
}: {
  index: number;
  player: PlayerWithTeam;
  team: DemoTeam;
  metric: string;
}) {
  const hasSticker = Boolean(playerStickerAsset(stickerKey(player)));

  return (
    <details className="lazy-render-row group min-w-0 overflow-hidden rounded-2xl bg-surface-muted">
      <summary className="interactive flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="w-6 shrink-0 text-center text-sm font-black text-muted">
          {index + 1}
        </span>
        <PlayerMiniPortrait player={player} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{player.name}</p>
          <p className="truncate text-xs text-muted">
            {team.name} · {positionShortLabel(player.position)} · {player.club}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-black text-brand-strong">
          {metric}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-2 border-t border-surface p-3 pt-3 sm:grid-cols-4">
        <LeaderboardDetail label="Seleção" value={team.name} />
        <LeaderboardDetail label="Posição" value={positionLabel(player.position)} />
        <LeaderboardDetail label="Clube" value={player.club} />
        <LeaderboardDetail label="Idade" value={`${playerAge(player)} anos`} />
        <LeaderboardDetail label="Camisa" value={`#${player.number}`} />
        <LeaderboardDetail label="Jogos" value={`${player.caps}`} />
        <LeaderboardDetail label="Gols" value={`${player.goals}`} />
        <LeaderboardDetail
          label="Figurinha"
          value={hasSticker ? "Publicada" : "Pendente"}
        />
      </div>
      <p className="border-t border-surface px-3 py-2 text-xs font-bold text-muted">
        {player.fullName}
      </p>
    </details>
  );
}

function LeaderboardDetail({ label, value }: { label: string; value: string }) {
  return (
    <dl className="min-w-0 rounded-xl bg-surface px-3 py-2">
      <dt className="text-[9px] font-black uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-black">{value}</dd>
    </dl>
  );
}

function PlayerStickerCard({
  player,
  team,
}: {
  player: PlayerWithTeam;
  team: DemoTeam;
}) {
  const asset = playerStickerAsset(stickerKey(player));

  return (
    <article className="overflow-hidden rounded-2xl border bg-surface-muted p-2">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white">
        {asset ? (
          <Image
            src={asset.src}
            alt={`Figurinha de ${player.name}`}
            width={asset.width}
            height={asset.height}
            className="size-full object-cover"
            sizes="(max-width: 640px) 42vw, 9rem"
            quality={68}
            decoding="async"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-2xl font-black text-brand">
            {player.number}
          </div>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-xs font-black">{player.name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <TeamFlag team={team} size="sm" />
          <p className="truncate text-[10px] font-bold text-muted">
            {positionLabel(player.position)}
          </p>
        </div>
      </div>
    </article>
  );
}

function PlayerMiniPortrait({ player }: { player: PlayerWithTeam }) {
  const asset = playerStickerAsset(stickerKey(player));

  if (!asset) {
    return (
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-brand text-xs font-black text-white">
        {player.number}
      </span>
    );
  }

  return (
    <span className="relative inline-flex size-11 shrink-0 overflow-hidden rounded-full border-2 border-surface bg-white">
      <Image
        src={asset.src}
        alt={`Figurinha de ${player.name}`}
        width={asset.width}
        height={asset.height}
        className="size-full object-cover object-top"
        sizes="44px"
        quality={60}
        decoding="async"
      />
    </span>
  );
}

function teamForPlayer(player: PlayerWithTeam, teamsByCode: Map<string, DemoTeam>) {
  return (
    teamsByCode.get(player.team.code.toUpperCase()) ?? {
      id: `team-${player.team.code}`,
      code: player.team.code,
      name: player.team.name,
      shortName: player.team.code,
      flag: "•",
    }
  );
}

function stickerKey(player: Pick<PlayerWithTeam, "team" | "number" | "fullName">) {
  return playerOptionKey(player.team.code, player.number, player.fullName);
}

function buildCatalogPlayers(
  players: PlayerWithTeam[],
  teamsByCode: Map<string, DemoTeam>,
  groupsByTeamCode: Map<string, string>,
): PlayerCatalogItem[] {
  return players.map((player) => {
    const key = stickerKey(player);
    const team = teamForPlayer(player, teamsByCode);
    const teamCode = (team.code ?? player.team.code).toUpperCase();
    const sticker = playerStickerAsset(key);

    return {
      key,
      name: player.name,
      fullName: player.fullName,
      number: player.number,
      position: player.position,
      positionLabel: positionLabel(player.position),
      positionShortLabel: positionShortLabel(player.position),
      teamId: team.id,
      teamCode,
      teamName: team.name,
      teamShortName: team.shortName,
      teamFlag: team.flag,
      groupName: groupsByTeamCode.get(teamCode),
      club: player.club,
      age: playerAge(player),
      heightCm: player.heightCm,
      caps: player.caps,
      goals: player.goals,
      sticker: sticker ? { ...sticker } : null,
    };
  });
}

function buildCatalogTeams(
  teams: DemoTeam[],
  groupsByTeamCode: Map<string, string>,
  stickerCountByTeam: Map<string, number>,
): PlayerCatalogTeam[] {
  return teams
    .filter((team) => team.code)
    .map((team) => {
      const teamCode = team.code!.toUpperCase();
      const squad = getSquadByCode(teamCode);
      const summary = squad ? squadSummary(squad) : null;

      return {
        id: team.id,
        code: teamCode,
        name: team.name,
        shortName: team.shortName,
        flag: team.flag,
        groupName: groupsByTeamCode.get(teamCode),
        totalPlayers: squad?.players.length ?? 0,
        stickerCount: stickerCountByTeam.get(teamCode) ?? 0,
        topScorerName: summary?.topScorer.name,
        topScorerGoals: summary?.topScorer.goals,
        mostCappedName: summary?.mostCapped.name,
        mostCappedCaps: summary?.mostCapped.caps,
        averageAge: summary?.averageAge,
      };
    });
}

function groupNamesByTeamCode(matches: DemoMatch[]) {
  const groups = new Map<string, string>();
  for (const match of matches) {
    if (match.stage !== "group") continue;
    const groupName = match.stageLabel.startsWith("Grupo")
      ? match.stageLabel
      : `Grupo ${match.stageLabel}`;
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (team.code) groups.set(team.code.toUpperCase(), groupName);
    }
  }
  return groups;
}
