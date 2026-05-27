# 02 · Arquitectura

## Estructura de carpetas (detalle)

```
src/
├── app/                          # Next.js App Router
│   ├── (app)/                    # ✅ Route group AUTH-REQUIRED
│   │   ├── home/page.tsx
│   │   ├── album/page.tsx        # /album?page=N
│   │   └── layout.tsx            # Guard de auth + AppShell
│   ├── (focus)/                  # 🎬 Fullscreen routes (sin shell)
│   │   ├── onboarding/page.tsx
│   │   └── open/[packId]/page.tsx  # /open/[packId]?debug=true
│   ├── (marketing)/              # 🌐 Public routes con marketing shell
│   ├── api/
│   │   └── og/card/[cardId]/route.tsx   # OG image generator
│   ├── auth/                     # Auth callbacks de Supabase
│   ├── cromo/[cardId]/page.tsx   # 🌐 Página pública del cromo (share target)
│   ├── u/[username]/page.tsx     # 🌐 Perfil público
│   ├── styleguide/               # Internal styleguide (no público)
│   ├── globals.css               # CSS vars de tokens del DS
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing / Home según auth
│
├── components/
│   ├── domain/                   # Componentes específicos del producto
│   │   ├── cromo.tsx             # ⭐ Componente central — el "cromo" visual
│   │   ├── cromo-placeholder.tsx # SVG abstracto cuando no hay foto
│   │   ├── sobre.tsx             # Sobre visual (2D, no 3D)
│   │   ├── tier-label.tsx        # "RARA" / "ÉPICA" / etc
│   │   └── rarity-badge.tsx
│   ├── effects/                  # ⚠️ Placeholder, no usado todavía
│   ├── layout/
│   │   ├── app-shell.tsx         # Layout autenticado
│   │   ├── marketing-shell.tsx   # Layout público
│   │   ├── navbar.tsx
│   │   ├── mobile-nav.tsx
│   │   └── footer.tsx
│   ├── ui/                       # shadcn-style primitives reskinados
│   │   ├── button.tsx            # variants: primary | ghost | gold | danger
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── input.tsx
│   │   ├── otp-input.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tooltip.tsx
│   │   └── sonner.tsx
│   └── playground.tsx
│
├── features/                     # ⭐ Lógica organizada por dominio
│   ├── album/
│   │   ├── queries.ts            # getAlbumData(pageNumber)
│   │   ├── actions.ts            # pinCard, unpinCard, dismantleCard
│   │   └── components/
│   │       ├── album-view.tsx
│   │       ├── album-slot.tsx
│   │       ├── album-page-nav.tsx
│   │       └── card-detail-dialog.tsx
│   ├── auth/
│   ├── home/
│   │   ├── queries.ts            # getHomeData()
│   │   ├── actions.ts            # claimDailyPack, assignDailyMissions
│   │   └── components/
│   │       ├── home.tsx
│   │       ├── daily-pack-card.tsx
│   │       ├── streak-card.tsx
│   │       ├── album-progress-card.tsx
│   │       └── missions-card.tsx
│   ├── landing/                  # Landing marketing
│   ├── missions/                 # E2 features
│   │   ├── queries.ts            # getMissionsForUser()
│   │   └── actions.ts            # claimMission
│   ├── onboarding/
│   │   ├── actions.ts            # completeOnboarding, checkUsernameAvailable
│   │   └── components/onboarding-form.tsx
│   ├── pack-opening/             # E1.2
│   │   ├── actions.ts            # openPack
│   │   ├── debug-data.ts         # Mock para ?debug=true
│   │   ├── types.ts
│   │   └── components/
│   │       ├── pack-opening-flow.tsx
│   │       ├── phase-anticipation.tsx
│   │       ├── phase-tear.tsx
│   │       ├── phase-stack.tsx
│   │       ├── phase-summary.tsx
│   │       └── 3d/
│   │           ├── sobre-scene.tsx
│   │           ├── pack-model.tsx
│   │           ├── card-mesh.tsx
│   │           └── card-scene.tsx
│   ├── profile/                  # ✨ Nuevo
│   │   ├── queries.ts            # getCurrentUserProfile, getProfileByUsername
│   │   └── components/profile-view.tsx
│   └── sharing/                  # ✨ E3
│       ├── actions.ts            # recordShare
│       └── components/share-sheet.tsx
│
├── lib/
│   ├── hooks/
│   │   └── use-reduced-motion.ts
│   ├── supabase/
│   │   ├── client.ts             # Browser-side client
│   │   ├── server.ts             # Server-side client (App Router)
│   │   └── admin.ts              # Service role (scripts, server actions especiales)
│   ├── fonts.ts
│   └── utils.ts                  # cn(), helpers
│
└── types/
    └── database.types.ts         # ⚠️ Generado por `pnpm db:types`. No editar a mano
```

