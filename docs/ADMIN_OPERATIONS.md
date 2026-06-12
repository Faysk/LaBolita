# Operação administrativa

## Acesso

O perfil administrador enxerga o atalho de escudo no cabeçalho e a opção
**Administração** no menu da conta. A permissão `profiles.is_admin` controla
resultados e agenda. Somente um perfil pode possuir `is_master_admin = true`;
esse perfil também enxerga a administração global de usuários e bolões.

## Administração master

O bloco **Administração master** permite:

- Buscar, renomear, tornar público, arquivar e recuperar qualquer bolão.
- Ver participantes e remover membros, sempre com justificativa.
- Corrigir nomes de usuários e suspender ou reativar contas sem apagar dados.
- Consultar as ações recentes registradas em `admin_audit_logs`.
- Ativar a exigência de aceite dos termos no banco depois que a interface nova
  estiver publicada.

Arquivar um bolão é uma exclusão reversível: ele sai da descoberta pública e
deixa de aparecer para membros comuns, mas dados, ranking e histórico continuam
preservados para recuperação pelo master.

## Ordem segura do rollout de termos

1. Aplicar as migrations com `npx supabase db push --linked`.
2. Publicar a interface nova.
3. Entrar novamente, aceitar os termos e abrir `/admin`.
4. No bloco master, informar uma justificativa e clicar em
   **Ativar após deploy**.
5. Executar `npm run db:smoke:remote` e `npm run test:production`.

A migration nasce com a exigência rígida desligada para não quebrar uma versão
antiga do frontend durante o intervalo entre banco e deploy.

## Antes da fase de 32

1. Aguarde a FIFA confirmar classificados e cruzamentos.
2. Abra `/admin`.
3. Nas partidas marcadas como **Participantes ainda não definidos**, escolha
   mandante e visitante.
4. Informe a fonte/motivo e confirme.

Participantes não podem ser alterados depois do bloqueio ou após existir algum
palpite para a partida.

## Durante o mata-mata

- Ao confirmar o resultado e quem avançou, o vencedor é colocado
  automaticamente na próxima partida.
- Depois das semifinais, vencedores seguem para a final e perdedores para a
  disputa de terceiro lugar.
- Uma correção que alteraria uma partida seguinte já bloqueada é rejeitada.

## Resultados gratuitos

O cartão **Sincronização** no painel informa:

- **Feed principal saudável**: `worldcup26.ir` respondeu e foi validado.
- **Contingência ESPN ativa**: o feed principal falhou e o fallback respondeu.
- **Falha na última tentativa**: nenhum feed seguro pôde ser usado.

Na fase de grupos, o placar observado pode pontuar automaticamente depois do
atraso configurado em `RESULTS_AUTO_FINALIZE_DELAY_MINUTES`. Revise a fila após
cada jogo e corrija pelo painel se houver divergência com a FIFA. No mata-mata,
a confirmação continua manual porque é necessário informar quem avançou.

## Diagnóstico

```bash
npm run db:smoke:remote
npm run results:smoke:remote
npm run results:smoke:fallback
npm run test:production
```

O endpoint `/api/health` também expõe o resumo da última sincronização sem
revelar chaves ou dados pessoais.
