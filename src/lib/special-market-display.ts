import type { LucideIcon } from "lucide-react";
import {
  Goal,
  Hand,
  Medal,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
} from "lucide-react";

export type SpecialMarketCategory = "players" | "teams" | "knockout";

export type SpecialMarketDisplay = {
  key: string;
  slug: string;
  category: SpecialMarketCategory;
  icon: LucideIcon;
  eyebrow: string;
  shortTitle: string;
  heroTitle: string;
  teaser: string;
  highlightTitle: string;
  pickLabel: string;
  searchPlaceholder: string;
  emptyDetail: string;
  dataNote: string;
};

export const SPECIAL_LOCK_DATE_LABEL = "22 de junho, 23:59";
export const SPECIAL_LOCK_RATIONALE =
  "Prazo pensado para dar tempo de participar antes que a Copa mostre tendências fortes demais.";

type MarketProgressLike = {
  key: string;
  locked: boolean;
  pickCount: number;
  predictions: unknown[];
};

export const SPECIAL_MARKET_DISPLAY: Record<string, SpecialMarketDisplay> = {
  top_scorer: {
    key: "top_scorer",
    slug: "artilheiro",
    category: "players",
    icon: Goal,
    eyebrow: "Gols",
    shortTitle: "Artilheiro",
    heroTitle: "Artilheiro da Copa",
    teaser: "Escolha quem termina a Copa com mais gols.",
    highlightTitle: "Atacantes e finalizadores em destaque",
    pickLabel: "Meu artilheiro",
    searchPlaceholder: "Buscar atacante, jogador ou seleção",
    emptyDetail: "Escolha um jogador para ver dados do elenco oficial.",
    dataNote: "Sugestões por posição, gols e jogos pela seleção. Não são odds.",
  },
  top_assists: {
    key: "top_assists",
    slug: "assistencias",
    category: "players",
    icon: Sparkles,
    eyebrow: "Criação",
    shortTitle: "Assistências",
    heroTitle: "Líder em assistências",
    teaser: "Escolha quem mais serve gols durante a Copa.",
    highlightTitle: "Criadores em destaque",
    pickLabel: "Meu líder em assistências",
    searchPlaceholder: "Buscar meia, atacante ou seleção",
    emptyDetail: "Escolha um jogador para ver posição, clube e experiência.",
    dataNote: "Sugestões por posição, clube e histórico de seleção.",
  },
  golden_glove: {
    key: "golden_glove",
    slug: "luva-de-ouro",
    category: "players",
    icon: Hand,
    eyebrow: "Goleiros",
    shortTitle: "Luva de Ouro",
    heroTitle: "Luva de Ouro",
    teaser: "Escolha quem será eleito o melhor goleiro.",
    highlightTitle: "Goleiros em destaque",
    pickLabel: "Minha Luva de Ouro",
    searchPlaceholder: "Buscar goleiro ou seleção",
    emptyDetail: "Escolha um goleiro para ver altura, jogos e clube.",
    dataNote: "Sugestões de goleiros por posição, altura e experiência.",
  },
  golden_ball: {
    key: "golden_ball",
    slug: "bola-de-ouro",
    category: "players",
    icon: Star,
    eyebrow: "Craque",
    shortTitle: "Bola de Ouro",
    heroTitle: "Bola de Ouro",
    teaser: "Escolha o melhor jogador da Copa.",
    highlightTitle: "Craques em destaque",
    pickLabel: "Minha Bola de Ouro",
    searchPlaceholder: "Buscar jogador ou seleção",
    emptyDetail: "Escolha um jogador para comparar dados oficiais.",
    dataNote: "Sugestões por experiência, gols e peso no elenco.",
  },
  team_most_goals: {
    key: "team_most_goals",
    slug: "selecao-mais-gols",
    category: "teams",
    icon: Trophy,
    eyebrow: "Ataque",
    shortTitle: "Mais gols",
    heroTitle: "Seleção com mais gols",
    teaser: "Escolha o ataque mais produtivo.",
    highlightTitle: "Ataques em destaque",
    pickLabel: "Meu ataque escolhido",
    searchPlaceholder: "Buscar seleção",
    emptyDetail: "Escolha uma seleção para ver gols, saldo e campanha.",
    dataNote: "Sugestões pela campanha atual e força ofensiva.",
  },
  team_fewest_conceded: {
    key: "team_fewest_conceded",
    slug: "defesa-menos-vazada",
    category: "teams",
    icon: ShieldCheck,
    eyebrow: "Defesa",
    shortTitle: "Menos gols sofridos",
    heroTitle: "Defesa menos vazada",
    teaser: "Escolha quem sofre menos gols.",
    highlightTitle: "Defesas em destaque",
    pickLabel: "Minha defesa escolhida",
    searchPlaceholder: "Buscar seleção",
    emptyDetail: "Escolha uma seleção para ver gols sofridos e jogos.",
    dataNote: "Sugestões por jogos, gols sofridos e campanha atual.",
  },
  champion: {
    key: "champion",
    slug: "campeao",
    category: "knockout",
    icon: Medal,
    eyebrow: "Taça",
    shortTitle: "Campeão",
    heroTitle: "Campeão",
    teaser: "Escolha quem levanta a taça.",
    highlightTitle: "Seleções em destaque",
    pickLabel: "Meu campeão",
    searchPlaceholder: "Buscar seleção",
    emptyDetail: "Escolha uma seleção para ver campanha atual.",
    dataNote: "Sugestões por campanha, saldo e caminho de torneio.",
  },
  runner_up: {
    key: "runner_up",
    slug: "vice",
    category: "knockout",
    icon: Medal,
    eyebrow: "Final",
    shortTitle: "Vice",
    heroTitle: "Vice-campeão",
    teaser: "Escolha quem chega à final e fica em segundo.",
    highlightTitle: "Candidatas a final",
    pickLabel: "Meu vice",
    searchPlaceholder: "Buscar seleção",
    emptyDetail: "Escolha uma seleção para ver campanha atual.",
    dataNote: "Vale o vice oficial após a decisão.",
  },
  semifinalists: {
    key: "semifinalists",
    slug: "semifinalistas",
    category: "knockout",
    icon: UsersRound,
    eyebrow: "Mata-mata",
    shortTitle: "Semifinalistas",
    heroTitle: "Semifinalistas",
    teaser: "Escolha quatro seleções para chegar à semi.",
    highlightTitle: "Seleções para montar sua semi",
    pickLabel: "Minhas semifinalistas",
    searchPlaceholder: "Buscar seleção",
    emptyDetail: "Escolha quatro seleções para montar sua aposta.",
    dataNote: "Vale ponto por cada semifinalista correta.",
  },
};

