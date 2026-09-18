# Atualização separada das notas do MAL

## Implementação

- Adicionar estado, progresso por temporada e `AbortController` próprios para a atualização de notas, com limpeza ao desmontar.
- Percorrer cópias das temporadas que possuem `malId`, buscar cada detalhe diretamente na Jikan em prioridade de fundo e persistir por anime somente quando nota, ano ou tipo mudarem.
- Tornar a atualização e todas as verificações mutuamente exclusivas, preservando integralmente o fluxo atual de novas temporadas e o carimbo de última verificação.
- Adicionar o botão cancelável ao lado de “Verificar novas temporadas”, com porcentagem, estados acessíveis e comportamento visual equivalente ao botão existente.
- Criar um diálogo exclusivo “Notas atualizadas”, reutilizando a mesma apresentação de alterações do diálogo de verificação; usar mensagens específicas para nenhuma mudança e cancelamento parcial.

## Validação

- Conferir início, progresso, cancelamento e conclusão, incluindo persistência parcial segura.
- Confirmar que os botões globais e individuais ficam bloqueados durante a operação concorrente.
- Executar typecheck e testes do projeto.
