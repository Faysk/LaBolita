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

export const SPECIAL_LOCK_DATE_LABEL = "22 de junho";

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
    dataNote: "Destaques por elenco e histórico da seleção. Não são odds.",
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
    dataNote: "Destaques por posição, clube e histórico da seleção.",
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
    dataNote: "Prêmio oficial confirmado no fim da Copa.",
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
    dataNote: "Destaques por elenco, experiência e gols.",
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
    dataNote: "Destaques pela campanha e gols da seleção.",
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
    dataNote: "Destaques por jogos e gols sofridos.",
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
    dataNote: "Palpite de longo prazo; segue aberto até o prazo configurado.",
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
    dataNote: "O resultado final é confirmado pelo admin após a decisão.",
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
    teaser: "Palpite especial.",
    highlightTitle: "Destaques",
    pickLabel: "Minha escolha",
    searchPlaceholder: "Buscar opção",
    emptyDetail: "Escolha uma opção para ver os detalhes.",
    dataNote: "Resultado corrigível pelo admin.",
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
  const completed = markets.filter(
    (market) => market.predictions.length === market.pickCount,
  ).length;
  const next = markets.find(
    (market) => !market.locked && market.predictions.length < market.pickCount,
  );
  return { total, completed, next };
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
