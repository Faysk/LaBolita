# Endurecimento operacional

Este checklist cobre proteções que pertencem à infraestrutura e não devem ser
simuladas com estado em memória dentro de funções serverless.

## Antes de abrir o acesso

- Ativar rate limiting no Cloudflare ou Vercel para `/entrar`, `/auth/*`,
  `/api/cron/*` e chamadas RPC com maior custo.
- Manter o rate limit nativo do Supabase Auth ativo e revisar limites de OAuth.
- Restringir `/api/cron/results` por `CRON_SECRET`, IP quando possível e alertar
  sobre respostas `401`, `429` e `5xx`.
- Criar alertas externos para `/api/health`, login Google, sincronização de
  resultados e falhas frontend.
- Executar `npm run test:production` diariamente e após cada deploy.

## Limites iniciais sugeridos

| Superfície | Limite inicial | Ação |
| --- | ---: | --- |
| Login/OAuth por IP | 10/min | Desafio ou bloqueio temporário |
| Cron de resultados | 2/min | Bloquear e alertar |
| RPCs administrativas | 30/min por usuário | Bloquear e investigar |
| RPCs de escrita comuns | 60/min por usuário | Bloquear temporariamente |

Ajuste os limites usando métricas reais. Não use e-mail, código de convite ou
outro dado sensível em logs de borda.

## Homologação e banco

- Manter um projeto Supabase de homologação com as mesmas migrations.
- Em cada PR com migration, aplicar banco limpo, executar pgTAP e `db:lint`.
- Comparar o schema de homologação com produção antes do deploy.
- Testar restauração de backup e documentar o tempo de recuperação.

## Resposta a incidentes

- Preservar `admin_audit_logs` e logs do provedor.
- Pausar sincronização automática quando houver divergência.
- Confirmar resultados manualmente antes de pontuar.
- Registrar causa, correção, impacto e ação preventiva após o incidente.
