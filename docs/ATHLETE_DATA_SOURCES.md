# Dados de Atletas

Objetivo: listar gols, assistencias, cartoes, faltas, minutos, artilharia,
rankings por selecao e eventos por partida sem comprometer a confiabilidade do
bolao.

## Decisao inicial

Nao usar scraping fragil como fonte principal em producao.

O caminho recomendado e integrar um provedor com chave, limites claros e cache
server-side. A pagina `/competicao/jogadores` ja lista as fontes avaliadas e
mostra se a chave de cada uma esta configurada.

## Fonte recomendada

1. API-Football / API-Sports
   - Variavel: `APIFOOTBALL_KEY`.
   - Tem endpoints para World Cup 2026 com fixtures, eventos, lineups,
     estatisticas de jogadores, artilharia, assistencias e cartoes.
   - Melhor encaixe para o que o LaBolita quer exibir ao vivo.

## Alternativas

2. BALLDONTLIE FIFA API
   - Variavel: `BALLDONTLIE_FIFA_API_KEY`.
   - Boa alternativa para elencos, partidas, eventos e estatisticas por jogo.

3. football-data.org
   - Variavel: `FOOTBALL_DATA_API_KEY`.
   - Boa fonte secundaria para fixtures, tabelas, lineups e eventos, conforme o
     plano contratado.

4. Sportmonks
   - Variavel: `SPORTMONKS_API_TOKEN`.
   - Caminho mais robusto se o produto precisar SLA e dados pagos.

5. openfootball/worldcup.json
   - Sem chave.
   - Util para dados estruturais/historicos, mas nao resolve estatisticas ao
     vivo por atleta.

## Proximo passo tecnico

Quando a fonte for escolhida, criar migrations para:

- `athletes`
- `team_rosters`
- `match_events`
- `athlete_match_stats`
- `athlete_provider_mappings`

Depois criar um sync server-side com cache, auditoria de divergencias e origem
do dado em cada linha.
