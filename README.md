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
build e um fluxo ponta a ponta em Chrome/Chromium. Também sobe um PostgreSQL
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
set is_admin = true
where id = 'UUID_DO_USUARIO';
```

Para importar a agenda completa a partir do formato validado em
`data/schedule.example.json`:

```bash
npm run schedule:validate
npm run schedule:import -- caminho/agenda-oficial.json
```

O importador usa a service role somente no processo Node local e nunca a envia
ao navegador.

Antes do lançamento, exija exatamente 48 seleções e 104 partidas:

```bash
node --env-file=.env.local scripts/import-schedule.mjs --validate-only --require-complete caminho/agenda-oficial.json
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

O calendário mínimo do seed contém a abertura confirmada entre México e África
do Sul. Antes do beta, os 104 jogos precisam ser importados e conferidos com o
[calendário oficial da FIFA](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums).

Veja o plano urgente em [docs/ROADMAP.md](docs/ROADMAP.md).
