# Operação administrativa

## Acesso

O perfil administrador enxerga o atalho de escudo no cabeçalho e a opção
**Administração** no menu da conta. A permissão vive em `profiles.is_admin` e
deve ser concedida somente a pessoas responsáveis por resultados e agenda.

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

O placar observado nunca pontua automaticamente. Confirme o resultado somente
depois de compará-lo com a FIFA e informe a fonte no campo de motivo.

## Diagnóstico

```bash
npm run db:smoke:remote
npm run results:smoke:remote
npm run results:smoke:fallback
npm run test:production
```

O endpoint `/api/health` também expõe o resumo da última sincronização sem
revelar chaves ou dados pessoais.
