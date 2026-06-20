import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Goal, Images, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import { TeamFlag } from "@/components/team-flag";
import { uniqueTeams } from "@/lib/competition";
import { getMatches } from "@/lib/data/matches";
import { PLAYER_STICKER_ASSETS, playerStickerAsset } from "@/lib/player-sticker-assets";
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
import type { DemoTeam } from "@/lib/types";

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
  const teamsByCode = new Map(
    teams
      .filter((team) => team.code)
      .map((team) => [team.code!.toUpperCase(), team]),
  );
  const topScorers = [...players]
    .sort((left, right) => right.goals - left.goals || right.caps - left.caps)
    .slice(0, 8);
  const mostCapped = [...players]
    .sort((left, right) => right.caps - left.caps || right.goals - left.goals)
    .slice(0, 8);
  const stickerCount = Object.keys(PLAYER_STICKER_ASSETS).length;
  const averageAge = Math.round(
    players.reduce((total, player) => total + playerAge(player), 0) / players.length,
  );
  const featuredStickers = players
    .filter((player) => playerStickerAsset(stickerKey(player)))
    .sort((left, right) => right.goals - left.goals || right.caps - left.caps)
    .slice(0, 10);

  return (
    <main className="page-container py-7 md:py-10">
      <section className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-end">
        <div>
          <p className="eyebrow">Elencos oficiais</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Jogadores da Copa
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Convocados, posições, clubes, números e dados usados nos palpites
            especiais. As figurinhas aparecem quando já foram publicadas no app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            href="/especiais"
            className="interactive inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white"
          >
            Ver especiais <Sparkles className="size-4" />
          </Link>
          <Link
            href={backHref}
            className="interactive inline-flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-brand"
          >
            {backLabel} <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

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
          <div className="-mx-5 overflow-x-auto px-5 pb-2">
            <div className="grid auto-cols-[8.5rem] grid-flow-col gap-3">
              {featuredStickers.map((player) => (
                <PlayerStickerCard
                  key={stickerKey(player)}
                  player={player}
                  team={teamForPlayer(player, teamsByCode)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

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

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Por seleção</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Elencos</h2>
          </div>
          <p className="max-w-xl text-xs font-bold leading-5 text-muted">
            {sourceVersionLabel()}
          </p>
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const squad = getSquadByCode(team.code);
            const summary = squad ? squadSummary(squad) : null;
            const spotlight = squad?.players
              .slice()
              .sort((left, right) => right.goals - left.goals || right.caps - left.caps)
              .slice(0, 3);

            return (
              <Link
                key={team.id}
                href={`/competicao/selecoes/${encodeURIComponent(team.id)}`}
                className="interactive block min-w-0 overflow-hidden rounded-2xl border bg-surface p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <TeamFlag team={team} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black">{team.name}</h3>
                    <p className="text-xs font-bold text-muted">
                      {squad ? `${squad.players.length} convocados` : "Elenco a confirmar"}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-brand" />
                </div>
                {summary && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <MiniMetric label="Artilheiro" value={summary.topScorer.name} />
                    <MiniMetric label="Gols" value={String(summary.topScorer.goals)} />
                    <MiniMetric label="Mais jogos" value={summary.mostCapped.name} />
                    <MiniMetric label="Média" value={`${summary.averageAge} anos`} />
                  </div>
                )}
                {spotlight && (
                  <div className="mt-4 flex -space-x-2">
                    {spotlight.map((player) => (
                      <PlayerMiniPortrait
                        key={`${team.code}-${player.number}`}
                        player={{ ...player, team: { code: team.code ?? "", name: team.name, players: [] } }}
                      />
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
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
    <section className="min-w-0 overflow-hidden rounded-2xl border bg-surface p-5 shadow-sm">
      <div>
        <p className="eyebrow">Destaques</p>
        <h2 className="mt-1 text-xl font-black tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p>
      </div>
      <div className="mt-5 grid gap-2">
        {players.map((player, index) => (
          <div key={`${player.team.code}-${player.number}`} className="min-w-0 rounded-2xl bg-surface-muted p-3">
            <div className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-center text-sm font-black text-muted">{index + 1}</span>
              <PlayerMiniPortrait player={player} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{player.name}</p>
                <p className="truncate text-xs text-muted">
                  {teamForPlayer(player, teamsByCode).name} · {positionShortLabel(player.position)} · {player.club}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-black text-brand-strong">
                {metric(player)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
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
      />
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface-muted p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 truncate font-black">{value}</p>
    </div>
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
