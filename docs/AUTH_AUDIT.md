# Auditoria De Conta E Acesso

Este documento resume os pontos de atencao do fluxo de conta sem expor detalhes
operacionais.

## Objetivos

- Login previsivel em producao e homologacao.
- Redirecionamento correto para o ambiente em uso.
- Preferencias de conta respeitadas em todo o app.
- Perfil publico controlado pelo usuario.
- Administracao restrita a pessoas autorizadas.

## Privacidade

A opcao de foto publica vale globalmente. Quando a pessoa oculta a foto, a
interface usa identificacao simplificada em rankings, boloes e destaques.

## Validacao

Alteracoes de login, perfil ou permissoes devem passar por testes locais, smoke
online e teste manual de entrada nos dois ambientes.
