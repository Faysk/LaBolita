# LaBolita

LaBolita e um bolao recreativo da Copa 2026. A pessoa faz palpites de placar,
acompanha rankings em tempo real, participa automaticamente do bolao oficial e
pode criar ou entrar em grupos com amigos.

O app tambem tem palpites especiais, como artilheiro, assistencias, campeao,
vice, semifinalistas e selecoes destaque. Eles ficam separados dos placares para
deixar a disputa mais rica sem confundir o ranking das partidas.

## O Que O App Entrega

- Palpites de placar por partida, com bloqueio no horario do jogo.
- Bolao oficial para todo usuario autenticado, sem depender de convite.
- Boloes publicos e privados com ranking proprio.
- Ranking geral, ranking por bolao e historico de pontuacao.
- Jogos em destaque na home, com prioridade para partida ao vivo.
- Pagina da Copa com grupos, eliminatorias, selecoes e elencos.
- Palpites especiais com busca por jogadores e selecoes.
- Preferencias de conta: tema, fuso horario, nome publico e foto publica.
- Painel administrativo para acompanhar resultados, participantes e auditoria.

## Stack

- Next.js, React, TypeScript e Tailwind CSS.
- Supabase para banco, autenticacao e regras de acesso.
- Vitest e testes de fluxo para validar regras criticas.
- Vercel para publicacao.

## Rodar Localmente

Requisitos: Node.js 22+.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Para usar dados reais, copie `.env.example` para `.env.local` e preencha as
variaveis do ambiente correspondente. Sem essas variaveis, o app continua
funcionando em modo local de validacao.

## Validacao

Antes de publicar qualquer alteracao, rode:

```bash
npm run check
npm audit --json
```

Quando a alteracao ja estiver em homologacao, rode tambem o smoke do ambiente
online:

```bash
npm run test:homolog
```

Antes de promover para producao:

```bash
npm run test:production:current
```

## Estrutura

```text
src/app/             rotas, paginas e handlers do Next.js
src/components/      componentes visuais e fluxos interativos
src/lib/             regras de negocio, formatacao e leitura de dados
src/data/            dados de Copa, elencos e informacoes auxiliares
public/flags/        bandeiras usadas no app
public/stickers/     figurinhas otimizadas dos jogadores
supabase/            migrations, seeds e testes de banco
scripts/             validadores, smokes e utilitarios
docs/                documentacao de produto, operacao e roadmap
```

## Documentacao

- [Regras do produto](docs/PRODUCT_RULES.md)
- [Operacao administrativa](docs/ADMIN_OPERATIONS.md)
- [Resultados e sincronizacao](docs/RESULTS_OPERATIONS.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Ambiente de homologacao](docs/HOMOLOGATION_ENVIRONMENT.md)
- [Backups](docs/DATABASE_BACKUPS.md)
- [Album de figurinhas](docs/STICKER_ALBUM.md)
- [Roadmap](docs/ROADMAP.md)

## Principios

- O usuario deve conseguir jogar sem entender detalhes tecnicos.
- Toda exibicao publica respeita a preferencia de privacidade da foto.
- Homologacao recebe as novidades primeiro; producao recebe apenas o que foi
  validado.
- Regras de pontuacao e bloqueio devem ser previsiveis, auditaveis e testadas.
