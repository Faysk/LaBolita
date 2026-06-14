import type { SpecialOption } from "@/lib/special-markets";

type PlayerInsightOption = Pick<
  SpecialOption,
  | "age"
  | "caps"
  | "club"
  | "goals"
  | "groupName"
  | "label"
  | "number"
  | "position"
  | "teamCode"
  | "teamName"
>;

const CURATED_PLAYER_INSIGHTS: Record<string, string> = {
  "ARG:10":
    "Argentina tem nele o jogador que organiza o ritmo e decide no último terço. É escolha forte quando a aposta envolve criação, bola parada e protagonismo em jogos grandes.",
  "BEL:7":
    "Bélgica ganha muito quando ele encontra espaço entre as linhas. É perfil de passe final, bola parada e controle de jogo, mais valioso para assistências e Bola de Ouro do que para volume puro de gols.",
  "BEL:9":
    "Bélgica tem nele uma referência clara de área. É palpite de teto alto quando a seleção consegue cruzar, acelerar pelos lados e manter presença constante perto do gol.",
  "BIH:11":
    "Bósnia e Herzegovina depende bastante da leitura de área dele. É uma aposta de experiência: menos velocidade, mais posicionamento, jogo aéreo e frieza em chances curtas.",
  "BRA:10":
    "Brasil tem nele o jogador que mais muda o ritmo perto da área: atrai marcação, cria faltas, acelera tabelas e pode aparecer tanto para finalizar quanto para servir.",
  "CAN:10":
    "Canadá ganha profundidade e mobilidade com ele. É uma escolha interessante quando o jogo pede ataque em transição, pressão alta e finalização rápida.",
  "COL:10":
    "Colômbia costuma crescer quando ele recebe liberdade para pensar o último passe. É aposta natural para assistências e bolas paradas, especialmente se a seleção controlar o meio.",
  "CRO:10":
    "Croácia tem nele o metrônomo do time. O valor do palpite está em controle, bola parada e influência em jogo eliminatório, mesmo sem depender de números altos de gol.",
  "EGY:10":
    "Egito tem nele seu principal ponto de aceleração. Quando encontra campo para atacar em diagonal, vira ameaça direta para gols, assistências e decisões em jogo grande.",
  "ENG:9":
    "Inglaterra tem um centroavante que também constrói. Ele pode pontuar como finalizador, mas ganha peso porque baixa para conectar jogadas e abrir espaço para quem vem de trás.",
  "ESP:16":
    "Espanha ganha equilíbrio quando ele dita a saída e protege a frente da defesa. É escolha mais voltada a Bola de Ouro se o torneio premiar domínio coletivo e regularidade.",
  "ESP:19":
    "Espanha tem nele uma aposta de brilho e desequilíbrio. O caminho passa por um torneio de impacto: drible, um contra um e participação direta em gols importantes.",
  "ESP:20":
    "Espanha ganha fluidez quando ele acelera por dentro. É perfil de criação e controle, bom para leitura de assistências se a seleção transformar posse em chances claras.",
  "FRA:10":
    "França tem nele um dos ataques mais difíceis de defender em campo aberto. A aposta cresce em jogos de transição, profundidade e decisões de mata-mata.",
  "KOR:7":
    "Coreia do Sul tem nele seu principal caminho para virar defesa em ataque. É palpite que depende de espaço para correr, finalização limpa e bola longa bem atacada.",
  "MEX:13":
    "México tem um goleiro de torneio, daqueles que podem crescer quando a pressão aumenta. Para Luva de Ouro, precisa combinar grandes defesas com campanha defensiva longa.",
  "NED:10":
    "Países Baixos ganham improviso e finalização com ele. É escolha de ataque flexível: pode aparecer como referência, segundo atacante ou bola parada.",
  "NOR:9":
    "Noruega tem nele o finalizador mais direto do elenco. Se o time criar volume, poucos transformam espaço e cruzamento em chance clara com tanta naturalidade.",
  "NOR:10":
    "Noruega depende da capacidade dele de organizar a criação. É uma escolha mais fina para assistências: passe vertical, bola parada e controle do ritmo ofensivo.",
  "POR:7":
    "Portugal tem nele um especialista em decisão. Presença de área, pênaltis, jogo aéreo e leitura de grandes momentos mantêm o teto alto mesmo em partidas travadas.",
  "POR:8":
    "Portugal ganha agressividade no passe quando ele recebe entre linhas. É palpite forte para assistências e bola parada, principalmente se o time dominar território.",
  "QAT:10":
    "Qatar tem nele liderança e repertório para organizar ataques. É escolha de contexto: vale mais quando o time consegue ter bola e transformar experiência em último passe.",
  "QAT:11":
    "Qatar ganha criatividade e cobrança de bola parada com ele. É uma aposta interessante para assistências, especialmente em jogos decididos por detalhes.",
  "QAT:19":
    "Qatar tem nele presença constante no ataque. Para artilharia, o caminho passa por ser a referência de área e converter as poucas chances em jogos equilibrados.",
  "SEN:10":
    "Senegal tem nele um atacante de decisão e intensidade. A aposta melhora quando o jogo abre espaço para atacar costas da defesa e resolver em poucos toques.",
  "USA:10":
    "Estados Unidos tem nele a principal faísca no terço final. É escolha boa para quem acredita em condução, chegada na área e protagonismo em jogos de alta rotação.",
};

