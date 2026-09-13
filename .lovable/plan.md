# Verificação global cancelável

## Implementação

- Adicionar um `AbortController` dedicado à varredura global e cancelá-lo no segundo clique ou ao desmontar a tela.
- Propagar o sinal até `buildChain`, interromper o loop ao receber `AbortError` e retornar progresso concluído (`scanned`) e estado de cancelamento (`aborted`).
- Manter a persistência incremental de cada anime concluído e preservar integralmente as verificações individuais.
- Transformar o botão global em toggle acessível: progresso durante a execução, ação de cancelar em hover/foco e rótulo móvel sempre visível.
- Registrar o corte da varredura, mostrar toast específico quando cancelada sem resultados e abrir o diálogo com aviso de resultado parcial quando houver resultados.

## Validação

- Conferir que iniciar, cancelar e concluir a varredura produzem os estados corretos.
- Confirmar que as três verificações individuais continuam desabilitadas durante a global e sem suporte a cancelamento.
- Executar os testes relevantes do projeto.
