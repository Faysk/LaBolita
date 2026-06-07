# Auditoria de autenticação

Data: 7 de junho de 2026

## Diagnóstico confirmado

O Google OAuth autentica corretamente, mas o frontend publicado depende da
migration `202606070008_public_pools_master_admin_and_terms.sql`, que ainda não
foi aplicada no Supabase remoto.

Evidências coletadas:

- O remoto possui migrations somente até `202606070007`.
- A RPC `accept_terms` retorna `PGRST202` porque não existe no remoto.
- A coluna `profiles.is_master_admin` retorna `42703` porque não existe no remoto.
- Depois do retorno do Google, a sessão é criada, mas o callback antigo converte
  a falha de registro dos termos em `erro=auth`.
- Google está habilitado e a produção responde com banco conectado, 48 times e
  104 partidas.

## Prioridade 0: restaurar login

1. Aplicar a migration remota:

   ```bash
   npx supabase db push --linked
   ```

2. Executar o diagnóstico somente leitura:

   ```bash
   npm run auth:smoke:remote
   ```

3. Publicar a correção do callback.
4. Testar login Google com usuário novo e existente.
5. Executar:

   ```bash
   npm run db:smoke:remote
   npm run test:production
   ```

## Prioridade 1: rápido e sem custo

- Desabilitar login por email/senha no Supabase se o produto continuará usando
  somente Google. O provider de email está habilitado, embora não exista
  interface para ele.
- Confirmar no Supabase Auth que o Site URL é `https://labolita.faysk.dev` e
  manter apenas redirects necessários de produção e desenvolvimento.
- Adicionar `npm run auth:smoke:remote` ao checklist obrigatório antes de deploys
  que alterem autenticação, perfis, RLS ou termos.
- Monitorar nos logs da Vercel as mensagens `OAuth code exchange failed` e
  `Terms acceptance after OAuth failed`.
- Manter exatamente um perfil com `is_master_admin = true`.

## Prioridade 2: confiabilidade

- Criar um ambiente Supabase de homologação para testar migrations antes da
  produção.
- Automatizar a comparação entre migrations locais e remotas no CI.
- Adicionar teste automatizado de OAuth com uma conta de teste dedicada. Isso
  exige cuidado com credenciais e desafios do Google.
- Criar alerta quando `/api/health`, autenticação ou sincronização falharem.

## Roadmap futuro

- Domínio personalizado do Supabase Auth para reduzir a presença do subdomínio
  `supabase.co` durante o login. Pode exigir plano pago.
- Provedor alternativo de login ou recuperação de conta, somente se houver
  demanda real.
- Serviço externo de observabilidade, como Sentry, quando o volume justificar
  o custo e a operação adicional.
- API paga de resultados apenas se os feeds gratuitos deixarem de atender a
  confiabilidade necessária. Ela não possui relação com o problema atual de
  login.

## Validações concluídas

- `npm run check`: aprovado.
- `npm run build`: aprovado.
- 37 testes locais aprovados, incluindo quatro casos específicos do callback.
- `npm run test:production:current -- --allow-unconfigured-sync`: aprovado.
- `npm audit`: nenhuma vulnerabilidade encontrada.
- `npm run auth:smoke:remote`: aprovado após aplicar a migration.
- Migration `202606070008` aplicada e alinhada com o repositório.
- Exigência de aceite dos termos ativada.
- Build demo isolado em `.next-demo`, evitando sobrescrever o build real usado
  por testes operacionais.
