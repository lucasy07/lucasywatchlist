# Extração do diálogo Nova Temporada

## Implementação

- Criar `AddSeasonDialog` com o JSX atual e mover para ele os estados de anime selecionado, busca, entrada escolhida, carregamento e detalhes.
- Mover `pickSeasonEntry` sem alterar a busca interativa nem o preenchimento dos detalhes da temporada.
- Resetar o estado interno somente quando o diálogo abrir, usando `initialAnimeId` como seleção inicial.
- Manter no componente a validação, os mesmos avisos e a montagem idêntica do objeto `Season`, entregando a temporada pronta por `onAdd`.
- Na rota, trocar `seasonAnimeId` por `seasonInitialAnimeId`, simplificar `openAddSeason` e manter em um novo handler a atualização otimista, fechamento antes da gravação, aviso de sucesso e rollback em erro.
- Substituir o bloco atual por `AddSeasonDialog` e remover apenas imports comprovadamente órfãos.

## Detalhes técnicos

- O componente receberá `open`, `onOpenChange`, `animes`, `initialAnimeId` e `onAdd`.
- `persistSeasons`, o diálogo de adicionar anime, o diálogo de edição e todos os pontos que chamam `openAddSeason` permanecerão intactos.
- A lista de animes será tratada como somente leitura, e as atualizações continuarão criando novos arrays e objetos.

## Validação

- Executar lint, verificação de tipos e todos os testes do projeto.
- Conferir no uso real que o diálogo abre pré-selecionado, mantém textos e disposição, valida duplicatas e fecha no mesmo ponto do fluxo.