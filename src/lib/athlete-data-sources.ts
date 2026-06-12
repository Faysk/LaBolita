export type AthleteDataSource = {
  id: string;
  name: string;
  href: string;
  envVar?: string;
  badge: string;
  coverage: string;
  strengths: string;
  risks: string;
  recommendation: "recommended" | "fallback" | "research";
};

export const ATHLETE_DATA_SOURCES: AthleteDataSource[] = [
  {
    id: "api-football",
    name: "API-Football / API-Sports",
    href: "https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports",
    envVar: "APIFOOTBALL_KEY",
    badge: "Melhor encaixe",
    coverage:
      "World Cup 2026 com fixtures, eventos, lineups, estatisticas de jogadores, artilharia, assistencias e cartoes.",
    strengths:
      "Tem endpoints claros para jogadores, eventos ao vivo e rankings da competicao.",
    risks:
      "Exige chave, limite de plano e validacao de licenca antes de abrir em producao.",
    recommendation: "recommended",
  },
  {
    id: "balldontlie",
    name: "BALLDONTLIE FIFA API",
    href: "https://fifa.balldontlie.io/",
    envVar: "BALLDONTLIE_FIFA_API_KEY",
    badge: "Boa alternativa",
    coverage:
      "Times, estadios, jogadores, elencos, partidas, classificacao, lineups, eventos e estatisticas por partida.",
    strengths:
      "Modelo simples para prototipar pagina de jogadores e eventos por partida.",
    risks:
      "Precisa confirmar limites e estabilidade durante jogos ao vivo.",
    recommendation: "fallback",
  },
  {
    id: "football-data",
    name: "football-data.org",
    href: "https://www.football-data.org/documentation/api",
    envVar: "FOOTBALL_DATA_API_KEY",
    badge: "Fallback",
    coverage:
      "Fixtures, tabelas, lineups/substitutos, artilheiros, assistencias, cartoes e elencos conforme cobertura do plano.",
    strengths:
      "API madura e documentada, util para cruzar dados e validar divergencias.",
    risks:
      "Cobertura por plano pode limitar estatisticas profundas de atletas.",
    recommendation: "fallback",
  },
  {
    id: "sportmonks",
    name: "Sportmonks",
    href: "https://www.sportmonks.com/football-api/free-plan/",
    envVar: "SPORTMONKS_API_TOKEN",
    badge: "Pago/escala",
    coverage:
      "Live scores, fixtures, estatisticas, jogadores e widgets com planos progressivos.",
    strengths:
      "Bom caminho se o produto crescer e precisar SLA mais forte.",
    risks:
      "Dados de Copa e estatisticas completas tendem a exigir plano pago.",
    recommendation: "research",
  },
  {
    id: "openfootball",
    name: "openfootball/worldcup.json",
    href: "https://github.com/openfootball/worldcup.json",
    badge: "Aberto",
    coverage:
      "Dados historicos e estruturais da Copa em JSON publico.",
    strengths:
      "Sem chave e bom para fixtures historicos ou validacao leve.",
    risks:
      "Nao resolve eventos ao vivo, assists, cartoes, faltas e estatisticas por atleta.",
    recommendation: "research",
  },
];

export function athleteSourceStatuses() {
  return ATHLETE_DATA_SOURCES.map((source) => ({
    ...source,
    configured: source.envVar ? Boolean(process.env[source.envVar]) : true,
  }));
}
