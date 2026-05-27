# Feature · Perfil público

Página `/u/[username]` con stats + cromos pineados. Pública, accesible sin auth.

**Estado**: ✅ V1 cerrado. Pendiente: avatar real, OG image específica, badges section.

---

## Flow del usuario

### Owner
1. Va a `/u/su-username` (link desde nav o tras compartir)
2. Ve sus stats: cromos, racha, sobres
3. Ve sus cromos pineados
4. Botón "Compartir mi perfil"

### Visitante logueado
1. Llega vía share desde otro user
2. Ve el perfil del otro user con sus stats + pineados
3. CTA: "Ver mi perfil"
4. Click en un cromo pineado → va a `/cromo/[cardId]?u=username`

### Visitante no logueado
1. Llega vía share por WhatsApp/Twitter
2. Ve preview rico (OG image)
3. CTA: "Empezar gratis" → `/signin`

---

## Archivos

```
src/features/profile/
├── queries.ts              # getCurrentUserProfile, getProfileByUsername
└── components/
    └── profile-view.tsx    # UI completa del perfil

src/app/
└── u/[username]/page.tsx   # Server component público
```

---

## Username system

⚠️ **Ya existía** desde antes del feature de perfil. La tabla `profiles` con `username UNIQUE` y la lógica de onboarding venían implementadas.

### Constraint del username
Regex: `^[a-z0-9_]{3,20}$`. Validado tanto client-side (debounced check) como server-side.

### `features/onboarding/actions.ts`

| Action | Hace |
|---|---|
| `checkUsernameAvailable(username)` | Validación + check unicidad (excluye el propio user) |
| `completeOnboarding({ username, displayName, language, countryCode })` | UPDATE profile + marca `user_metadata.onboarded = true` + redirect a `/` |

### Por qué tabla `profiles` y no `user_metadata`
`user_metadata` no soporta UNIQUE constraint nativo y es más lento para queries. La tabla `profiles` con `username UNIQUE` permite búsquedas O(log n) por username y constraints de integridad.

---

## Queries (`features/profile/queries.ts`)

### `getCurrentUserProfile(): Promise<ProfileBasic | null>`

Trae el profile del user logueado. Si no hay user o no tiene `username` (no completó onboarding) → `null`.

**Uso**: connector cross-feature. Por ejemplo, `app/(app)/album/page.tsx` lo usa para pasar `username` al `ShareSheet`.

### `getProfileByUsername(username): Promise<ProfilePublic | null>`

Query principal de la página pública. **4 fetches en paralelo**:

1. Profile básico (id, username, display_name, language, country_code)
2. Count de `user_cards` filtrado al álbum (con inner join)
3. Total cards del álbum
4. Streak data
5. Pineados (max 12, join con cards para data completa)

Retorna:
```ts
type ProfilePublic = {
  id, username, displayName, language, countryCode,
  stats: {
    cardsOwned, totalCards,
    currentStreak, longestStreak,
    totalClaims,
  },
  pinnedCards: ProfilePinnedCard[]  // max 12
}
```

---

## Componente `ProfileView`

### Layout

| Sección | Detalle |
|---|---|
| **Header** | Avatar placeholder con inicial, display_name, @username, país con bandera emoji, botón compartir |
| **Stats grid (3 cols)** | Cromos (X de 205, %) / Racha (días + récord) / Sobres (total abiertos) |
| **Cromos destacados** | Grid 2-4 cols con hasta 12 pineados, click → `/cromo/[cardId]` |
| **Footer CTA** | Visible solo si NO es el owner. Contextual según logueado |

### Detección owner vs viewer

```ts
const isOwner = viewerId === profile.id
const isLoggedIn = !!viewerId
```

| Caso | Footer CTA |
|---|---|
| `isOwner` | (sin footer, ya tiene share en header) |
| `isLoggedIn` y otro user | "Ver mi perfil" → `/u/[viewerUsername]` |
| No logueado | "Empezar gratis" → `/signin` |

### Share del perfil

```ts
const handleShareProfile = async () => {
  const url = window.location.href
  const text = isOwner ? `Mirá mi álbum eterno en Cromiks` : `...@${username}...`
  
  // Try Web Share API → fallback a copy
  if ('share' in navigator) {
    await navigator.share({ title, text, url })
  } else {
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado')
  }
}
```

---

## Metadata OG del perfil

```ts
// app/u/[username]/page.tsx → generateMetadata
const ogUrl = firstPinned
  ? `/api/og/card/${firstPinned.id}?u=${username}`  // reuse del primer pineado
  : '/og-default.png'                                // fallback genérico

openGraph: {
  title: `${displayName} · Cromiks`,
  description: `${cardsOwned} de 205 cromos · ${streak} días de racha`,
  images: [{ url: ogUrl, width: 1200, height: 630 }],
  type: 'profile',
}
```

🚧 **Pendiente**: hacer un endpoint `/api/og/profile/[username]` específico para perfiles, con stats + grid de pineados.

---

## Country flags

Mapping simple en el componente:
```ts
const countryFlags = {
  AR: '🇦🇷', BR: '🇧🇷', UY: '🇺🇾', CL: '🇨🇱', PY: '🇵🇾',
  CO: '🇨🇴', MX: '🇲🇽', ES: '🇪🇸', IT: '🇮🇹', US: '🇺🇸',
}
```

Si el countryCode no está en el mapping, no muestra emoji.

---

## Layout sin shell

La página `/u/[username]` es **standalone** — no usa `AppShell` ni `MarketingShell`. Solo un header minimal con link a "Cromiks" y "Entrar" (si no logueado).

Razón: los visitors que llegan por share son random people, no necesariamente users. Mantener la UX clean y focused en el cromo / perfil.

---

## Limit de pineados

Hoy: **max 12** cromos en el perfil. Suficiente para showcase, no inflama la página.

🚧 Pendiente: paginación o "ver más" si el user tiene >12 pineados. Por ahora corta silenciosamente.

---

## Conexión con otros features

| Feature | Cómo usa profile |
|---|---|
| **E3 Sharing** | `?u=username` en share URLs viene de aquí (atribución) |
| **Album** | `app/(app)/album/page.tsx` llama `getCurrentUserProfile()` y pasa username al CardDetailDialog → ShareSheet |
| **Página pública del cromo** | El user que comparte tiene username; el cromo público lo muestra como "compartido por @username" |
| **Future: Badges** | Section "Badges" se sumará al perfil (ver [`../roadmap.md`](../roadmap.md)) |

---

## Pendientes

| | |
|---|---|
| 🚧 | Avatar real (campo `avatar_url` en profiles + upload a Supabase Storage) |
| 🚧 | Bio (campo en profiles) |
| 🚧 | OG image específica del perfil (no reuso del cromo más pineado) |
| 🚧 | "Ver más cromos" con paginación si tiene >12 pineados |
| 🚧 | Sección "Badges" — cuando exista el feature |
| 🚧 | Followers / Following (si decidimos hacer red social) |
| 🚧 | Settings page para editar profile fields |

---

## Referencias

- [`./e3-sharing.md`](./e3-sharing.md) — Cómo se conecta el username al sharing
- [`./e1-album.md`](./e1-album.md) — Los cromos pineados se setean desde el dialog del álbum
- [`../04-database.md`](../04-database.md) — Tabla `profiles`
- [`../roadmap.md`](../roadmap.md) — Badges como próximo paso natural
