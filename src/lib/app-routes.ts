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
    description: "Visão pública e próximos jogos.",
    icon: Home,
  },
  live: {
    href: "/ao-vivo",
    label: "Ao vivo",
    description: "Placar, parciais e posições ao vivo.",
    icon: Radio,
  },
  dashboard: {
    href: "/painel",
    label: "Meu painel",
    mobileLabel: "Painel",
    description: "Seu resumo, tarefas e posição.",
    icon: LayoutDashboard,
  },
  predictions: {
    href: "/palpites",
    label: "Palpites",
    description: "Marque placares e compare jogos.",
    icon: Target,
  },
  pools: {
    href: "/boloes",
    label: "Bolões",
    description: "Rankings, convites e participantes.",
    icon: BarChart3,
  },
  games: {
    href: "/jogos",
    label: "Jogos",
    description: "Calendário, horários e resultados.",
    icon: CalendarDays,
  },
  specials: {
    href: "/especiais",
    label: "Especiais",
    description: "Campeão, artilheiro e finais.",
    icon: Sparkles,
  },
  players: {
    href: "/jogadores",
    label: "Jogadores",
    description: "Elencos, figurinhas e estatísticas.",
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
    description: "Pontuação, bônus e desempates.",
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
