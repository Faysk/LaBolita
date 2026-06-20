import {
  BarChart3,
  CalendarDays,
  CircleHelp,
  Home,
  LayoutDashboard,
  Radio,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type AppRoute = {
  href: string;
  label: string;
  mobileLabel?: string;
  description: string;
  icon: LucideIcon;
};

export const appRoutes = {
  home: {
    href: "/",
    label: "Início",
    description: "Resumo público e próximos jogos.",
    icon: Home,
  },
  live: {
    href: "/ao-vivo",
    label: "Ao vivo",
    description: "Placares, parciais e ranking.",
    icon: Radio,
  },
  dashboard: {
    href: "/painel",
    label: "Meu painel",
    mobileLabel: "Painel",
    description: "Sua fila, pontos e alertas.",
    icon: LayoutDashboard,
  },
  predictions: {
    href: "/palpites",
    label: "Palpites",
    description: "Placar de cada jogo.",
    icon: Target,
  },
  pools: {
    href: "/boloes",
    label: "Bolões",
    description: "Grupos, rankings e comparação.",
    icon: BarChart3,
  },
  games: {
    href: "/jogos",
    label: "Jogos",
    description: "Agenda completa e resultados.",
    icon: CalendarDays,
  },
  specials: {
    href: "/especiais",
    label: "Especiais",
    description: "Palpites finais da Copa.",
    icon: Sparkles,
  },
  players: {
    href: "/jogadores",
    label: "Jogadores",
    description: "Elencos, figurinhas e dados.",
    icon: UsersRound,
  },
  competition: {
    href: "/competicao",
    label: "Copa",
    description: "Grupos, seleções e chave.",
    icon: Trophy,
  },
  rules: {
    href: "/regras",
    label: "Regras",
    description: "Pontuação e desempates.",
    icon: CircleHelp,
  },
} as const satisfies Record<string, AppRoute>;

export type AppRouteKey = keyof typeof appRoutes;

export function appRoute(key: AppRouteKey): AppRoute {
  return appRoutes[key];
}

export function appRouteList(keys: readonly AppRouteKey[]): AppRoute[] {
  return keys.map(appRoute);
}
