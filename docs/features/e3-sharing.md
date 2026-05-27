# Feature · E3 Sharing

Compartir un cromo por WhatsApp/Twitter/Copy/Native share, con **OG image generada dinámicamente** y **página pública del cromo**.

**Estado**: ✅ Cerrado y funcional.

---

## Flow del usuario

### El que comparte
1. En `/album`, click en un cromo owned
2. CardDetailDialog se abre con info + acciones
3. Click "Compartir" → **ShareSheet** desde abajo con 4 opciones:
   - **Compartir...** (solo mobile, usa Web Share API nativa)
   - **WhatsApp**
   - **Twitter**
   - **Copiar link**
4. Click en una opción → ejecuta + toast de confirmación + registra `share_event`
5. La URL compartida: `https://cromiks.app/cromo/[cardId]?u=[username]`

### El que recibe
1. Ve preview rico en WhatsApp/Twitter (OG image 1200×630 generada dinámicamente)
2. Click → llega a `/cromo/[cardId]?u=username`
3. Ve el cromo grande, info, "@username te compartió este cromo"
4. CTA contextual:
   - **No logueado** → "Empezar mi álbum gratis" → `/signin`
   - **Logueado sin la card** → "Aún no lo tenés" + "Ir a mi home"
   - **Logueado con la card** → "Lo tenés ×N" + "Ver mi álbum"

---

## Archivos

### Feature
```
src/features/sharing/
├── actions.ts                      # recordShare(cardId, channel)
└── components/
    └── share-sheet.tsx             # Sheet con 4 opciones de share
```

### Routes
```
src/app/
├── api/og/card/[cardId]/route.tsx  # OG image generator (next/og)
└── cromo/[cardId]/page.tsx         # Página pública del cromo
```

### SQL
```
supabase/migrations/
└── 20260526150000_e3_sharing_trigger.sql
```

---

## ShareSheet (`features/sharing/components/share-sheet.tsx`)

Sheet inferior con 4 targets. Detecta si el browser soporta `navigator.share` (mayoría de mobile) y muestra el botón "Compartir..." nativo.

**Pattern**:
```ts
const handleWhatsApp = () => {
  window.open(`https://wa.me/?text=...`, '_blank')
  track('whatsapp')      // ← fire-and-forget recordShare
  toast.success('Compartido en WhatsApp')
  onOpenChange(false)
}
```

⚠️ El `recordShare()` se llama en background con `useTransition`. Si falla, **no rollbackeamos** — el share del browser ya pasó. Solo perdemos el tracking.

### URL que se construye

```ts
const buildShareUrl = (): string => {
  const origin = window.location.origin
  const path = `/cromo/${cardId}`
  const query = username ? `?u=${encodeURIComponent(username)}` : ''
  return `${origin}${path}${query}`
}
```

Si el user no tiene username (no completó onboarding) → comparte sin `?u=`.

---

## Server action `recordShare(cardId, channel)`

```ts
// features/sharing/actions.ts
type ShareChannel = 'whatsapp' | 'twitter' | 'copy' | 'native' | 'instagram'

export async function recordShare(cardId: string, channel: ShareChannel)
```

Inserta en `share_events`. El INSERT dispara el trigger `trg_advance_share_card` que avanza misiones de tipo `share_card`.

`revalidatePath('/')` al final por si la mission `share_card` saltó a `completed`.

---

## OG Image dinámica (`/api/og/card/[cardId]`)

Endpoint que genera **imagen 1200×630** representando el cromo, lista para preview rico en Twitter/WhatsApp/Instagram.

### Stack
- **`next/og`** wrappea Satori (JSX → SVG) + Resvg (SVG → PNG) internamente
- No requiere instalar deps adicionales — viene con Next 16
- Runtime: `nodejs` (necesitamos acceso a Supabase para fetchear la card)

### Composition
```
┌─────────────────────────────────────────┐
│ CROMIKS                ETERNO DICIEMBRE │
│                                          │
│ ┌─────────┐    ★ Momento eterno         │
│ │         │    Dibu ataja a Coman       │
│ │ Cromo   │    GK · Aston Villa         │
│ │ block   │                              │
│ │ 320x440 │    [ Legendaria ]  · cromo #150
│ │         │                              │
│ └─────────┘                              │
│                                          │
│ Compartido por @ezequiel    150 / 205   │
└─────────────────────────────────────────┘
```

### Tier-coding
Cada rareza tiene su paleta literal (no CSS vars — Satori no las soporta):

| Tier | Background gradient | Accent |
|---|---|---|
| common | navy + grey | `#7E8896` |
| uncommon | navy + dorado tenue | `#D4A93C` |
| rare | navy + celeste | `#6BB9FF` |
| epic | navy + violeta | `#B97FE3` |
| legendary | navy + dorado fuerte | `#D4A93C` |

