# Backups do Banco

O projeto usa migrations em `supabase/migrations` para versionar schema e regras.
Para dados de produção, o fluxo seguro fica em GitHub Actions como artifact privado,
com retenção automática de 7 dias.

## Como funciona

- Workflow: `.github/workflows/supabase-backup.yml`.
- Agenda: 3 vezes ao dia, às `02:15`, `10:15` e `18:15` UTC.
- Retenção: 7 dias via `actions/upload-artifact`.
- Conteúdo: roles, schema, data e histórico de migrations.
- O dump não é commitado no repositório para evitar dados sensíveis presos no histórico Git.

## Secret necessário

Crie no GitHub, em `Settings > Secrets and variables > Actions`:

- `SUPABASE_DB_URL`: connection string Postgres da produção.

Preferência prática: usar a connection string do Session Pooler do Supabase,
porque runners do GitHub Actions podem ter problemas com endpoints IPv6 diretos.

## Restore

Baixe o artifact desejado, extraia o `.tar.gz` e restaure em um projeto novo ou
janela de manutenção. Faça primeiro em staging/homolog.

Ordem esperada dos arquivos:

1. `01_roles.sql`
2. `02_schema.sql`
3. `04_migration_history_schema.sql`
4. `05_migration_history_data.sql`
5. `03_data.sql`

Para produção, valide o restore em outro banco antes de qualquer operação destrutiva.
O procedimento de homologação e restore drill está em
[`docs/HOMOLOGATION_ENVIRONMENT.md`](HOMOLOGATION_ENVIRONMENT.md).
