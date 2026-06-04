# Feature · E1.3 + E1.4 — Álbum y detalle del cromo

Vista de los cromos del álbum `Eterno Diciembre` distribuidos en páginas narrativas, con detalle modal del cromo individual.

**Estado**: ✅ Cerrado + iterado. Funcional con `pageCompletion` en el nav, **filtros** client-side, **loading skeleton**, **CTA "ir a una página con cromos"**, y **bento narrativo** en la página activa de la beta (PR #44).

> **Scope de la beta (2026-06):** el álbum está scopeado a `pages.is_active` (T-04). La página activa hoy es **francia (page 8)** — 30 cromos, layout bento curado foto-por-foto (ver [`../../src/features/album/bento-layout.ts`](../../src/features/album/bento-layout.ts) y T-11 en [`../../TODOS.md`](../../TODOS.md)). El contador global "X / N" va sobre el set activo, no sobre los 205. (Nota: roadmap.md/TODOS.md todavía mencionan `croacia` como página héroe — drift de docs; la implementación vigente es francia.)
>
> **Última revisión de calidad:** `/impeccable critique album` en vivo (2026-06-03) → **29/40 (Good)**. Resumen y findings con sus IDs de tracking en [§ Critique](#critique-2026-06-03-live-29-40). Snapshot crudo en [`.impeccable/critique/`](../../.impeccable/critique/).

---

## Flow del usuario

1. User va a `/album` desde la nav del home
2. Ve la página 1 por default, con grid de slots
3. Slots **owned**: thumbnail mini con border tier-coded + nombre + badge ×N si tiene >1 copia
4. Slots **missing**: silhouette con número grande
5. Nav abajo: prev/next + 10 dots clickeables
6. Dots muestran completion por página (tinte dorado parcial/lleno)
7. Click en un slot → abre **CardDetailDialog** modal con:
   - Cromo grande
   - Info: nombre, posición/club, tier
   - Descripción
   - Para legendaries: brief del momento histórico
   - Acciones: Pin/Unpin · Canjear extra · Compartir

---

## Archivos

### Página
- `src/app/(app)/album/page.tsx` — Server component, lee `?page=N`

### Feature
```
src/features/album/
├── queries.ts                  # getAlbumData(pageNumber) + tipos (AlbumData, AlbumCardSlot, PageCompletionMap)
├── scope.ts                    # resolveActivePageIds / getAlbumScope (gate is_active, T-04)
├── bento-layout.ts             # placement curado por página (FRANCIA_BENTO) — fuente de verdad de PRESENTACIÓN
├── bento-layout.test.ts        # invariantes del bento (filas suman 4, sin dense, armonía de alturas)
├── actions.ts                  # pinCard, unpinCard, dismantleCard
└── components/
    ├── album-view.tsx          # Vista cliente principal (filtros + bento + nav + dialog)
    ├── album-slot.tsx          # Slot individual (owned/missing) — recibe BentoCell opcional
    ├── diptych-slot.tsx        # Slot díptico (un cromo ancho, dos paneles + gutter de álbum físico)
    ├── album-filter-bar.tsx    # Filtros (posesión + destacadas + tier) + applyFilters
    ├── album-page-nav.tsx      # Nav prev/next + dots con completion
    ├── album-skeleton.tsx      # Skeleton de la grilla (loading.tsx lo monta)
    ├── card-detail-dialog.tsx  # Modal de detalle (E1.4)
    └── legendary-moment.tsx    # "Volvé a verlo" — facade click-gated del clip (legendary)
```

La ruta `src/app/(app)/album/loading.tsx` monta `<AlbumSkeleton>` como fallback de Suspense (matchea el layout final, CLS-safe).

---

## E1.3 — Vista del álbum

### Query `getAlbumData(pageNumber)`

**4 fetches en paralelo** (queries.ts):
1. Todas las páginas (light, para el nav)
2. Cards de la página actual (joined por `page_id`)
3. `user_cards` del user con **inner join a `cards.album_id`** (filtra huérfanos automáticamente)
4. Todas las card_ids del álbum con `page_id` (para calcular `pageCompletion`)

**Merge**: JS Map por `card_id` para lookup O(1).

**Retorna**:
```ts
type AlbumData = {
  pages: AlbumPage[]
  currentPage: AlbumPage
  cards: AlbumCardSlot[]
  totalCards: number              // 205
  totalOwned: number              // único, filtrado por álbum
  pageOwned: number               // de la página actual
  pageTotalCards: number
  pageCompletion: Map<number, { owned: number; total: number }>
}
```

### `AlbumCardSlot` shape

```ts
type AlbumCardSlot = {
  id: string
  cardNumber: number
  name: string
  description: string | null
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  playerRole: string | null
  number: string | null            // dorsal del jugador
  imageUrl: string | null          // null si content.photo.source es 'TODO'
  legendaryBrief: Record<string, unknown> | null
  owned: boolean
  copies: number
  isPinned: boolean
  firstObtainedAt: string | null
}
```

### Componente `AlbumView`

| Sección | Detalle |
|---|---|
| **Header sticky** | Eyebrow "Tu álbum" + título "Eterno Diciembre" + progreso global `X/N` (N = set activo) + barra % |
| **Page header** | Número + título + subtitle + completion `X/Y` |
| **CTA "ir a una página con cromos"** | Link a la próxima página (circular) con ≥1 cromo owned; se oculta si no hay otra con cromos (`findPageWithOwned`) |
| **Filter bar** | Posesión (todas / tengo / faltan) + Destacadas + 5 chips de tier. Filtrado client-side (`applyFilters`, `useMemo`) |
| **Grid** | Bento curado (4 cols fijas + col-span por celda) en páginas con bento; grilla uniforme `4 → 5 → 6 → 7` en el resto. **Con filtros activos cae a la grilla uniforme** (las filas del bento dejan de sumar 4) |
| **Page nav abajo** | Prev/next buttons + un dot por página (en la beta, ~2) |
| **Stagger fade-in** | Motion al cambiar página/filtro (`staggerChildren: 0.03`, key compuesta) |
| **Empty states** | "No hay cromos con ese filtro" (filtro vacío) · "Aún no tenés cromos de esta página" (`pageOwned === 0`) |

> ⚠️ **Estado de los filtros es client-side (`useState` en `AlbumView`), no URL-backed.** Sobrevive abrir/cerrar el dialog (`useMemo`) pero **se resetea al navegar de página o refrescar**. Mejora futura: subir a `searchParams` junto a `?page=`. Ver U-12-bis en [`../improvements.md`](../improvements.md).

### Componente `AlbumSlot`

**OwnedSlot**:
- Background: foto del cromo (si tiene URL real) o gradient tier-coded
- Border tier-coded + glow sutil
- Número arriba a la derecha
- Badge ×N si copies >1
- Pin icon dorado abajo a la derecha si isPinned
- Hover: scale 1.03 + z-index

**MissingSlot**:
- Background dark
- Border dashed con tinte sutil del tier (foreshadowing)
- Número grande del cromo al centro (opacity 30%)
- Hover: opacity 50%

⚠️ **No usamos el componente `<Cromo>` completo** en el grid por performance. Las miniaturas son simplificadas. Los slots owned de tier legendary/epic tienen `.cromo-slot-holo` (foil liviano CSS-only en hover/focus, sin pointer-JS — ver [DESIGN.md §12.7](../../DESIGN.md)).

### Bento narrativo (`bento-layout.ts`, PR #44)

La página activa de la beta (francia, page 8) usa un **placement curado** en vez de la grilla uniforme. La fuente de verdad de PRESENTACIÓN es el const `FRANCIA_BENTO` (no la DB): qué cromo ocupa cuántas columnas y con qué aspect. Al ser un const, lo leen la grilla **y** el skeleton → el primer load no mueve nada (CLS).

Reglas que enforcea `bento-layout.test.ts`:
- Grilla base de **4 columnas en todos los breakpoints** (los cromos escalan, la estructura no).
- **Sin `grid-auto-flow: dense`**: el orden de `card_number` ES la cronología de la final; dense la reordenaría.
- Cada fila suma **exacto 4 columnas** en orden → cero huecos sin dense.
- Armonía de alturas por fila (portrait span1 ↔ landscape span2 tilean; bandas 21:9, pano y díptico van en fila propia).

Layouts: `portrait` (3:4, span 1), `landscape` (3:2, span 2), `pano` (2:1, span 4), + el **díptico** (`DiptychSlot`): un cromo ancho 16:9 a full-row partido por un gutter de "álbum físico" (presentación; la mecánica real de dos mitades es T-09, post-beta). Jerarquía de bandas full-row: 21:9 (1.71u) < pano clímax (2u) < díptico 16:9 (2.25u).

El pipeline de imágenes (Python) lee su propio `layout` desde el catálogo YAML (`content.photo.layout`) — runtime distinto; el test de integridad evita que se desincronicen los nombres de layout. Curación foto-por-foto: T-11 (✅).

### `AlbumPageNav`

- **Botones prev/next** (chevron)
- **10 dots clickeables** representando cada página
- **Visual state**:
  - Página actual: ensanchada, color celeste
  - Página completa (owned === total): dot dorado lleno + halo
  - Página parcial: dot dorado con relleno proporcional (clip-path)
  - Página vacía: dot neutro gris
- **Tooltip on hover**: muestra `P{n} · X/Y`

---

## E1.4 — Detalle del cromo

### Componente `CardDetailDialog`

Modal centrado (Radix Dialog primitive). Layout:

| Sección | Cuándo |
|---|---|
| **Header con cromo** size="md" + radial bg tier-coded | Siempre |
| **CardInfo** (nombre, posición/club, badge tier) | Siempre |
| **Description** | Si `card.description` existe |
| **LegendaryBrief** (minuto, partido, estadio, momento, fecha) | Solo si tier=legendary + brief válido |
| **OwnershipStats** (copies, primera obtención) | Solo si owned |
| **CardActions** (pin/dismantle/share) | Solo si owned |
| **MissingState** ("Aún no tenés este cromo") | Solo si NO owned |

### Acciones (si owned)

**Pin / Unpin**:
- Optimistic update (cambia icon antes del server response)
- Rollback si falla
- Toast: "Destacada en tu perfil" / "Despineada"

**Canjear extra** (dismantle):
- Solo si `copies > 1` Y tier ≠ legendary
- Toast con `+N monedas`
- Server action retorna `{ coinsEarned, copiesLeft, newBalance }`

**Compartir** (E3):
- Abre `ShareSheet` (ver [`./e3-sharing.md`](./e3-sharing.md))

### LegendaryBrief

Renderea el jsonb `legendary_brief` con parsing defensivo:
```ts
{
  minute?: string | number
  match?: string         // "Argentina vs Francia"
  stadium?: string
  moment?: string        // descripción narrativa
  date?: string
}
```

Si todos los campos son null, no renderea nada.

---

## Server actions (`features/album/actions.ts`)

| Action | RPC | Errores mapeados |
|---|---|---|
| `pinCard(cardId)` | `pin_card` | `unknown` |
| `unpinCard(cardId)` | `unpin_card` | `unknown` |
| `dismantleCard(cardId, count=1)` | `dismantle_card` | `not_owned`, `no_extra_copies`, `not_dismantleable`, `insufficient_copies` |

Todas hacen `revalidatePath('/album')` (y `'/'` para dismantle, por el balance).

---

## Bugs históricos resueltos

### "Contador dice 8/205 pero ninguna página tiene cromos"
**Causa**: la query traía TODOS los `user_cards` del user sin filtrar por álbum. Si había `user_cards` con `card_id` huérfanos (de seeds antiguos), inflaban el contador pero nunca matcheaban con cards del álbum actual al renderear los slots.

**Fix definitivo**: inner join `cards!inner(album_id)` en la query de `user_cards`. Mismo fix en `home/queries.ts`.

```ts
supabase
  .from('user_cards')
  .select('card_id, copies, is_pinned, first_obtained_at, cards!inner(album_id)')
  .eq('user_id', user.id)
  .eq('cards.album_id', ALBUM_ID)
```

### "No veo dónde están mis cromos en el álbum"
**Causa UX**: el nav de páginas era ciego — no indicaba en qué páginas tenías cromos.

**Fix**: implementado `pageCompletion` server-side, dots del nav muestran progreso, tooltip al hover.

---

## Pendientes (no bloqueantes)

| | |
|---|---|
| ✅ | ~~Filtros (por tier, por completion, pineadas)~~ — construido (`album-filter-bar.tsx`, client-side) |
| ✅ | ~~Loading skeleton~~ — construido (`album-skeleton.tsx` + `loading.tsx`) |
| ✅ | ~~"Saltar a página con cromos owned" CTA~~ — construido (`findPageWithOwned`) |
| 🚧 | Ordering options |
| 🚧 | Filtros URL-backed (hoy `useState`, se resetean al navegar/refrescar) |
| ✅ | T-08 · detalle respeta ratio apaisado (2026-06-04) — el modal muestra el ratio base del cromo; reveal descopeado → T-15 |

---

## Critique (2026-06-03, live, 29/40) {#critique-2026-06-03-live-29-40}

`/impeccable critique album` corrido en vivo autenticado (desktop 1440 + mobile 390, a dos niveles de llenado). Snapshot crudo: [`.impeccable/critique/2026-06-04T02-41-00Z__src-app-app-album-page-tsx.md`](../../.impeccable/critique/). Veredicto: **no parece IA** — el bento con fotos reales se lee como ensayo fotográfico curado; detector estático limpio (1 falso positivo, `<img>` en comentario JSDoc de `diptych-slot.tsx`).

**Fuerte** (no tocar): bento narrativo + díptico; diálogo de legendaria faltante reverente (foto real al 40% detrás del prisma gold = anticipación); acción destructiva confirmada + voz argentina.

**Findings → tracking** (cada uno tiene un único home; no duplicar):

| Prio | Finding | Home | Estado |
|---|---|---|---|
| P1 | Valle de apertura: con poco llenado el primer cell (díptico 136) es un vacío de fantasmas — invierte el peak-end "orgullo" | T-12 ([`../../TODOS.md`](../../TODOS.md)) | ✅ 2026-06-04 (PR #50, `AlbumSpotlight`) |
| P2 | Color de tier se fuga al chrome (chips gold/celeste) — viola §4.5. **Decisión: el filtro está mal** → chips al tratamiento neutro único | T-13 + [DESIGN.md §4.5](../../DESIGN.md) | ✅ 2026-06-04 |
| P2 | Filter bar = muro de 9 controles, domina el fold mobile (238px/28%) | T-10 (re-confirmado live) | ✅ PR #51 · regresó · restaurado 2026-06-04 |
| P2 | Dots de nav 10px < 44px táctil (medido: 32×10 / 10×10, flechas 36×36) | U-12 ([`../improvements.md`](../improvements.md)) | ✅ 2026-06-04 (44×44 verificado live) |
| P2 | Texto muted `#6b7585` = 4.2:1 (<4.5) + DESIGN.md §4.3 afirma 5.4:1 (dato MAL) | U-09 + [DESIGN.md §4.3](../../DESIGN.md) | ✅ 2026-06-04 (`#7a8392` = 5.06:1) |
| P3 | Grilla `loading="lazy"` → warning LCP + flash de gradiente en frío | U-17 | ✅ 2026-06-04 (eager/priority 1ra fila + hero spotlight) |

**Plan acordado (2026-06-03):** ✅ **Tanda 1 HECHA (2026-06-04)** = T-13 (fuga de tier) + U-09 (contraste) + U-12 (touch targets), verificada en vivo. ✅ **T-12 HECHA (2026-06-04, PR #50)** = `AlbumSpotlight` (onboard del álbum low-fill). ✅ **T-10 HECHA (PR #51)** = filter bar colapsable. ✅ **T-08 HECHA (2026-06-04)** = detalle apaisado (reveal descopeado → T-15). ✅ **U-17 HECHA (2026-06-04)** = eager/priority 1ra fila + hero del spotlight. ✅ **T-14 HECHA (2026-06-04)** = smoke determinístico (pack pending sembrado en global-setup). **Re-run del critique 2026-06-04: 29 → 31/40.** ✅ **Leyenda/ayuda HECHA** (dots de tier + glosas). ✅ **Búsqueda + filtros-URL HECHA** (buscador por nombre/número + filtros persistidos en la querystring; de paso se **restauró el colapso mobile de T-10**, que había regresado). ✅ **T-15 HECHA** (reveal: summary 2×2 + lite respetan el ratio; el 3D procedural queda igual). **Backlog del critique CERRADO.**

---

## Referencias

- [`../05-sql-functions.md`](../05-sql-functions.md) — `pin_card`, `dismantle_card`
- [`./e1-pack-opening.md`](./e1-pack-opening.md) — Flow previo (apertura)
- [`./e3-sharing.md`](./e3-sharing.md) — Acción "Compartir" del dialog
- [`./profile.md`](./profile.md) — Los cromos pineados aparecen en el perfil