### Limitaciones de Satori (aprendidas a las malas)

⚠️ **Cualquier `<div>` con más de un child debe tener `display: 'flex'` explícito**. JSX trata strings con interpolación como múltiples children:

```tsx
// ❌ ROMPE — "· cromo #" + variable = 2 children
<div>· cromo #{card.card_number}</div>

// ✅ OK — variable interpolada en template literal = 1 child
<div>{`· cromo #${card.card_number}`}</div>

// ✅ OK alternativo — display: flex permite multi-children
<div style={{ display: 'flex' }}>· cromo #{card.card_number}</div>
```

Solución general: agregar `display: 'flex'` a TODOS los divs del JSX del OG image. Es la convención recomendada por Satori.

Otras limitaciones:
- Subset de CSS: flexbox sí, grid limitado, no `filter`, no `box-shadow inset`
- linear/radial-gradient soportado
- Fonts: usa system default si no se proveen (custom fonts requiere `ArrayBuffer`)

### Cache

Vercel cachea OG images por default. La URL es determinística por `cardId + ?u=username`. Si cambia el contenido del cromo, invalidar.

---

## Página pública `/cromo/[cardId]`

### Metadata OG

```ts
export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
  const ogUrl = u
    ? `/api/og/card/${card.id}?u=${encodeURIComponent(u)}`
    : `/api/og/card/${card.id}`
  
  return {
    title: `${card.name} · Cromiks`,
    description: u ? `@${u} te compartió este cromo...` : `Cromo #${card.card_number}...`,
    openGraph: {
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogUrl],
    },
  }
}
```

### Layout

- **Sin shell de la app** — standalone, clean para visitors no-logueados
- Header minimal: "Cromiks" + "Entrar" (si no logueado)
- Hero: cromo grande size="lg" + info + descripción
- Footer CTA contextual (3 variantes según viewer)

### Mejora E3 "¿lo tenés?"

Si el viewer está logueado, fetcheamos `user_cards`:

```ts
let viewerOwnership: { copies: number } | null = null
if (user) {
  const { data: uc } = await supabase
    .from('user_cards')
    .select('copies')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .maybeSingle()
  if (uc) viewerOwnership = { copies: uc.copies ?? 1 }
}
```

Y mostramos badge dorado "Lo tenés ×N" o "Aún no lo tenés".

---

## Tabla `share_events` (migration 150000)

Si no existía, la migration la crea con:

```sql
CREATE TABLE IF NOT EXISTS public.share_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  channel text,
  created_at timestamptz not null default now()
);
```

RLS:
- SELECT: público (`true`)
- INSERT: solo dueño (`auth.uid() = user_id`)

Indices:
- `idx_share_events_user_id`
- `idx_share_events_card_id`

---

## Trigger `trg_advance_share_card`

```sql
CREATE TRIGGER trg_advance_share_card
AFTER INSERT ON public.share_events
FOR EACH ROW
EXECUTE FUNCTION public._on_share_event_inserted();
```

`_on_share_event_inserted()` llama:
```sql
perform public._advance_missions(
  new.user_id,
  'share_card'::mission_type,
  1,
  jsonb_build_object('channel', coalesce(new.channel, 'unknown'))
);
```

El context incluye `channel` para futuras misiones tipo "compartí 3 veces por Twitter".

---

## Connection con perfil

El **`username` en attribution** (`?u=username`) viene del feature de perfil. Específicamente desde `getCurrentUserProfile()` de [`./profile.md`](./profile.md), pasado desde `app/(app)/album/page.tsx` → `AlbumView` → `CardDetailDialog` → `ShareSheet`.

Si el user no completó onboarding, no tiene username → comparte sin attribution.

---

## Pendientes

| | |
|---|---|
| 🚧 | Custom fonts en OG image (cargar Inter como ArrayBuffer) |
| 🚧 | Endpoint `/api/og/profile/[username]` para OG de perfil (hoy reusa el del cromo más pineado) |
| 🚧 | Analytics dashboard de shares (`share_events` tiene los datos) |
| 🚧 | Más targets: Instagram Stories (URL scheme), Telegram, Email |

---

## Referencias

- [`./profile.md`](./profile.md) — Username system (driver de attribution)
- [`./e1-album.md`](./e1-album.md) — Dónde se abre el ShareSheet
- [`../05-sql-functions.md`](../05-sql-functions.md) — `_advance_missions`, trigger `share_card`
- [`./e2-missions.md`](./e2-missions.md) — Mission template `share_card`
