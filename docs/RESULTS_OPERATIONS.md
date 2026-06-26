# Resultados E Sincronizacao

O app pode exibir placares observados durante a partida e resultados finais
confirmados.

## Estados De Partida

- Agendada: ainda nao comecou.
- Ao vivo: ha placar observado em andamento.
- Finalizada: resultado confirmado e pronto para pontuacao.
- Divergente: ha informacao que pede revisao.

## Regras De Uso

- Placar ao vivo e informativo.
- Ranking definitivo depende de resultado confirmado.
- Correcoes devem preservar historico.
- Em caso de duvida, a decisao operacional deve privilegiar clareza para os
  jogadores e consistencia do ranking.

## Mata-Mata

O mesmo cron de resultados consulta o bracket oficial da FIFA e preenche
automaticamente participantes do mata-mata quando a propria FIFA ja publicou o
time em um slot da partida. A chave de cruzamento e o numero oficial da partida.

O sync nao calcula combinacoes de melhores terceiros nem deduz classificados a
partir da tabela. Se a FIFA ainda mostra apenas um placeholder, o app preserva o
slot local como esta. Quando o time aparece no bracket oficial, o banco aplica a
mudanca por service role, registra auditoria e bloqueia qualquer alteracao em
partidas travadas, em andamento/finalizadas ou com palpites existentes.

Variaveis opcionais:

- `FIFA_BRACKET_FEED_URL`: sobrescreve o endpoint oficial usado pelo cron.
- `FIFA_BRACKET_SYNC_DISABLED=true`: pausa apenas o preenchimento automatico do
  mata-mata.

## Palpites Especiais

Algumas categorias podem receber sugestoes automaticas a partir dos dados da
Copa. O resultado final continua revisavel no painel para proteger a disputa de
erros de fonte ou criterio.
