# Ambiente De Homologacao

Homologacao e o lugar onde testamos mudancas antes de producao.

## Modelo De Trabalho

- `homolog` fica a frente de `main`.
- Novas features entram primeiro em homologacao.
- O usuario testa online no dominio de homologacao.
- Quando aprovado, as mudancas seguem para producao por pull request.
- O que nao for aprovado pode ser ajustado ou descartado sem afetar producao.

## Checklist Antes De Promover

- Testes locais passaram.
- Smoke de homologacao passou.
- Teste visual em desktop passou.
- Teste visual em mobile passou.
- Fluxos de login, palpites, boloes, Copa, especiais e admin foram conferidos.
- Backup recente de producao existe quando houver risco de banco.

## Banco De Homologacao

Homologacao pode usar banco separado para evitar impacto em usuarios reais. Em
alguns momentos, uma copia controlada da producao ajuda a reproduzir cenarios
reais. Essa copia deve ser usada apenas para teste e tratada com o mesmo cuidado
da producao.
