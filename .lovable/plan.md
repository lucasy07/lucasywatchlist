# Extração dos diálogos de resultado

## Implementação

- Mover `FoundSeason` e `UpdatedSeason`, sem alterar seus campos, para um módulo compartilhado de tipos e importá-los onde forem usados.
- Extrair o diálogo “Novas temporadas” para `CheckResultDialog`, mantendo integralmente textos, classes, estados vazios, chaves, formatação de datas e callback de adicionar.
- Extrair o diálogo “Notas atualizadas” para `MalScoreDialog`, preservando integralmente textos, classes e formatação das alterações.
- Substituir os dois blocos na página pelos novos componentes, mantendo todos os estados, callbacks e lógica na página.
- Remover apenas imports que ficarem comprovadamente sem uso após a extração.

## Validação

- Executar lint, verificação de tipos e todos os testes do projeto.
- Conferir que a página continua compilando e que os diálogos recebem os mesmos dados e ações.
