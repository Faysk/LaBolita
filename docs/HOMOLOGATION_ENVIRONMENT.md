# Ambiente de Homologacao

Homolog existe para validar codigo, migrations, UI e operacao sem escrever no
banco vivo da producao. Depois que a Copa comecou, qualquer teste que altera
palpites, resultados, usuarios ou bolões deve usar banco separado.

## Recomendacao

- `main` publica producao em `labolita.faysk.dev`.
- `homolog` publica homologacao em `homolog.labolita.faysk.dev`.
- Producao e homolog devem apontar para projetos Supabase diferentes.
- A branch `homolog` deve receber commits primeiro; `main` recebe apenas PRs
  pequenos, revisados e validados.

Evite promover um PR antigo e grande de `homolog` para `main` quando a mudanca
real for pequena. Para producao, prefira criar uma branch curta a partir de
`origin/main` e aplicar somente os commits que passaram em homolog.

## Variaveis por ambiente

Na Vercel, configure as variaveis do ambiente/branch de homolog usando o projeto
Supabase de homolog:

```text
NEXT_PUBLIC_SUPABASE_URL=<url do Supabase homolog>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do Supabase homolog>
SUPABASE_SERVICE_ROLE_KEY=<service role do Supabase homolog>
CRON_SECRET=<segredo diferente da producao>
RESULTS_FEED_URL=<feed usado em homolog, se necessario>
RESULTS_BACKUP_FEED_URL=
RESULTS_AUTO_FINALIZE_DELAY_MINUTES=10
```

Nunca use `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` ou connection string da
producao em homolog. Se precisar comparar dados reais, use backup restaurado em
um projeto separado e sanitizado.

## Opcoes de banco

### Base limpa

Use para a maioria dos testes de UX, login, ranking e fluxo administrativo.

1. Criar projeto Supabase `labolita-homolog`.
2. Configurar Google OAuth com redirect de homolog:

```text
https://homolog.labolita.faysk.dev/auth/callback
```

3. Aplicar migrations:

```bash
npx supabase link --project-ref HOMOLOG_PROJECT_REF
npx supabase db push --linked
```

4. Importar a agenda no banco de homolog com env separado:

```bash
node --env-file=.env.homolog scripts/import-schedule.mjs --require-complete data/world-cup-2026.json
```

5. Entrar em homolog com usuarios de teste e conceder admin pelo SQL Editor.

### Snapshot sanitizado

Use somente quando for necessario reproduzir comportamento com volume real de
bolões, rankings ou historico.

1. Baixar um artifact do workflow `Supabase Backups`.
2. Restaurar em projeto Supabase temporario ou homolog, nunca em producao.
3. Sanitizar antes de abrir o ambiente para testes:
   - Remover ou mascarar e-mails de `auth.users`.
   - Remover sessoes/tokens de autenticacao.
   - Trocar `avatar_url` por `null`, exceto usuarios explicitamente de teste.
   - Trocar codigos de convite dos bolões.
   - Confirmar que cron e service role pertencem ao ambiente de homolog.
4. Rodar os smokes remotos contra `.env.homolog`.

Como `public.profiles.id` referencia `auth.users.id`, nao copie apenas tabelas
publicas com usuarios reais sem entender as dependencias. Para testes comuns,
base limpa e usuarios de teste sao mais seguros.

### Restaurar producao em homolog

Quando for necessario deixar homolog com o mesmo estado de producao, use o
workflow manual `Restore Homolog From Production`. Ele faz dump somente leitura
de producao, aplica as migrations pendentes em homolog, sobrescreve os dados e carrega `auth.users`,
`auth.identities` e tabelas publicas, mas nao copia sessoes, refresh tokens,
fluxos OAuth, MFA ou WebAuthn efemeros.

Configure uma connection string do banco de homolog como secret do GitHub:

```bash
gh secret set SUPABASE_HOMOLOG_DB_URL --repo Faysk/LaBolita
```

Depois execute:

```bash
gh workflow run "Restore Homolog From Production" \
  -f confirm=RESTORE_HOMOLOG_FROM_PROD \
  -f run_smoke=true
```

Esse processo sobrescreve o banco de homolog. Depois do restore, usuarios que
estavam logados em homolog devem sair e entrar novamente, porque sessoes antigas
nao sao reaproveitadas.

## Checklist antes de promover para producao

```bash
git fetch origin
npm run check
npm run test:homolog
node --env-file=.env.homolog scripts/test-remote-database.mjs
node --env-file=.env.homolog scripts/test-results-route.mjs
node scripts/test-production.mjs --allow-pending-deploy
```

Depois de validar homolog, crie PR curto para `main`:

```bash
git switch -c prod-nome-da-mudanca origin/main
git cherry-pick COMMIT_VALIDADO_EM_HOMOLOG
npm run check
git push origin prod-nome-da-mudanca
gh pr create --base main --head prod-nome-da-mudanca
```

Merge em `main` dispara producao. Apos o deploy, rode:

```bash
npm run test:production:current
```

## Smoke automatizado de homolog

O workflow `.github/workflows/homolog-smoke.yml` roda `npm run test:homolog`
periodicamente e tambem pode ser disparado manualmente no GitHub Actions.

Por padrao, o comando mira `https://homolog.labolita.faysk.dev` e permite
sincronizacao de resultados nao configurada, porque homolog pode estar em um
banco/cron separado. Se a Vercel devolver `401` por Deployment Protection, o
comando registra skip em vez de tratar como erro do app.

Para smoke completo em ambiente protegido, crie um Protection Bypass for
Automation na Vercel e salve o valor como secret do GitHub:

```text
VERCEL_AUTOMATION_BYPASS_SECRET
```

O script envia esse valor no header `x-vercel-protection-bypass`, conforme a
documentacao da Vercel.

Para exigir sync configurado:

```bash
npm run test:homolog -- --strict-sync
```

Para exigir que homolog esteja publico sem protecao:

```bash
npm run test:homolog -- --require-public
```

Para testar outro dominio de homolog:

```bash
SMOKE_URL=https://outro-host.example.com npm run test:homolog
```

No GitHub Actions, defina a variable `HOMOLOG_URL` se o dominio de homolog mudar.

## Restore drill

Pelo menos uma vez antes de depender dos backups:

1. Executar manualmente o workflow `Supabase Backups`.
2. Baixar o artifact mais recente.
3. Restaurar em banco descartavel.
4. Conferir migrations, contagens e `/api/health` apontando para esse banco.
5. Registrar no diario operacional a data, o artifact usado e qualquer ajuste
   necessario.

Backups sem restore testado ainda sao apenas promessa. O drill transforma isso
em plano real de recuperacao.
