# Regras do LaBolita

## Palpites

- Cada usuário possui um palpite universal por partida.
- O mesmo palpite vale em todos os bolões dos quais o usuário participa.
- O palpite pode ser criado ou alterado até `prediction_lock_at`.
- O horário do PostgreSQL decide o bloqueio; o relógio do navegador não vale.
- Palpites de outros participantes só ficam visíveis depois do bloqueio.
- O placar considerado é o resultado após prorrogação, sem cobranças de pênaltis.
- No mata-mata, quem avança é informado separadamente.

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

Acertar quem avança no mata-mata rende mais 3 pontos, sem multiplicador. O bônus
não existe na fase de grupos nem na disputa de terceiro lugar.

## Bolões e ranking

- Ao entrar em um bolão, o participante começa a pontuar nas partidas que ainda
  não estavam bloqueadas naquele instante.
- Pontos antigos não entram retroativamente.
- Desempate: pontos totais, placares exatos, resultados corretos e, por último,
  nome para ordenação determinística.
- Correções de resultado recalculam o ranking e ficam registradas no histórico.

## Casos operacionais

- Jogo adiado: o administrador deve atualizar `scheduled_at` e
  `prediction_lock_at` antes do horário original. Se o bloqueio já ocorreu, a
  reabertura exige `allow_reopen = true`, justificativa auditável e comunicação.
- Jogo cancelado: status `cancelled`; não pontuar.
- Resultado corrigido: usar `finalize_match` novamente com justificativa.
- Partida mata-mata empatada nos pênaltis: salvar o empate após prorrogação e a
  seleção classificada separadamente.