---

## Patterns y conventions

### 1. Server vs Client components

**Default = Server Component**. Marcamos client solo cuando necesitamos:
- Estado (`useState`, `useTransition`)
- Event handlers (`onClick`)
- Browser APIs (`navigator.share`, `window.location`)
- Hooks que no sean de Server Components

```tsx
'use client'   // ← marca explícita

import { useState } from 'react'
```

### 2. Feature folders

Cada feature vive en `src/features/<feature-name>/` con:
- `queries.ts` — funciones server-only que fetchean data (no exportables a client)
- `actions.ts` — server actions (`'use server'`)
- `components/` — UI específica del feature

Esto facilita el **agrupamiento por dominio** sin importar si es presentation o data.

### 3. Pattern de queries

```ts
// src/features/album/queries.ts
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type AlbumData = { /* ... */ }

export async function getAlbumData(pageNumber = 1): Promise<AlbumData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // ... fetches en paralelo con Promise.all
  // ... merge en JS si hace falta
  return { /* ... */ }
}
```

Convenciones:
- Siempre `import 'server-only'` para evitar uso accidental en client
- Tipo exportado con la shape del retorno
- Si requiere auth, retorna `null` si no hay user
- Hace fetches en paralelo con `Promise.all` cuando son independientes

### 4. Pattern de actions

```ts
// src/features/album/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function pinCard(
  cardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('pin_card', { p_card_id: cardId })
  
  if (error) {
    console.error('[album] pinCard:', error.message)
    return { ok: false, error: 'unknown' }
  }
  
  revalidatePath('/album')
  return { ok: true }
}
```

Convenciones:
- Return discriminated union `{ ok: true } | { ok: false; error: string }`
- Error codes mapeados desde el SQL si es relevante (e.g. `not_owned`, `no_extra_copies`)
- `revalidatePath('/...')` al final para invalidar caché de Next
- Log con prefijo `[feature]` para facilitar grep

### 5. Route groups

| Group | Auth required | Layout |
|---|---|---|
| `(app)` | ✅ Sí | AppShell con navbar |
| `(focus)` | ✅ Sí | Fullscreen, sin shell (apertura sobre, onboarding) |
| `(marketing)` | ❌ No | Marketing shell |
| Sin grupo (root) | Variable | Public, layout standalone (`/cromo/[cardId]`, `/u/[username]`) |

### 6. Tipos de DB

- `src/types/database.types.ts` es **generado**, no editar
- Después de cualquier migration: `pnpm db:types`
- Import: `import type { Database } from '@/types/database.types'`

### 7. CSS / Tailwind v4

- Tokens en `globals.css` como CSS vars (`--color-surface-deep`, etc.)
- Uso en clases: `bg-(--color-surface-deep)` (sintaxis v4)
- `next-themes` para dark mode, default `dark`

Ver detalle en [`03-design-system.md`](./03-design-system.md).

### 8. Naming

| Tipo | Convención | Ejemplo |
|---|---|---|
| Archivos | `kebab-case.tsx` | `card-detail-dialog.tsx` |
| Componentes | `PascalCase` | `CardDetailDialog` |
| Funciones / variables | `camelCase` | `getAlbumData` |
| Tipos | `PascalCase` | `AlbumCardSlot` |
| SQL functions | `snake_case` | `open_pack`, `claim_mission` |
| SQL output columns con prefijo | `out_` para evitar ambigüedad | `out_card_id`, `out_card_number` |

---

## Decisiones arquitectónicas registradas

| Decisión | Razón |
|---|---|
| **No GSAP** | Motion + useFrame + react-spring cubren 95% — menos deps |
| **Card 3D híbrido** (3D + HTML overlay) | Drei `<Text>` incompatible con three r0.184 |
| **`typedRoutes: false`** en next.config | Demasiado strict para dev rapid |
| **SQL versionado en `supabase/migrations/`** | Antes vivía solo en Supabase Studio. Decisión de 26 mayo 2026 |
| **Output columns SQL con `out_`** | Evitar ambigüedad con columnas reales (`card_id`, `card_number`). Resuelve bugs como "ambiguous column reference" |
| **Inner join `cards!inner(album_id)`** en queries de user_cards | Filtra automáticamente huérfanos de seeds anteriores |
| **Username único en tabla `profiles`** | Separado de `auth.users.user_metadata` — más queryeable y con constraint UNIQUE |
| **Página pública sin shell** (`/cromo/...`, `/u/...`) | Performance + UX clean para visitors que llegan por share |

---

## Referencias

- [`01-tech-stack.md`](./01-tech-stack.md) — Versiones, deps
- [`03-design-system.md`](./03-design-system.md) — CSS vars, button variants
- [`04-database.md`](./04-database.md) — Schema
- [`features/`](./features/) — Detalle de cada feature
