# Extração do diálogo Novo Anime

## Implementação

- Exportar `CreateAnimeInput` em `anime-storage` com os mesmos campos atuais e usá-lo na assinatura de `createAnime`.
- Criar `AddAnimeDialog` preservando integralmente textos, disposição e controles do diálogo atual.
- Mover para o componente os estados da busca e da cadeia, além de `resetAddAnime`, `startChainFetch` e a validação/montagem do payload.
- Centralizar no fechamento do diálogo o aborto e a limpeza dos estados, cobrindo botão, Esc e clique externo.
- Na página, manter apenas o handler assíncrono que cria, acrescenta o anime, fecha o diálogo, revela quando aplicável e mostra o aviso final; em erro, manter o diálogo aberto.
- Substituir o JSX antigo por `AddAnimeDialog` e remover somente imports comprovadamente órfãos.

## Detalhes técnicos

- `AddAnimeDialog` receberá `open`, `onOpenChange`, `animes` somente leitura e `onCreate(input, toastLabel)` assíncrono.
- A cadeia continuará usando `buildChain`, fallback pelo item escolhido, seleção inicial completa, progresso, tentativa novamente e cancelamento por `AbortController`.
- A checagem de duplicatas continuará considerando o anime principal e todas as temporadas já cadastradas.
- `AddSeasonDialog`, edição, botões de abertura, filtros, revelação e opções do aviso permanecerão intactos.

## Validação

- Executar lint, verificação de tipos e todos os testes.
- Conferir no uso real abertura, busca, fechamento/cancelamento e permanência do diálogo quando a criação falhar.
