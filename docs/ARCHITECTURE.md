# Arquitetura

LaBolita e uma aplicacao web com foco em experiencia mobile, rankings de bolao e
regras de pontuacao consistentes.

## Camadas

- Interface: paginas do Next.js e componentes React.
- Dominio: regras de pontuacao, formatacao, preferencia de usuario e exibicao de
  partidas.
- Dados: leitura do banco, dados de Copa, elencos e assets publicos.
- Banco: persistencia, integridade das regras principais e historico.
- Operacao: smokes, validadores e scripts de apoio.

## Fluxos Principais

- Usuario entra, aceita o fluxo de conta e participa do bolao oficial.
- Usuario preenche palpites de partidas ate o bloqueio.
- Ranking e atualizado conforme resultados confirmados.
- Palpites especiais ficam em fluxo separado para nao misturar placar e extras.
- Administrador acompanha resultados e corrige divergencias quando necessario.

## Homologacao E Producao

Homologacao fica a frente de producao e recebe mudancas para teste. Producao
recebe apenas o que passou por validacao funcional, visual e operacional.

## Assets

As bandeiras ficam em `public/flags/`. As figurinhas de jogadores ficam em
`public/stickers/players/` em formato otimizado. Quando uma figurinha ainda nao
existe, o app usa uma arte gerada por componente para manter a tela completa.
