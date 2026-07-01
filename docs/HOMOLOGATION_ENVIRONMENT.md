# Ambiente De Homologacao

Homologacao e o lugar onde testamos mudancas antes de producao.

## Modelo De Trabalho

- `main` e a fonte do que esta em producao.
- Depois de uma promocao para producao, `homolog` deve ser resincronizado com
  `main` para voltar a ser um espelho fiel.
- Antes de sobrescrever `homolog`, crie uma branch de backup do estado atual.
- Novas features entram primeiro em homologacao, normalmente por pull request
  contra `homolog`.
- O usuario testa online no dominio de homologacao.
- Quando aprovado, as mudancas seguem para producao por pull request contra
  `main`.
- O que nao for aprovado pode ser ajustado ou descartado sem afetar producao.

## Sincronizacao Main Para Homolog

Use este fluxo quando producao ja estiver validada e homologacao precisar voltar
a espelhar exatamente o que esta no ar:

```bash
git fetch origin main homolog
git push origin origin/homolog:refs/heads/backup/homolog-before-main-sync-YYYYMMDDHHMM
git push origin origin/main:refs/heads/homolog --force-with-lease=refs/heads/homolog:<sha-atual-do-origin-homolog>
```

Depois do push, a esteira deve executar:

- CI no branch `homolog`.
- Migrations pendentes no banco de homologacao, quando existirem.
- Smoke de homologacao apontando para o commit recem-publicado.

## Checklist Antes De Promover

- Testes locais passaram.
- Smoke de homologacao passou.
- CI de `homolog` passou.
- Teste visual em desktop passou.
- Teste visual em mobile passou.
- Fluxos de login, palpites, boloes, Copa, especiais e admin foram conferidos.
- Backup recente de producao existe quando houver risco de banco.

## Banco De Homologacao

Homologacao pode usar banco separado para evitar impacto em usuarios reais. Em
alguns momentos, uma copia controlada da producao ajuda a reproduzir cenarios
reais. Essa copia deve ser usada apenas para teste e tratada com o mesmo cuidado
da producao.
