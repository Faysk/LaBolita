# Dados de Atletas

O produto exibe dados de atletas em duas camadas.

## Elencos oficiais

A base atual vem da lista oficial da FIFA:

- Fonte: `https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf`
- Versão usada: `Friday, 12 June 2026 04:24 UTC | Version 1`
- Arquivo gerado: `src/data/world-cup-2026-squads.json`
- Cobertura: 48 seleções, 1.248 jogadores, 26 atletas por seleção.

Campos disponíveis:

- número;
- posição;
- nome de camisa;
- nome completo;
- data de nascimento;
- clube;
- altura;
- jogos pela seleção;
- gols pela seleção.

Esses dados alimentam `/competicao/jogadores` e as páginas individuais de seleção.

## Eventos da Copa

Gols, assistências, cartões, substituições, faltas e estatísticas por partida
devem entrar como uma segunda camada, porque dependem de feed de eventos ao
vivo ou pós-jogo.

Critério antes de exibir em produção:

- origem identificada em cada evento;
- cache server-side;
- atualização auditável;
- divergências visíveis para admin;
- possibilidade de correção manual.

Enquanto essa camada não estiver pronta, a interface não deve prometer
assistências, cartões ou faltas individuais como dado confirmado.
