# Umi Watchlist — estado atual

Watchlist/ranker pessoal de animes. Este documento descreve **o que existe hoje** no
repositório, para servir de base a novas melhorias. Substitui o plano antigo
"Redesign UI/UX — Noir & Gold", que descrevia um tema (preto + dourado, Sora/Manrope)
e rotas (`watched`, `upcoming`) que não correspondem mais ao código.

---

## 1. Stack

- **TanStack Start / Router** com rotas file-based (`src/routes`, `routeTree.gen.ts` gerado).
- **TanStack Query** — `QueryClientProvider` no `__root.tsx`; usado hoje sobretudo na busca Jikan.
- **Supabase** — auth (e-mail/senha) e persistência. Cliente em `src/integrations/supabase/client.ts`, tipos em `types.ts`.
- **shadcn/ui + Tailwind v4** (`@theme inline` em `src/styles.css`), ícones **lucide-react**.
- **dnd-kit** para reordenar temporadas.
- **Jikan (MyAnimeList não oficial)** para busca, capas, notas e detecção de continuações.

## 2. Tema — paleta Umi

Definida em `src/styles.css`, no `:root`, sob o comentário
`/* Umi — paleta baseada em Asanagi Umi */`. Tudo consumido via tokens; nenhuma cor
hardcoded em componente.

| Token | Valor |
| --- | --- |
| `--background` | `#1C1E28` |
| `--card` / `--card-elevated` | `#242733` / `#2E3140` |
| `--foreground` / `--muted-foreground` | `#D9DCE0` / `#989CAB` |
| `--primary` / `--primary-glow` / `--primary-on-dark` | `#E0446A` / `#F06A8A` / `#E25275` |
| `--primary-foreground` | `#12141C` |
| `--accent` | `#2BA6E0` |
| `--destructive` | `#E0603F` |
| `--border` / `--border-strong` / `--border-interactive` | `#333748` / `#424759` / `#747C9C` |
| `--ring` | `#E0446A` |
| `--radius` | `0.875rem` |

Gradientes e sombras: `--gradient-primary`, `--gradient-card`, `--gradient-accent-text`,
`--gradient-scrim` e `--gradient-scrim-mobile` (usados na arte da tela de login),
`--shadow-card`, `--shadow-elegant`, `--shadow-glow`.

**Tiers** — rampa contínua azul → magenta em oklch, de `--tier-s` (h 220) a `--tier-e` (h 358),
com `--tier-foreground` escuro. Expostos como `text-tier-*` / `bg-tier-*` via `@theme inline`
e aplicados pelos helpers `tierColor` / `tierBg` em `src/components/TierPicker.tsx`.

**Tipografia** — `--font-sans: "Zen Kaku Gothic New"`, `--font-display: "M PLUS Rounded 1c"`,
carregadas por `<link>` no `head()` de `__root.tsx`. Utilitários: `.font-display`,
`.focus-ring`, `.text-accent-gradient`.

**Marca** — "Umi Watchlist"; assets `umi-mark.png` (favicon e apple-touch-icon),
`umi-lockup.png` e a arte de login (`login-art-900` / `login-art-umi-1600`, webp).

## 3. Rotas

Só existem duas (confirmar sempre em `src/routeTree.gen.ts`):

- **`/auth`** (`src/routes/auth.tsx`) — login, criação de conta e recuperação de senha no mesmo
  componente, alternados por `mode`. Arte de fundo com scrim + camada de dither, lockup,
  mostrar/ocultar senha, validação inline e `translateAuthError` traduzindo os erros do Supabase.
- **`/`** (`src/routes/_authenticated.index.tsx`) — a aplicação inteira. Ranking, tierlist,
  filtros, FAB e todos os diálogos vivem aqui.
- **`_authenticated.tsx`** é só o layout-gate: enquanto `loading` ou sem `session`, renderiza
  um estado de carregamento de tela cheia; sem sessão, redireciona para `/auth`.
- `__root.tsx` também define o `NotFoundComponent` (404).

> Não há rotas `watched` nem `upcoming`. "Assistidos" é um filtro dentro da index, e as
> temporadas anunciadas aparecem no card do anime e no diálogo de verificação.

## 4. Domínio (`src/lib/anime-storage.ts`)

- `Anime` = `{ id, name, seasons[], cover?, upcoming?, watched, malId, imageUrl, malScore, tier }`.
- `Season` = `{ id, name, rating, malId?, year?, malScore?, type?, includeInAverage? }`.
- `Tier` = `"S" | "A" | "B" | "C" | "D" | "E"`, com `TIER_VALUE = { S:5, A:4, B:3, C:2, D:1, E:0 }`.
- `isExcludedFromAverage` — OVA e Special ficam **fora** da média por padrão; `includeInAverage`
  é o override explícito por temporada (`true` inclui, `false` exclui, `undefined` usa o default do tipo).
- Médias: `mediaPessoal` (notas do usuário) e `mediaMAL` (notas do MAL), ambas ignorando
  temporadas excluídas. `rankColor` colore a média exibida.
