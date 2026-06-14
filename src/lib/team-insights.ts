import type { SpecialOption, SpecialTeamStats } from "@/lib/special-markets";

type TeamInsightOption = Pick<
  SpecialOption,
  | "groupName"
  | "squadAverageAge"
  | "squadAverageHeight"
  | "squadMostCappedCaps"
  | "squadTopScorerGoals"
  | "teamCode"
  | "teamName"
  | "teamStats"
>;

const CURATED_TEAM_INSIGHTS: Record<string, string> = {
  ARG: "Argentina é leitura de controle emocional e repertório ofensivo: quando consegue mandar no ritmo, vira candidata forte para campanha longa e jogos decididos em detalhe.",
  BEL: "Bélgica ainda carrega muito talento no último terço. O palpite faz sentido quando você acredita em criação por dentro, bolas paradas e centroavante recebendo volume.",
  BRA: "Brasil é escolha de teto alto: tem desequilíbrio individual, alternativas de ataque e tradição em transformar pressão ofensiva em sequência de gols.",
  CAN: "Canadá é palpite de aceleração. Quando encontra espaço para transição e ataque pelos lados, pode machucar defesas mais lentas.",
  COL: "Colômbia costuma crescer quando controla a bola parada e deixa seus criadores próximos da área. É uma escolha interessante para quem vê força coletiva mais do que favoritismo óbvio.",
  CRO: "Croácia é leitura de maturidade: controla fases do jogo, sofre pouco quando está organizada e costuma competir bem quando o torneio aperta.",
  ENG: "Inglaterra combina elenco profundo com muito poder de área. Para especiais, é uma seleção que pode render tanto em gols quanto em caminho de mata-mata.",
  ESP: "Espanha é aposta de posse e volume territorial. Se transformar domínio em finalizações claras, vira candidata natural a ataque produtivo e campanha longa.",
  FRA: "França é uma das leituras mais fortes de explosão: quando tem campo para correr, cria chances grandes sem precisar de muitos passes.",
  GER: "Alemanha tende a ser palpite de volume: pressão alta, chegada de meio-campo e muita gente atacando a área quando o jogo encaixa.",
  KOR: "Coreia do Sul é escolha de transição e disciplina. O caminho passa por sobreviver bem sem bola e atacar rápido quando o adversário se abre.",
  MEX: "México é leitura de competitividade e ambiente. Pode crescer em jogos físicos, mas precisa transformar intensidade em chances limpas para brigar em especiais de ataque.",
  NED: "Países Baixos têm boa mistura de imposição física e qualidade técnica. É uma seleção perigosa quando controla duelos e acelera pelos lados.",
  NOR: "Noruega é aposta de eficiência ofensiva: se conseguir alimentar bem sua referência de área, pode marcar muito mesmo com menos posse.",
  POR: "Portugal tem elenco para variar caminhos de gol: bola parada, cruzamento, meia chegando e atacantes com decisão. É seleção de teto alto nos especiais.",
  QAT: "Qatar é leitura de organização e entrosamento. Para especiais, depende de competir bem em jogos equilibrados e aproveitar poucas chances.",
  SEN: "Senegal é escolha de força física e transição. Quando consegue recuperar alto e atacar espaço, vira rival desconfortável para qualquer defesa.",
  USA: "Estados Unidos têm energia, velocidade e adaptação ao torneio em casa. É palpite que cresce se o time transformar ritmo em pressão constante.",
};

export function teamDetailInsight(option: TeamInsightOption, marketKey: string) {
  const curated = CURATED_TEAM_INSIGHTS[option.teamCode.toUpperCase()];
  const campaign = campaignInsight(option.teamStats);
  const squad = squadInsight(option);
  const market = marketInsight(marketKey);

  return [curated ?? genericTeamInsight(option), campaign, squad, market]
    .filter(Boolean)
    .join(" ");
}

function genericTeamInsight(option: TeamInsightOption) {
  const group = option.groupName ? `${option.groupName}` : "seu grupo";
  return `${option.teamName} é uma escolha de contexto no ${group}: o palpite depende menos do nome e mais de encaixe, sequência de jogos e capacidade de competir sem se desorganizar.`;
}

function campaignInsight(stats?: SpecialTeamStats) {
  if (!stats || stats.played === 0) {
    return "Como a campanha ainda não deu amostra suficiente, a leitura principal vem do elenco e do caminho provável.";
  }

  if (stats.wins > 0 && stats.goalsAgainst === 0) {
    return "A largada mostra uma equipe protegida, o que aumenta confiança para mercados defensivos e caminho de torneio.";
  }
  if (stats.goalsFor > stats.goalsAgainst) {
    return "O começo indica saldo positivo, mas ainda pede cuidado para não supervalorizar uma amostra pequena.";
  }
  if (stats.goalsAgainst > stats.goalsFor) {
    return "A campanha começou pedindo reação; nesse caso, o palpite é mais agressivo e depende de ajuste rápido.";
  }
  if (stats.goalsFor === 0) {
    return "Ainda falta sinal ofensivo forte, então a aposta em gols exige confiar em melhora de criação.";
  }

  return "A amostra inicial ainda é curta; vale olhar mais o padrão de jogo do que o placar isolado.";
}

function squadInsight(option: TeamInsightOption) {
  const parts: string[] = [];

  if ((option.squadTopScorerGoals ?? 0) >= 50) {
    parts.push("O elenco tem uma referência de gol já consolidada.");
  } else if ((option.squadTopScorerGoals ?? 0) >= 25) {
    parts.push("Há ao menos uma referência ofensiva com bom histórico pela seleção.");
  } else {
    parts.push("A produção ofensiva tende a depender mais do coletivo do que de um nome isolado.");
  }

  if ((option.squadMostCappedCaps ?? 0) >= 100) {
    parts.push("A experiência internacional ajuda a atravessar jogos travados.");
  } else if ((option.squadAverageAge ?? 0) <= 25) {
    parts.push("O elenco tem perfil mais jovem, com potencial de crescer durante a competição.");
  }

  if ((option.squadAverageHeight ?? 0) >= 185) {
    parts.push("A média de altura também pode pesar em bola parada.");
  }

  return parts.join(" ");
}

function marketInsight(marketKey: string) {
  if (marketKey === "team_most_goals") {
    return "Para mais gols, procure volume, bola parada e chance de jogar mais partidas; favoritismo sozinho não basta.";
  }
  if (marketKey === "team_fewest_conceded") {
    return "Para menos gols sofridos, avanço no torneio ajuda, mas a chave é defender bem sem precisar se expor demais.";
  }
  if (marketKey === "champion") {
    return "Para campeão, o palpite precisa combinar elenco, caminho e capacidade de resolver jogos ruins.";
  }
  if (marketKey === "runner_up") {
    return "Para vice, vale pensar em seleção forte o bastante para chegar à final, mesmo que não seja sua favorita máxima.";
  }
  if (marketKey === "semifinalists") {
    return "Para semifinalistas, equilíbrio é melhor que só escolher favoritos: caminho de chave e consistência contam muito.";
  }
  return "O melhor palpite junta força de elenco, momento e caminho provável até as fases decisivas.";
}
