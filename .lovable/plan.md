# Extração do diálogo de detalhe do anime

## Implementação

- Mover `formatScore` e `scoreColor`, sem alterações, para `src/lib/score-format.ts`.
- Mover `WatchedIcon`, mantendo marcação e classes, para `src/components/WatchedIcon.tsx`.
- Criar `AnimeDetailDialog` com o diálogo completo de detalhes, preservando textos, classes, estados vazios, metadados, gêneros, temporadas e rodapé.
- Substituir o bloco da rota pelo novo componente, mantendo estados e funções na rota e adaptando somente os callbacks pedidos.
- Remover apenas imports comprovadamente órfãos na rota.

## Detalhes técnicos

- O componente receberá o anime selecionado, modo de nota, estados das operações e callbacks de verificação, assistido, edição e filtro de gênero.
- A rota continuará controlando abertura, seleção, filtros e todas as operações existentes.

## Validação

- Executar lint, verificação de tipos e todos os testes do projeto.
- Conferir que o diálogo recebe os mesmos dados e dispara as ações na mesma ordem.