- `tierFromAverage` converte média em tier, mas hoje **nunca retorna `E`** — o piso é `D`.
  Ponto a decidir se o `E` deve entrar nessa faixa ou continuar sendo só manual.
- Acesso ao Supabase: `fetchAnimes`, `createAnime`, `updateAnime`, `updateAnimeMeta`,
  `updateSeasons`, `updateUpcoming`, `updateTier`, `setWatched`, `deleteAnime`.
- `importLegacyIfNeeded` faz a importação única do `localStorage` antigo
  (`anime-ranker:v1`) para o Supabase, marcada por flag por usuário.

**Tabela `animes`** (Supabase): `id, user_id, name, cover, seasons (jsonb), upcoming (jsonb),
watched, mal_id, image_url, mal_score, tier, created_at, updated_at`.

## 5. Tela principal (`/`)

- **Ordenação** — toggle binário `scoreMode`:
  - `mal`: ordena por `mediaMAL` (nulos por último);
  - `gosto`: agrupa por tier e renderiza como **tierlist** (rótulo à esquerda com faixa colorida
    e contagem, fileira de capas à direita), listando só animes `watched`.
- **Visualização** — `viewMode` grid ou lista; no grid os cards usam o hook `use-tilt`.
- **Filtros** — busca por nome, tier, tipo de temporada, "sem dados" e estado de assistido
  (`todos` / `nao` / `sim`), com contador de filtros ativos e botão limpar.
- **Preferências** (`viewMode`, `scoreMode`, `watchedFilter`) persistidas em `localStorage`
  sob o prefixo `anime-ranker:v1:`.
- **FAB** com duas ações: adicionar anime e adicionar temporada.
- **Diálogos**: cadastro de anime (com busca Jikan), adicionar temporada, editar anime
  (nome, capa, temporadas ordenáveis, tier), detalhe do anime e resultado da verificação
  de novas temporadas.
- **Verificação de temporadas** — `buildChain` (`src/lib/jikan-chain.ts`) percorre a cadeia
  de sequels a partir do `malId`; o que já saiu vira sugestão de temporada, o que não saiu
  vira `upcoming`. Roda para todos os animes ou para um só (ícone no card).
- **Migrações** — `runMigrations` (`src/lib/migrations.ts`) roda uma vez após a hidratação
  para backfill de metadados.
- **Estados vazios** via `EmptyState`, diferenciando lista vazia, busca sem resultado,
  filtros sem resultado e tierlist sem assistidos.

## 6. Componentes próprios

`JikanSearch`, `TierPicker` (+ `tierColor` / `tierBg`), `SortableSeasonList`,
`SortableCardSeasons`, `EmptyState`, `BrandLockup`, hook `use-tilt`, além do conjunto
shadcn em `src/components/ui`.

## 7. Estados de carregamento (hoje)

- **Gate de auth** — `Loader2` girando, centralizado em tela cheia, sem marca.
- **Ranking** — `RankingSkeleton` no fim do `_authenticated.index.tsx`, com três variantes
  (tierlist, grid, lista) montadas sobre `components/ui/skeleton.tsx`, que é apenas
  `animate-pulse bg-card-elevated` com `motion-reduce:animate-none`.
- **Busca Jikan** — `Loader2` inline dentro do input.
- **Verificação de temporadas** — os estados `checkProgress` e `chainProgress` já existem
  e são atualizados, mas não têm UI; o feedback visível é só o ícone `RefreshCw` girando.

## 8. Invariantes

- Não trocar framework, router (TanStack Router, file-based), TanStack Query,
  lucide-react nem Supabase.
- Persistência e auth via Supabase intactas, exceto quando a mudança mexe explicitamente
  em schema/migration.
- Tema só via tokens CSS; sem cor hardcoded.
- Integração Jikan intacta, exceto onde a mudança for nela.
- Lógica de domínio (médias, exclusão de OVA/Special, `TIER_VALUE`, ordenação) preservada
  em qualquer mudança de UI.
- Acessibilidade: `role="status"` / `aria-busy` nos carregamentos, `focus-ring` nos controles,
  alvos de toque de 44px no mobile, `motion-reduce` nas animações.

## 9. Próximo — telas de carregamento

Três frentes independentes, em ordem sugerida:

1. **Shimmer nos skeletons** — trocar o `animate-pulse` de `components/ui/skeleton.tsx` por
   uma varredura de gradiente em `--primary`, mais fade-in escalonado na entrada dos cards.
   Uma mudança, herdada por grid, lista e tierlist.
2. **Splash de boot com marca** — no gate de `_authenticated.tsx`, usar o lockup Umi com
   anel de progresso em vez do `Loader2` genérico, com delay curto para não piscar em
   carregamento rápido.
3. **Progresso real da varredura** — renderizar `checkProgress` / `chainProgress` como barra
   com contador ("7 de 18") e o anime sendo consultado no momento.
