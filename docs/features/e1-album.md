# Feature · E1.3 + E1.4 — Álbum y detalle del cromo

Vista de los 205 cromos distribuidos en 10 páginas, con detalle modal del cromo individual.

**Estado**: ✅ Cerrado. Funcional con `pageCompletion` en el nav.

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
├── queries.ts                  # getAlbumData(pageNumber)
├── actions.ts                  # pinCard, unpinCard, dismantleCard
└── components/
    ├── album-view.tsx          # Vista cliente principal
    ├── album-slot.tsx          # Slot individual (owned/missing)
    ├── album-page-nav.tsx      # Nav prev/next + dots con completion
    └── card-detail-dialog.tsx  # Modal de detalle (E1.4)
```

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
| **Header sticky** | "Eterno Diciembre" + progreso global `X/205` + barra % |
| **Page header** | Número + título + subtitle + completion `X/Y` |
| **Grid responsive** | 4 cols mobile → 5 sm → 6 md → 7 lg |
| **Page nav abajo** | Prev/next buttons + 10 dots |
| **Stagger fade-in** | Motion al cambiar página (`staggerChildren: 0.03`) |
| **Empty state** | Mensaje si `pageOwned === 0` |

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

⚠️ **No usamos el componente `<Cromo>` completo** en el grid por performance. Las miniaturas son simplificadas.

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
| 🚧 | Filtros (por tier, por completion, pineadas) |
| 🚧 | Loading skeleton |
| 🚧 | Ordering options |
| 🚧 | "Saltar a página con cromos owned" CTA si todas las páginas visibles están vacías |

---

## Referencias

- [`../05-sql-functions.md`](../05-sql-functions.md) — `pin_card`, `dismantle_card`
- [`./e1-pack-opening.md`](./e1-pack-opening.md) — Flow previo (apertura)
- [`./e3-sharing.md`](./e3-sharing.md) — Acción "Compartir" del dialog
- [`./profile.md`](./profile.md) — Los cromos pineados aparecen en el perfil