export function playerDetailInsight(option: PlayerInsightOption) {
  const curated = CURATED_PLAYER_INSIGHTS[playerIdentityKey(option)];
  if (curated) return curated;

  const teamContext = option.groupName
    ? `${option.teamName} entra no ${option.groupName} com uma leitura bem específica para esse nome.`
    : `${option.teamName} tem uma leitura bem específica para esse nome.`;
  const role = roleInsight(option);
  const experience = experienceInsight(option);
  const club = clubContextInsight(option.club);

  return [teamContext, role, experience, club].filter(Boolean).join(" ");
}

function playerIdentityKey(option: PlayerInsightOption) {
  return `${option.teamCode.toUpperCase()}:${option.number ?? "?"}`;
}

function roleInsight(option: PlayerInsightOption) {
  if (option.position === "GK") {
    return "Para goleiro, o valor está em sequência de jogos sem sofrer gol, volume de defesas difíceis e uma seleção que consiga avançar protegida.";
  }

  if (option.position === "DF") {
    if ((option.goals ?? 0) >= 5) {
      return "É defensor com ameaça real em bola parada, então pode aparecer em lances raros que mudam uma campanha inteira.";
    }
    return "É defensor de segurança: ganha relevância se a seleção sofrer pouco, controlar a área e passar por jogos apertados.";
  }

  if (option.position === "MF") {
    if ((option.goals ?? 0) >= 20) {
      return "É meio-campista que também pisa na área, então pode render em criação sem depender apenas do último passe.";
    }
    return "É meio-campista de influência: vale observar se ele dita ritmo, participa da bola parada e chega perto da área com frequência.";
  }

  if ((option.goals ?? 0) >= 50) {
    return "É referência ofensiva da seleção, com leitura de área e peso suficiente para decidir mesmo quando o time cria pouco.";
  }

  return "É atacante de aposta mais aberta: precisa transformar minutos, movimentação e encaixe coletivo em chances claras.";
}

function experienceInsight(option: PlayerInsightOption) {
  const caps = option.caps ?? 0;
  const age = option.age ?? 0;

  if (caps >= 100 && age >= 33) {
    return "A experiência pesa em leitura de jogo, escolha de finalização e calma quando a partida aperta.";
  }
  if (caps >= 80) {
    return "A rodagem internacional ajuda porque ele já conhece o peso de jogo grande e tende a errar menos nas decisões.";
  }
  if (age <= 23 && caps >= 20) {
    return "É escolha de explosão: já tem espaço na seleção, mas ainda pode transformar um grande torneio em salto de status.";
  }
  if (age <= 23) {
    return "É aposta de upside, boa para quem quer fugir do óbvio e confiar em minutos de impacto.";
  }
  if (caps < 20) {
    return "É uma escolha mais arriscada: pode render se ganhar papel maior durante a Copa, mas depende de minutagem.";
  }

  return "O ponto principal é encaixe: se ele tiver função clara no time, o palpite deixa de ser só nome e vira leitura de contexto.";
}

function clubContextInsight(club?: string | null) {
  if (!club) return "";
  if (club.includes("(ENG)")) {
    return "A rotina em futebol de alta intensidade combina bem com jogos físicos e transições rápidas.";
  }
  if (club.includes("(ESP)")) {
    return "A rotina em futebol de posse e tomada de decisão ajuda quando a partida pede paciência no último terço.";
  }
  if (club.includes("(GER)")) {
    return "A rotina em jogo vertical e físico favorece quem precisa acelerar ataques e atacar espaço.";
  }
  if (club.includes("(ITA)")) {
    return "A rotina em futebol tático favorece leitura de espaço, posicionamento e decisões em partidas fechadas.";
  }
  if (club.includes("(FRA)")) {
    return "A rotina competitiva ajuda a sustentar intensidade e responsabilidade ofensiva em sequência curta de torneio.";
  }
  if (club.includes("(BRA)") || club.includes("(ARG)") || club.includes("(MEX)") || club.includes("(USA)")) {
    return "A adaptação ao continente pode ajudar em viagem, clima e ritmo de jogos nas Américas.";
  }
  if (club.includes("(KSA)") || club.includes("(QAT)") || club.includes("(UAE)")) {
    return "O contexto de clube costuma dar protagonismo, algo útil para chegar confiante em jogadas decisivas.";
  }

  return "O histórico recente de clube ajuda a entender ritmo competitivo, mas a função na seleção é o que mais pesa no palpite.";
}
