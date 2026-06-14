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
