# Consolidar os backfills de temporada

## Alterações
- Substituir os três backfills de tipo, episódios/duração e capa por `backfillSeasonDetails`.
- Fazer uma única consulta de detalhes por temporada elegível e aplicar apenas os campos ainda ausentes.
- Aproveitar a mesma resposta para preencher gêneros quando ela corresponder ao anime principal.
- Preservar cancelamento, falhas silenciosas, atualização do snapshot e notificações de patch.
- Executar o novo backfill uma vez, entre o backfill de capa principal e o backfill de gêneros.

## Validação
- Confirmar que não restaram referências aos três backfills removidos.
- Rodar verificação de tipos, testes da biblioteca e checagem de diferenças.

## Detalhes técnicos
- Nenhuma alteração visual, no cliente Jikan, no fluxo de migrações restante ou na integração AniList.
- `null` continuará marcando tentativas concluídas sem dados para episódios e capa; tipo vazio continuará elegível para nova tentativa.
