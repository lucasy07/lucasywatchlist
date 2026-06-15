## Redesign UI/UX — Noir & Gold

Direção: estética editorial dark (preto profundo + dourado), tipografia Sora (display) + Manrope (corpo), densidade equilibrada (3/5). Mantém toda a lógica atual (ordenação, médias, busca, LocalStorage, cadastro com MAL, capas, edição de nota).

### 1. Tema global (`src/styles.css` + `src/routes/__root.tsx`)

- Carregar Sora e Manrope via `<link>` no `head()` do root route (preconnect + stylesheet do Google Fonts).
- Atualizar tokens do `:root` para a paleta Noir & Gold:
  - `--background`: preto profundo (`oklch(0.13 0.005 60)`)
  - `--card`: cinza-grafite (`oklch(0.18 0.005 60)`)
  - `--card-elevated`: tom 1 ponto mais claro para placeholders de capa
  - `--primary` / `--accent` / `--ring`: dourado (`oklch(0.78 0.13 85)`)
  - `--primary-foreground`: quase-preto
  - `--primary-glow`: dourado claro (`oklch(0.88 0.08 90)`)
  - `--border`: dourado a 12% de opacidade
  - `--muted-foreground`: bege esmaecido
  - `--gradient-primary`: gradiente dourado→âmbar
  - `--shadow-elegant`: sombra suave dourada
  - `--font-display`: "Sora"; `--font-sans`: "Manrope"
- Registrar `--color-card-elevated` e `--font-display` em `@theme inline`.
- `body` passa a usar `font-sans` (Manrope) por padrão; criar utilitário `.font-display` via token.

### 2. Topbar e busca (`_authenticated.tsx` + index)

- Header sticky com glass effect (`backdrop-blur`, borda inferior dourada sutil).
- Logo/título em Sora com letter-spacing apertado e acento dourado.
- Tabs de navegação (Ranking / Watched / Upcoming) com underline dourado animado no item ativo.
- Campo de busca: ícone Search à esquerda, placeholder discreto, foco com ring dourado fino.
- ToggleGroup "Minhas notas / MAL": pill compacta, item ativo em dourado sobre preto.

### 3. Cards do ranking (`_authenticated.index.tsx`)

- Card com `bg-card`, borda dourada hairline, hover sobe levemente (`translate-y`) e ganha glow dourado.
- Posição (#1, #2, #3…) em Sora grande à esquerda da capa, com dourado nos 3 primeiros (gold/silver/bronze tonal) e neutro do 4º em diante.
- Capa mantém 2:3, cantos arredondados, agora com sombra interna sutil.
- Layout do conteúdo:
  - Título em Sora 600, truncate.
  - Linha de metadados em Manrope muted (n.º temporadas • ano range se disponível).
  - Média principal em Sora display grande, dourada; sufixo "/10" muted pequeno.
  - Badge secundária (a outra média) em outline dourado discreto, ícone Star preenchido.
- Collapsible: chevron dourado, lista de temporadas com linhas separadas por hairline; input de nota com estilo refinado (largura fixa, alinhamento à direita, ring dourado no foco).
- Modo lista: capa menor (h-20), mesmo tratamento tipográfico, alinhamento horizontal otimizado para densidade 3.
- Placeholder de capa: `bg-card-elevated`, ícone Image dourado a 40% de opacidade.

### 4. Formulário de cadastro

- Dialog com header em Sora, descrição em Manrope muted.
- Campo de busca MAL com ícone e loading spinner dourado inline.
- Lista de sugestões: cada item mostra thumb (40x60) + título + ano + tipo, hover com `bg-card-elevated` e borda dourada esquerda animada.
- Botões: primário dourado sólido (texto preto), secundário ghost dourado.
- Estado "buscando temporadas da série" com skeleton dourado pulsante.

### 5. FAB "+"

- Botão flutuante circular com gradiente dourado, sombra elegante dourada, hover scale 1.05.

### Detalhes técnicos

- Nenhuma mudança em lógica: `mediaPessoal`, `mediaMAL`, ordenação, `localStorage`, `jikan-chain`, cadastro manual permanecem intactos.
- Todas as cores via tokens semânticos (sem `text-white`, sem hex inline em componentes).
- Fontes carregadas só no root head; `@theme` apenas nomeia as famílias.
- Aplicar `font-display` nos títulos/médias destacadas; Manrope é default no body.
- Acessibilidade: contraste do dourado sobre preto verificado; `focus-visible` ring dourado em todos os controles.

### Arquivos a alterar

- `src/styles.css` — tokens Noir & Gold + fontes.
- `src/routes/__root.tsx` — `<link>` de fontes.
- `src/routes/_authenticated.tsx` — topbar/glass/tabs.
- `src/routes/_authenticated.index.tsx` — cards (grid + list), badges, collapsible, FAB, dialog de cadastro, busca.
- (se necessário) ajustes pontuais em `_authenticated.watched.tsx` e `_authenticated.upcoming.tsx` apenas para herdarem o novo header — sem mudança funcional.