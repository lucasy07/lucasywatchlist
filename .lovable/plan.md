# Onda visual na tierlist pela logo

## Objetivo
Ao clicar na logo no modo “Meu gosto”, manter a rolagem ao topo e disparar uma onda decorativa pelas linhas visíveis da tierlist, sem interferir no arraste.

## Implementação
- Adicionar um estado/chave de execução na tela principal para reiniciar a onda a cada clique válido.
- No clique da logo, preservar exatamente a rolagem atual e só iniciar a onda quando:
  - o modo exibido for `gosto`;
  - não houver arraste ativo;
  - movimento reduzido não estiver habilitado.
- Aplicar em cada linha uma classe de onda, uma defasagem de `70ms` conforme sua ordem visual e a custom property `--wave-tint` baseada no token do tier; “Sem tier” usará `--muted-foreground`.
- Aplicar o bob somente aos `<li>` que envolvem as capas, reutilizando a mesma defasagem da linha e preservando `viewTransitionName`.
- Adicionar no CSS keyframes de aproximadamente `620ms` para o banho de cor e para o deslocamento vertical de `9px`, com proteção adicional em `prefers-reduced-motion`.

## Detalhes técnicos
- A linha continuará usando `TierDropRow`, `SortableContext`, `rectSortingStrategy`, realce de drop, alturas e bordas atuais.
- A cor animada será uma camada decorativa baseada em `color-mix`, para coexistir com o realce de `isOver`.
- A chave reiniciável desmontará e remontará apenas os wrappers animados, evitando animações empilhadas em cliques repetidos.

## Validação
- Verificar clique nos modos MAL e “Meu gosto”, durante drag e com movimento reduzido.
- Confirmar ordem S → E → “Sem tier”, reinício por clique repetido e ausência de regressão no arraste.
