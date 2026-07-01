# Backups

Backups existem para permitir rollback rapido e seguro antes de mudancas
importantes.

## Quando Fazer

- Antes de migrations.
- Antes de restaurar dados entre ambientes.
- Antes de promover alteracoes grandes para producao.
- Antes de ajustes que afetem pontuacao, ranking ou usuarios.

## Politica Recomendada

- Manter backups recentes da producao.
- Validar restauracao em ambiente separado.
- Nao versionar dumps sensiveis no repositorio publico.
- Usar nomes com data e ambiente para facilitar recuperacao.
- Guardar apenas o periodo necessario para rollback operacional.

## Homologacao

Quando homologacao precisa espelhar a producao, a copia deve ser tratada como dado
sensivel. O objetivo e validar comportamento real sem expor informacoes fora do
ambiente controlado.

Antes de sobrescrever o branch `homolog` com `main`, mantenha uma referencia de
backup do estado anterior, por exemplo:

```bash
git push origin origin/homolog:refs/heads/backup/homolog-before-main-sync-YYYYMMDDHHMM
```

Essa branch de backup protege o historico de testes de homologacao enquanto o
ambiente volta a ficar alinhado com producao. Para dados, use o workflow
`Restore Homolog From Production`, que exige confirmacao manual e recusa URLs de
banco identicas entre producao e homologacao.