export function specialMarketDisplay(marketKey: string) {
  return SPECIAL_MARKET_DISPLAY[marketKey] ?? {
    key: marketKey,
    slug: marketKey,
    category: "players",
    icon: Sparkles,
    eyebrow: "Especial",
    shortTitle: marketKey,
    heroTitle: marketKey,
    teaser: "Palpite final.",
    highlightTitle: "Destaques",
    pickLabel: "Minha escolha",
    searchPlaceholder: "Buscar opção",
    emptyDetail: "Escolha uma opção para ver os detalhes.",
    dataNote: "Resultado final da categoria.",
  };
}

export function specialMarketPath(marketKey: string) {
  return `/especiais/${specialMarketDisplay(marketKey).slug}`;
}

export function specialMarketKeyFromSlug(slug: string) {
  return (
    Object.values(SPECIAL_MARKET_DISPLAY).find((item) => item.slug === slug)?.key ??
    slug
  );
}

export function specialProgress(markets: MarketProgressLike[]) {
  const total = markets.length;
  const completedMarkets = markets.filter(
    (market) => market.predictions.length === market.pickCount,
  );
  const pendingMarkets = markets.filter(
    (market) => market.predictions.length < market.pickCount,
  );
  const openPending = pendingMarkets.filter((market) => !market.locked);
  const lockedPending = pendingMarkets.filter((market) => market.locked);
  const next = openPending[0];
  const completed = completedMarkets.length;

  return {
    total,
    completed,
    pending: Math.max(0, total - completed),
    openPending,
    lockedPending,
    next,
  };
}

export function hasOpenSpecialPending(markets: MarketProgressLike[]) {
  return markets.some(
    (market) => !market.locked && market.predictions.length < market.pickCount,
  );
}

export function groupSpecialMarkets<T extends MarketProgressLike>(markets: T[]) {
  return {
    players: markets.filter(
      (market) => specialMarketDisplay(market.key).category === "players",
    ),
    teams: markets.filter(
      (market) => specialMarketDisplay(market.key).category === "teams",
    ),
    knockout: markets.filter(
      (market) => specialMarketDisplay(market.key).category === "knockout",
    ),
  };
}
