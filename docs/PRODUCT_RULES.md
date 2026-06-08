# Regras do LaBolita

## Palpites

- Cada usuário possui um palpite universal por partida.
- O mesmo palpite vale em todos os bolões dos quais o usuário participa.
- O palpite pode ser criado ou alterado até `prediction_lock_at`.
- O horário do PostgreSQL decide o bloqueio; o relógio do navegador não vale.
- Palpites de outros participantes só ficam visíveis depois do bloqueio.
- O placar considerado é o resultado após prorrogação, sem cobranças de pênaltis.
- Na fase de grupos não existe disputa por pênaltis; partidas podem terminar empatadas.
- No mata-mata, quem avança ou vence é informado separadamente.
- Os participantes da fase de 32 são atribuídos pelo administrador após a
  classificação oficial. Vencedores e perdedores das fases seguintes são
  propagados automaticamente.

## Pontuação base

Somente a melhor categoria é aplicada:

| Categoria | Pontos | Condição |
| --- | ---: | --- |
| Placar exato | 10 | Gols das duas seleções corretos |
| Resultado refinado | 7 | Vencedor correto e saldo correto ou gols de uma seleção corretos |
| Resultado correto | 5 | Vitória, derrota ou empate corretos |
| Um placar correto | 2 | Gols de uma seleção corretos, mas resultado errado |
| Erro | 0 | Nenhuma condição atendida |

Empate não exato vale 5 pontos. Saldo zero não transforma automaticamente um
empate em resultado refinado.

## Multiplicadores

| Fase | Multiplicador |
| --- | ---: |
| Grupos | x1 |
| Fase de 32 | x1 |
| Oitavas | x2 |
| Quartas | x3 |
| Semifinais | x4 |
| Terceiro lugar | x2 |
| Final | x5 |

Acertar quem avança no mata-mata rende mais 3 pontos, sem multiplicador. O
bônus não existe na fase de grupos nem na disputa de terceiro lugar, que define
um vencedor mas não classifica ninguém para outra fase.

## Bolões e ranking

- Ao entrar em um bolão, o participante começa a pontuar nas partidas que ainda
  não estavam bloqueadas naquele instante.
- Pontos antigos não entram retroativamente.
- Desempate: pontos totais, placares exatos, resultados corretos e, por último,
  nome para ordenação determinística.
- Correções de resultado recalculam o ranking e ficam registradas no histórico.
- Cada usuário pode participar de até 100 bolões, criar até 20 e cada bolão
  aceita até 500 participantes para proteger a operação gratuita.
- Visitantes podem descobrir bolões públicos em páginas de 9 resultados e ver
  o ranking sem receber códigos de convite ou identificadores privados.
- O dono pode editar, mudar a visibilidade, remover membros e arquivar o próprio
  bolão. Arquivamento nunca apaga o histórico.
- Administradores globais podem recuperar bolões arquivados, suspender contas e
  promover outros administradores. O master principal é único e não pode ser
  alterado, suspenso ou rebaixado.
- A primeira entrada exige aceite versionado dos Termos de Serviço e da Política
  de Privacidade.

## Casos operacionais

- Jogo adiado: o administrador deve atualizar `scheduled_at` e
  `prediction_lock_at` antes do horário original. Se o bloqueio já ocorreu, a
  reabertura exige `allow_reopen = true`, justificativa auditável e comunicação.
- Jogo cancelado: status `cancelled`; não pontuar.
- Resultado corrigido: usar `finalize_match` novamente com justificativa.
- Partida mata-mata empatada nos pênaltis: salvar o empate após prorrogação e a
  seleção classificada separadamente.
- Participantes do mata-mata: não podem ser alterados após o bloqueio ou depois
  que houver palpites para a partida.
