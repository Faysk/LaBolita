# LaBolita

Bolão mobile-first para a Copa do Mundo 2026. O usuário faz um único conjunto
de palpites e disputa simultaneamente em todos os seus bolões.

O projeto funciona imediatamente em **modo demonstração**, sem contas ou
serviços externos. Quando as variáveis do Supabase são preenchidas, as mesmas
telas passam automaticamente a usar autenticação, partidas, palpites e rankings
reais.

## Stack

- Next.js 16, React 19, TypeScript e Tailwind CSS 4
- Supabase PostgreSQL, Auth, RLS e RPCs transacionais
- Vercel para aplicação e Cloudflare para DNS
- Vitest para regras de pontuação e pgTAP para o banco

## Rodar localmente

Requisitos: Node.js 22+.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O endpoint
`/api/health` informa conexão, contagem da agenda e se o banco está pronto para
lançamento.

Validação completa da aplicação:

```bash
npm run check
```

`npm run check` executa lint, tipos, regras de pontuação, validação da agenda,
um build isolado de demonstração e um fluxo ponta a ponta em Chrome/Chromium.
Também sobe um PostgreSQL
embutido para aplicar a migration, carregar o seed e provar privacidade de
palpites, entrada tardia, finalização e correção de resultados sem exigir
Docker.

## Ativar Supabase

1. Crie um projeto no Supabase.
2. Copie `.env.example` para `.env.local` e preencha URL e chaves.
3. Vincule a CLI e aplique o banco:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
npx supabase db seed --linked
```

4. Em Authentication > Providers, habilite Google.
5. Cadastre `http://localhost:3000/auth/callback` e
   `https://labolita.faysk.dev/auth/callback` como redirects permitidos.
6. Depois do primeiro login, conceda administração pelo SQL Editor:

```sql
update public.profiles
set is_admin = true, is_master_admin = true
where id = 'UUID_DO_USUARIO';
```

Para regenerar, validar e importar a agenda completa:

```bash
npm run schedule:build
node scripts/import-schedule.mjs --validate-only --require-complete data/world-cup-2026.json
npm run schedule:verify:sources
npm run schedule:import -- --require-complete data/world-cup-2026.json
```

O importador usa a service role somente no processo Node local e nunca a envia
ao navegador. O arquivo completo contém proveniência, identificadores do
provedor e rótulos da árvore mata-mata.

Antes do lançamento, exija exatamente 48 seleções e 104 partidas:

```bash
node --env-file=.env.local scripts/import-schedule.mjs --validate-only --require-complete data/world-cup-2026.json
```

Para executar Supabase e pgTAP localmente também é necessário Docker Desktop:

```bash
npm run db:start
npm run db:reset
npm run db:test
npm run db:lint
```

## Regras protegidas no banco

- O relógio do servidor bloqueia o palpite no horário da partida.
- Não existem escritas diretas em palpites; tudo passa por `save_prediction`.
- Palpites rivais ficam ocultos até o bloqueio.
- `finalize_match` calcula todos os pontos em uma transação.
- Correções de resultado incrementam versão, recalculam pontos e deixam histórico.
- Quem entra tarde em um bolão não recebe pontos de partidas já bloqueadas.

As regras completas estão em [docs/PRODUCT_RULES.md](docs/PRODUCT_RULES.md).

## Resultados ao vivo

O provedor atualiza apenas um placar observado. Um administrador ainda precisa
confirmar o resultado para pontuar os bolões. Essa separação protege o ranking
contra placares provisórios e erros do fornecedor.

Configure `RESULTS_FEED_URL`, `CRON_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` na
Vercel e use o Supabase Cron para chamar `/api/cron/results` a cada minuto. O
feed principal é validado contra as 104 partidas e há uma contingência gratuita
pela ESPN. O procedimento completo está em
[docs/RESULTS_OPERATIONS.md](docs/RESULTS_OPERATIONS.md).

O fluxo diário do painel, incluindo definição dos participantes do mata-mata,
está em [docs/ADMIN_OPERATIONS.md](docs/ADMIN_OPERATIONS.md).
O fluxo de homologação com banco separado e promoção segura para produção está
em [docs/HOMOLOGATION_ENVIRONMENT.md](docs/HOMOLOGATION_ENVIRONMENT.md).

Smoke tests que usam a infraestrutura real:

```bash
npm run auth:smoke:remote
npm run db:smoke:remote
npm run results:smoke:remote
npm run test:homolog
npm run test:production
```

Execute `auth:smoke:remote` antes de cada deploy que altere login, perfis ou
termos. Ele é somente leitura e detecta provider Google desabilitado, migrations
de autenticação ausentes e configuração inválida do administrador master.

## Publicar governança e aceite de termos

A migration `202606070008_public_pools_master_admin_and_terms.sql` adiciona
descoberta pública paginada, administração master, arquivamento reversível e
aceite versionado dos termos. Aplique e publique nesta ordem:

```bash
npx supabase db push --linked
# faça o commit/push para a Vercel publicar a interface
npm run db:smoke:remote
npm run test:production
```

Depois do deploy, entre novamente, aceite os termos e ative a exigência rígida
no bloco **Administração master**. Ela começa desligada no banco para manter o
frontend anterior funcional durante o rollout.

## Estrutura principal

```text
src/app/                 páginas e rotas Next.js
src/components/          interface e fluxos interativos
src/lib/data/            leitura Supabase com fallback para demonstração
src/lib/scoring.ts       motor de pontuação TypeScript
supabase/migrations/     modelo, RLS e funções transacionais
supabase/tests/database/ testes pgTAP equivalentes ao motor TypeScript
docs/                    decisões, regras e plano de lançamento
```

## Implantação

Importe o repositório na Vercel, configure as mesmas variáveis de `.env.example`
e adicione `labolita.faysk.dev` como domínio. No Cloudflare, crie o registro
indicado pela própria Vercel; mantenha o proxy desligado durante a validação
inicial do domínio.

O banco publicado já pode receber os 104 jogos de `data/world-cup-2026.json`.
Antes de alterações futuras, confira sempre o
[calendário oficial da FIFA](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums).

As páginas públicas exigidas pelo login Google estão disponíveis em
`/privacidade` e `/termos`. Garanta que `contato@faysk.dev` receba mensagens.

Veja o plano urgente em [docs/ROADMAP.md](docs/ROADMAP.md).
