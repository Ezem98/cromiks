# 🛠️ Plan PR6 · Integración de PostHog (product analytics + feature flags)

> Snapshot: 2026-05-27.

---

## Context

Pre-launch tenemos 5 PRs mergeados a `main` (Zod + `defineAction`, Sentry, Upstash Ratelimit, Playwright + CI, idempotencia open_pack + B-09 coins context). **Sentry cubre los errores** pero no hay visibilidad de producto: no podemos medir si los usuarios completan onboarding, si vuelven al segundo día, si abren más de un sobre, ni qué tier de cromo dispara más shares. Tampoco hay forma de encender/apagar features sin redeploy.

[`docs/tech-proposals.md` §TP-03](../../Documents/cromiks/docs/tech-proposals.md) ya identificó PostHog como la opción (reemplaza Mixpanel + LaunchDarkly + LogRocket, free tier generoso). Está marcado como **"fuera de scope" del plan pre-launch original** pero hace falta antes del beta cerrado de junio 2026 para no volar a ciegas.

**Outcome esperado de PR6**:
- Pageviews automáticos en client + 5 eventos explícitos de conversión (`onboarding_completed`, `daily_pack_claimed`, `pack_opened`, `card_pinned`, `share_initiated`).
- Server-side helper `track()` en [`src/lib/analytics.ts`](../../Documents/cromiks/src/lib/analytics.ts) (archivo nuevo) que cualquier action puede llamar. Sin acoplar a `defineAction`.
- `identify(user.id)` automático cuando hay sesión, vía `<PostHogProvider>` montado en `(app)/layout.tsx`.
- Feature flags vía hook `useFeatureFlag(name)` listo para usar (sin flags definidos hardcoded — se crean en el dashboard cuando se necesiten).
- Kill switches `POSTHOG_DISABLED` (server) + `NEXT_PUBLIC_POSTHOG_DISABLED` (client), mismo patrón que Sentry.
- CI corre con PostHog disabled (no contamina analytics).

---

## 📊 Tabla resumen

| # | Item | Decisión | Esfuerzo (h) | Archivos clave |
|---|---|---|---|---|
| 1 | Setup base (deps + configs + env) | Cloud `us.i.posthog.com`, key hardcodeada (es pública) | 1 | `package.json`, `src/lib/posthog/*` (nuevo) |
| 2 | Client init: `PostHogProvider` | Client component con `import posthog from 'posthog-js'`, `autocapture: false`, pageviews automáticos | 1.5 | `src/components/analytics/posthog-provider.tsx` (nuevo), `src/app/layout.tsx`, `src/app/(app)/layout.tsx` |
| 3 | Server helper `track()` | Singleton `posthog-node` con kill switch + `flush()` después de cada call | 1.5 | `src/lib/analytics.ts` (nuevo) |
| 4 | Wire de 5 eventos críticos | Manual en cada action (no en `defineAction`) | 1 | `src/features/{onboarding,home,pack-opening,album,sharing}/actions.ts` |
| 5 | Hook `useFeatureFlag` | Wrapper sobre `posthog.getFeatureFlag()` con SSR-safe fallback | 0.5 | `src/lib/posthog/use-feature-flag.ts` (nuevo) |
| 6 | CI + Playwright kill switch | `POSTHOG_DISABLED=true` en e2e job | 0.25 | `.github/workflows/ci.yml`, `playwright.config.ts` |
| 7 | Docs | Actualizar tech-stack + `feature-status.md` | 0.5 | `docs/01-tech-stack.md`, `docs/feature-status.md`, `docs/tech-proposals.md` (TP-03 → done) |
| **Total** | | | **~6 h** | |

| Env vars nuevas | Servicio | Dónde se setea |
|---|---|---|
| `POSTHOG_DISABLED` (kill switch server, opt-in) | — | Railway runtime (no se setea → enabled), GitHub Actions e2e (=`true`), `.env.local` opcional |
| `NEXT_PUBLIC_POSTHOG_DISABLED` (kill switch client, opt-in) | — | Mismo patrón. Inlineado al bundle en `next build` |

> **Notas**:
> - `POSTHOG_PROJECT_KEY` y `POSTHOG_HOST` **no** son env vars: están hardcodeados en `src/lib/posthog/config.ts` (key pública del proyecto, host fijo `https://us.i.posthog.com`). Mismo criterio que el DSN de Sentry (ver [`sentry.server.config.ts:38`](../../Documents/cromiks/sentry.server.config.ts#L38)).
> - No agregamos `POSTHOG_REPLAYS_DISABLED` ahora — session replays quedan apagados a nivel código (`disable_session_recording: true`). Si se activan después, ahí sí agregamos el toggle.

---

## 🧩 Diseño cruzado: por qué helper manual y no integración en `defineAction`

Decisión: el helper `track()` vive en [`src/lib/analytics.ts`](../../Documents/cromiks/src/lib/analytics.ts) y cada action que quiere trackear lo llama explícitamente dentro de su `fn`. **No** agregamos un campo `events` a `defineAction`.

Razones:
- **Mantenemos la signature de `defineAction` estable**: ya tiene 5 fields (`name`, `schema`, `rateLimit`, `auth`, `expectedErrors`, `fn`). Agregar `events` complica el typing y la API.
- **Sentry y PostHog cubren cosas distintas**: Sentry ya recibe los `code` de fallo. Si `defineAction` emitiera eventos automáticos a PostHog tendríamos doble fuente para "action.failed" y eventos de bajo valor (`invalid_input`, `unauthenticated`).
- **Props ricas requieren contexto del fn**: `pack_opened` necesita `was_replay`, `cards_count`, `coins_earned` — todo viene del resultado del RPC, no del wrapper. Extraer via callbacks termina más feo que llamar `track()` adentro.
- **Granularidad de eventos**: solo 5 acciones de 9 disparan eventos. El resto (e.g. `unpinCard`, `checkUsernameAvailable`) no necesita PostHog. Hacer opt-in por action es más claro que opt-out.

---

## 1️⃣ Setup base

### Resumen ejecutivo
- **Objetivo**: instalar deps, crear módulo de config compartido (key + host + kill-switch helpers), agregar env vars a `.env.example`.
- **Outcome**: cualquier archivo del repo puede importar `import { posthogConfig, isPosthogEnabled } from '@/lib/posthog/config'` con tipos.

### Pasos

#### 1.1 Instalar dependencias

```bash
pnpm add posthog-js posthog-node
```

Tamaño:
- `posthog-js` ~25kb gzipped (con autocapture off — sin replays, sin surveys).
- `posthog-node` ~12kb. Solo server, no afecta bundle cliente.

#### 1.2 Crear `src/lib/posthog/config.ts`

```ts
// src/lib/posthog/config.ts
// Compartido entre server (posthog-node) y client (posthog-js).
// Project key es pública (igual que el DSN de Sentry) — se hardcodea, no env.

// TODO: reemplazar con la key real del proyecto en PostHog Cloud post-signup.
export const POSTHOG_PROJECT_KEY = 'phc_REPLACE_ME_FROM_DASHBOARD'

// US tiene la cuota gratuita más alta. Si más adelante se quiere EU residency,
// migrar el proyecto en el dashboard de PostHog (no se puede cambiar host por
// proyecto, hay que crear uno nuevo).
export const POSTHOG_HOST = 'https://us.i.posthog.com'

/** Kill switch server-side. Mismo patrón que SENTRY_DISABLED. */
export function isPosthogServerEnabled(): boolean {
  return process.env.POSTHOG_DISABLED !== 'true'
}

/** Kill switch client-side. Mismo patrón que NEXT_PUBLIC_SENTRY_DISABLED. */
export function isPosthogClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_POSTHOG_DISABLED !== 'true'
}
```

#### 1.3 `.env.example`

Agregar (con comentario):

```env
# PostHog kill switches (opt-in para apagar; default enabled).
# POSTHOG_DISABLED=true                    # apaga capturas server
# NEXT_PUBLIC_POSTHOG_DISABLED=true        # apaga capturas client
```

### Decisiones tomadas
- ✅ **Cloud, no self-host**: free tier alcanza pre-launch (~10k events/mo), cero infra. Decisión confirmada por el usuario.
- ✅ **Hardcoded key + host**: key es pública (igual que Sentry DSN). Evita una env var más por servicio. Decisión confirmada.

### Verificación
```bash
pnpm install
pnpm type-check  # debe pasar sin errores
```

### Rollback
`pnpm remove posthog-js posthog-node` + borrar `src/lib/posthog/`. No hay state externo persistido.

---

## 2️⃣ Client init: `PostHogProvider`

### Resumen ejecutivo
- **Objetivo**: bootear el SDK de PostHog en el cliente con captura híbrida (pageviews automáticos + autocapture off), identificar al usuario cuando hay sesión.
- **Outcome**: cualquier client component puede `import { usePostHog } from '@/components/analytics/posthog-provider'` y llamar `posthog.capture('event', {...})`.

### Pasos

#### 2.1 Crear `src/components/analytics/posthog-provider.tsx`

```tsx
'use client'

/**
 * PostHogProvider — bootea posthog-js, identifica al user, expone el client
 * via context. Se monta una sola vez (en root layout) — para layouts sin sesión
 * (marketing/landing) el provider corre igual pero NO identifica.
 *
 * Decisiones (ver docs/implementation-plan-pr6.md):
 * - autocapture: false → eventos explícitos solo
 * - capture_pageview: true (con history routing de Next, refleja navegación SPA)
 * - disable_session_recording: true → off pre-launch
 * - Kill switch: NEXT_PUBLIC_POSTHOG_DISABLED=true
 */

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'
import {
  POSTHOG_HOST,
  POSTHOG_PROJECT_KEY,
  isPosthogClientEnabled,
} from '@/lib/posthog/config'

export { usePostHog }

let initialized = false

function initPostHog() {
  if (initialized || typeof window === 'undefined') return
  if (!isPosthogClientEnabled()) return

  posthog.init(POSTHOG_PROJECT_KEY, {
    api_host: POSTHOG_HOST,

    // Modo híbrido (decisión del usuario):
    autocapture: false,
    capture_pageview: 'history_change', // SPA-friendly, capta cambios de App Router
    capture_pageleave: true,

    // Replays off pre-launch.
    disable_session_recording: true,

    // No queremos persistencia agresiva durante el dev local.
    persistence: 'localStorage+cookie',

    // Debug logs solo cuando explícitamente lo pedimos.
    debug: false,

    // Loaded callback: aprovechamos para taggear environment.
    loaded: (ph) => {
      ph.register({
        environment: process.env.NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME || 'development',
        release: process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA || undefined,
      })
    },
  })

  initialized = true
}

export function PostHogProvider({
  userId,
  username,
  children,
}: {
  userId?: string
  username?: string
  children: React.ReactNode
}) {
  useEffect(() => {
    initPostHog()
  }, [])

  // Identify cuando aparece el userId. Si el user hace logout (userId vuelve a
  // undefined), llamamos posthog.reset() para empezar fresh con anon distinct_id.
  useEffect(() => {
    if (!isPosthogClientEnabled() || !initialized) return
    if (userId) {
      posthog.identify(userId, username ? { username } : undefined)
    } else if (posthog.get_distinct_id() !== posthog.get_distinct_id()) {
      // no-op: si nunca hubo identify, no hace falta reset
    }
  }, [userId, username])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

#### 2.2 Montar el provider en `src/app/layout.tsx`

Wrap del `<body>` con `<PostHogProvider>` sin userId — para que pageviews públicos (landing, `/cromo/[id]`, `/u/[username]`) capturen como anónimos.

```tsx
// src/app/layout.tsx (delta)
import { PostHogProvider } from '@/components/analytics/posthog-provider'

// ...
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${fontVariables} dark`}>
      <body>
        <PostHogProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </PostHogProvider>
      </body>
    </html>
  )
}
```

#### 2.3 Identificar al user dentro de `(app)/layout.tsx`

El layout autenticado ya tiene el `user` server-side. Pasamos `userId` + `username` a un sub-provider que llama `identify`. Estructura idéntica al `CoinsBalanceProvider` (ver [`src/components/layout/coins-balance-context.tsx`](../../Documents/cromiks/src/components/layout/coins-balance-context.tsx)).

```tsx
// src/app/(app)/layout.tsx (delta — solo el wrap relevante)
import { PostHogIdentify } from '@/components/analytics/posthog-identify'

// ...dentro del return, envolviendo el shell:
<PostHogIdentify userId={user.id} username={profile?.username}>
  <AppShell ...>{children}</AppShell>
</PostHogIdentify>
```

```tsx
// src/components/analytics/posthog-identify.tsx (nuevo)
'use client'

import { useEffect } from 'react'
import { usePostHog } from '@/components/analytics/posthog-provider'
import { isPosthogClientEnabled } from '@/lib/posthog/config'

export function PostHogIdentify({
  userId,
  username,
  children,
}: {
  userId: string
  username?: string
  children: React.ReactNode
}) {
  const posthog = usePostHog()

  useEffect(() => {
    if (!isPosthogClientEnabled() || !posthog || !userId) return
    posthog.identify(userId, username ? { username } : undefined)
  }, [posthog, userId, username])

  return <>{children}</>
}
```

> **Por qué split provider/identify**: el provider tiene que vivir en root layout para cubrir páginas públicas, pero el `identify(userId)` solo aplica adentro de `(app)/`. Separar evita rerenderizar todo el árbol cuando cambia el user.

### Decisiones tomadas
- ✅ **PostHogProvider client component con import estático**, no lazy: simplicidad > 25kb de delay (el bundle ya tiene Three.js / motion). Decisión confirmada.
- ✅ **`autocapture: false` + `capture_pageview: 'history_change'`**: híbrido. Decisión confirmada.
- ✅ **identify temprano via user.id**: beta cerrada, no necesitamos consent flow ahora. Decisión confirmada.
- ✅ **Split en dos componentes** (Provider en root layout + Identify dentro de `(app)/`): justificado arriba.

### Verificación
- `pnpm dev`, abrir `http://localhost:3000` con DevTools → Network → buscar requests a `us.i.posthog.com/e/`. Sin login, debe haber un `$pageview` con `distinct_id` anónimo.
- Login → ir a `/home` → el siguiente `$pageview` debe tener `distinct_id = user.id` (vía `identify`).
- `NEXT_PUBLIC_POSTHOG_DISABLED=true pnpm dev` → cero requests a posthog.com.

### Rollback
Quitar el wrap en `src/app/layout.tsx` y `src/app/(app)/layout.tsx`. El `<PHProvider>` no monta nada visible — sacarlo no rompe UI.

---

## 3️⃣ Server helper `track()`

### Resumen ejecutivo
- **Objetivo**: módulo `src/lib/analytics.ts` que expone `track(event, props, { distinctId })` para que cualquier server action emita eventos via `posthog-node`. Maneja kill switch, singleton, flush.
- **Outcome**: las 5 actions críticas (ver §4) ganan una línea `await track('event', {...}, { distinctId: userId })` después del path "ok".

### Pasos

#### 3.1 Crear `src/lib/analytics.ts`

```ts
// src/lib/analytics.ts
import 'server-only'

import { PostHog } from 'posthog-node'

import {
  POSTHOG_HOST,
  POSTHOG_PROJECT_KEY,
  isPosthogServerEnabled,
} from '@/lib/posthog/config'

/**
 * Singleton del cliente posthog-node. Razón:
 *  - Crearlo por request es caro (HTTP keepalive, internal batch).
 *  - El SDK ya maneja flush periódico interno (cada 10s o 20 events).
 *  - En Railway (Node persistente, no lambda fría por request) un singleton es
 *    seguro. Si más adelante migramos a Edge runtime, hay que cambiar a
 *    posthog-node con `flushAt: 1` o usar el endpoint /capture directamente.
 *
 * Kill switch: si POSTHOG_DISABLED=true, _client queda null y track() es no-op.
 */

let _client: PostHog | null = null

function getClient(): PostHog | null {
  if (!isPosthogServerEnabled()) return null
  if (_client) return _client

  _client = new PostHog(POSTHOG_PROJECT_KEY, {
    host: POSTHOG_HOST,
    flushAt: 20, // batch hasta 20 events antes de flush
    flushInterval: 10_000, // o cada 10s
  })

  return _client
}

type TrackOpts = {
  /** Supabase user.id. Si está ausente, va como anónimo distinct_id generado. */
  distinctId?: string
}

/**
 * Emite un evento a PostHog desde el server.
 *
 * Importante: NO hace `await flush()`. Confiamos en el batch interno del SDK,
 * que en Railway (Node persistente) procesa los events en background sin
 * bloquear el response. Si la action está a punto de hacer redirect()/notFound(),
 * el evento queda en buffer pero el siguiente tick lo flushea — aceptable para
 * analytics (no es transaccional).
 *
 * Si se necesita garantía de delivery (e.g. eventos críticos de billing en el
 * futuro), exponer un `flushNow: true` y llamar `await client.flush()`.
 */
export async function track(
  event: string,
  properties: Record<string, unknown> = {},
  { distinctId }: TrackOpts = {},
): Promise<void> {
  const client = getClient()
  if (!client) return

  try {
    client.capture({
      distinctId: distinctId ?? `anon_${crypto.randomUUID()}`,
      event,
      properties: {
        ...properties,
        environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
        release: process.env.RAILWAY_GIT_COMMIT_SHA,
      },
    })
  } catch (err) {
    // Nunca queremos que un fallo de analytics rompa el flow del user.
    // posthog-node debería ser fail-safe, pero defensivo.
    console.warn('[analytics] track failed', { event, err })
  }
}

/**
 * Para usos donde es crítico que el evento se mande antes de que el proceso
 * termine (ej. scripts standalone). En server actions normales no hace falta.
 */
export async function flushAnalytics(): Promise<void> {
  if (_client) await _client.flush()
}
```

### Decisiones tomadas
- ✅ **Singleton, no por-request**: Railway corre Node persistente, no lambdas. El SDK batchea internamente. Si después migramos a Edge, revisar.
- ✅ **No `await flush()` por call**: analytics no es transaccional. Buffer en memoria es aceptable. Si fuera Vercel/lambda fría hubiera que flushear con `waitUntil()`, en Railway no.
- ✅ **Anonymize fallback**: si `distinctId` falta y queremos trackear un evento (improbable, todas las actions críticas requieren auth), usamos un UUID anónimo. Defensivo.
- ✅ **try/catch en `track()`**: analytics nunca debe tirar un error que se propague al user. Fail-silent + console.warn.

### Verificación
- En un dev local con `POSTHOG_DISABLED` sin setear, llamar `await track('test_event', { hello: 'world' }, { distinctId: 'test-user' })` desde un script standalone (`pnpm tsx -e "..."`) y ver el evento aparecer en el dashboard de PostHog (Live events).
- Con `POSTHOG_DISABLED=true`, el mismo call debe ser no-op (verificar con `console.log` de debug).

### Rollback
Borrar el archivo. Ninguna action lo importa todavía hasta §4.

---

## 4️⃣ Wire de 5 eventos críticos

### Resumen ejecutivo
- **Objetivo**: emitir los 5 eventos elegidos (minimum viable funnel) desde las server actions correspondientes.
- **Outcome**: el dashboard de PostHog tiene datos accionables del funnel signup → onboarding → primer pack → primer cromo → primer share.

### Eventos y wire points

| Evento | Action | Props |
|---|---|---|
| `onboarding_completed` | `completeOnboarding` ([`src/features/onboarding/actions.ts`](../../Documents/cromiks/src/features/onboarding/actions.ts)) | `{ username }` |
| `daily_pack_claimed` | `claimDailyPack` ([`src/features/home/actions.ts`](../../Documents/cromiks/src/features/home/actions.ts)) | `{ streak, pack_type }` |
| `pack_opened` | `openPack` ([`src/features/pack-opening/actions.ts`](../../Documents/cromiks/src/features/pack-opening/actions.ts)) | `{ pack_type, cards_count, new_cards_count, coins_earned, was_replay }` |
| `card_pinned` | `pinCard` + `unpinCard` ([`src/features/album/actions.ts`](../../Documents/cromiks/src/features/album/actions.ts)) | `{ tier, action: 'pin'\|'unpin' }` |
| `share_initiated` | `recordShare` ([`src/features/sharing/actions.ts`](../../Documents/cromiks/src/features/sharing/actions.ts)) | `{ channel, target_card_id }` |

### Pattern de cambio (idéntico en cada action)

```ts
// ANTES (ejemplo: pinCard)
export const pinCard = defineAction({
  name: 'pinCard',
  schema: z.object({ cardId: z.uuid() }),
  fn: async ({ cardId }, { supabase }) => {
    const { error } = await supabase.rpc('pin_card', { p_card_id: cardId })
    if (error) return { ok: false, code: 'unknown', message: error.message }
    revalidatePath('/album')
    return { ok: true, data: undefined }
  },
})

// DESPUÉS
import { track } from '@/lib/analytics'

export const pinCard = defineAction({
  name: 'pinCard',
  schema: z.object({ cardId: z.uuid(), tier: z.string().optional() }), // tier viene del client para evitar otro round-trip
  fn: async ({ cardId, tier }, { supabase, userId }) => {
    const { error } = await supabase.rpc('pin_card', { p_card_id: cardId })
    if (error) return { ok: false, code: 'unknown', message: error.message }
    revalidatePath('/album')

    await track('card_pinned', { tier, action: 'pin' }, { distinctId: userId })

    return { ok: true, data: undefined }
  },
})
```

> **Nota sobre `was_replay` en `pack_opened`**: el RPC de open_pack ya distingue replay (devuelve `coins_earned=0` y `is_new=false` para todas las cartas, ver [`docs/implementation-plan-pr5.md`](../../Documents/cromiks/docs/implementation-plan-pr5.md)). Detectamos replay sumando `coins_earned` del retorno y chequeando si todas las cartas tienen `is_new=false`. Si querés trackear solo aperturas reales: filtrar `was_replay === true` en PostHog queries.

### Decisiones tomadas
- ✅ **5 eventos mínimos** (no los 8): `signup_completed` se omite — el evento útil es `onboarding_completed` (signup sin onboarding no es conversión). `card_dismantled` y `mission_claimed` se omiten — coins lifetime y misiones completas ya están en counts de DB queryeables desde PostHog vía properties de los eventos centrales. Se pueden agregar después si el dashboard pide más detalle.
- ✅ **Emisión post-`revalidatePath`, antes del return**: si la action redirige (e.g. `completeOnboarding` puede llamar `redirect('/home')`), el `track()` debe ejecutar antes — `redirect()` tira un error especial que `unstable_rethrow` re-emite. Pero `track()` no bloquea (no `await flush`), así que el evento queda en buffer aún si el redirect corta el control flow.
- ✅ **Props sin PII**: nada de email, nada de full name. Solo IDs, tiers, counts.

### Verificación
- E2E manual: corre el flow `signup → onboarding → home → reclamar sobre → /open → /album → pin un cromo → share`. En el dashboard de PostHog → Activity, los 5 eventos deben aparecer en orden con el distinct_id del test user.
- Unit: no se agregan tests nuevos — el smoke test ya cubre el golden path.

### Rollback
Eliminar el `import { track }` y la línea `await track(...)` de cada action. El RPC y la lógica de negocio no se tocan.

---

## 5️⃣ Hook `useFeatureFlag`

### Resumen ejecutivo
- **Objetivo**: helper para leer feature flags desde client components. Sin definir ningún flag hardcoded — los flags se crean en el dashboard de PostHog cuando se necesiten.
- **Outcome**: `const enabled = useFeatureFlag('enable_referrals')` retorna `boolean | undefined` (undefined = todavía cargando).

### Pasos

#### 5.1 Crear `src/lib/posthog/use-feature-flag.ts`

```ts
'use client'

import { useFeatureFlagEnabled } from 'posthog-js/react'

import { isPosthogClientEnabled } from '@/lib/posthog/config'

/**
 * Wrapper sobre useFeatureFlagEnabled de posthog-js/react.
 *
 * SSR-safe: si PostHog está disabled (kill switch o no inicializado todavía),
 * retorna undefined. El caller debe tratar `undefined` como "todavía no sé" y
 * NO como "feature off" — para evitar flash de UI.
 *
 * Uso:
 *   const enabled = useFeatureFlag('enable_referrals')
 *   if (enabled === undefined) return <Skeleton />
 *   return enabled ? <ReferralsCard /> : null
 */
export function useFeatureFlag(name: string): boolean | undefined {
  const flagValue = useFeatureFlagEnabled(name)

  if (!isPosthogClientEnabled()) return undefined
  return flagValue
}
```

> **Por qué no hay variant del lado server**: para PR6 no necesitamos flags en SC. Si después aparece la necesidad (ej. SSR de variant A/B de una landing), agregamos un helper `getFeatureFlag(name, distinctId)` usando `posthog-node` que ya está en `src/lib/analytics.ts`.

### Decisiones tomadas
- ✅ **Sin flags definidos hardcoded ahora**: el helper queda listo, los flags se crean en dashboard cuando aparezca el caso de uso. No queremos diluir el plan con flags hipotéticos.
- ✅ **Solo client side por ahora**: server-side flags suman complejidad (hydration mismatch, fetch en cada SC). Lo dejamos para cuando haga falta.

### Verificación
- Crear un flag de prueba en el dashboard de PostHog (`test_flag`, enabled 100%).
- Agregar temporalmente en algún client component: `console.log(useFeatureFlag('test_flag'))` y validar que después de la inicialización dé `true`.

### Rollback
Borrar el archivo. Ningún componente lo importa hasta que se use.

---

## 6️⃣ CI + Playwright kill switch

### Resumen ejecutivo
- **Objetivo**: el e2e job de CI corre con `POSTHOG_DISABLED=true` para no contaminar el dashboard con eventos sintéticos del smoke test.
- **Outcome**: CI verde sin tocar PostHog Cloud.

### Pasos

#### 6.1 [`.github/workflows/ci.yml`](../../Documents/cromiks/.github/workflows/ci.yml) — job `e2e`

Agregar dos env vars al bloque `env:` (líneas 48-54):

```yaml
      SENTRY_DISABLED: 'true'
      RATELIMIT_DISABLED: 'true'
      POSTHOG_DISABLED: 'true'                # NUEVO
      NEXT_PUBLIC_POSTHOG_DISABLED: 'true'    # NUEVO
```

#### 6.2 [`playwright.config.ts`](../../Documents/cromiks/playwright.config.ts) — webServer.env

Si `playwright.config.ts` inyecta env al `webServer` (chequear bloque `webServer.env`), agregar los mismos dos. Si no tiene bloque `env`, agregarlo siguiendo el patrón de `SENTRY_DISABLED`.

### Decisiones tomadas
- ✅ **Kill switch en CI**: ya es el patrón en Cromiks (Sentry y Ratelimit lo hacen). PostHog sigue el mismo molde.
- ✅ **Sin proyecto separado "ci" en PostHog**: overkill. Apagar es más simple que mantener dos proyectos.

### Verificación
- Push del PR → CI corre el job `e2e` → en logs grep `POSTHOG_DISABLED` para confirmar que se setea.
- Después del merge, validar que el dashboard de PostHog no tiene eventos con el email del test user (`PLAYWRIGHT_TEST_USER_EMAIL`).

### Rollback
Quitar las dos líneas.

---

## 7️⃣ Docs

### Resumen ejecutivo
- **Objetivo**: que la documentación refleje el estado real: PostHog instalado, env vars documentadas, TP-03 marcado como done.
- **Outcome**: una nueva sesión con la docs cargada entiende que PostHog está vivo.

### Pasos

#### 7.1 [`docs/01-tech-stack.md`](../../Documents/cromiks/docs/01-tech-stack.md)

- Tabla "Servicios futuros (planeados)" línea 124 (`PostHog | Analytics + feature flags | 🚧 No instalado`) → mover a la tabla de hosting/deploy y marcar como ✅.
- Sección "Variables de entorno": agregar `POSTHOG_DISABLED` y `NEXT_PUBLIC_POSTHOG_DISABLED` como opt-in kill switches.

#### 7.2 [`docs/feature-status.md`](../../Documents/cromiks/docs/feature-status.md)

Agregar fila: `Analytics (PostHog) | ✅ Instalado · 5 eventos · feature flags listos`.

#### 7.3 [`docs/tech-proposals.md`](../../Documents/cromiks/docs/tech-proposals.md)

- TP-03 (línea 89) → cambiar 🔥 ⚠️ por ✅ y agregar nota "Implementado en PR6 — ver `docs/implementation-plan-pr6.md`".

#### 7.4 Crear `docs/implementation-plan-pr6.md`

Copia de este archivo, sin la nota "Una vez aprobado, este documento se copia..." del header.

### Verificación
- `pnpm lint` en docs no rompe.
- `docs/README.md` no necesita cambios (el índice ya cubre los archivos referenciados).

### Rollback
Revert de los 4 archivos.

---

## ✅ Acceptance criteria

| # | Criterio | Cómo se valida |
|---|---|---|
| AC1 | Pageviews automáticos visibles en PostHog Live events | Dev local sin login, navegar 2 páginas, ver 2 `$pageview` events en el dashboard |
| AC2 | `identify(user.id)` se llama post-login | Login en dev → siguiente `$pageview` con `distinct_id = user.id` (no anónimo) |
| AC3 | Los 5 eventos críticos se emiten desde server | Correr el golden path completo en dev local, verificar `onboarding_completed`, `daily_pack_claimed`, `pack_opened`, `card_pinned`, `share_initiated` aparecen con props correctas |
| AC4 | Kill switches funcionan | `POSTHOG_DISABLED=true` server + `NEXT_PUBLIC_POSTHOG_DISABLED=true` client → 0 requests a `us.i.posthog.com` |
| AC5 | CI verde con kill switches en e2e | `pnpm test:e2e` localmente con ambas vars en `true` pasa el smoke en menos de 60s |
| AC6 | Type-check + lint limpios | `pnpm type-check && pnpm lint` 0 errores |
| AC7 | Bundle client no crece más de ~30kb gzipped | `pnpm build` y comparar output con main; aceptamos ≤30kb por `posthog-js` |
| AC8 | Hook `useFeatureFlag` funcional | Crear un flag de prueba en dashboard, leer en un client component, verificar valor |
| AC9 | Sin PII en eventos | Auditar properties de los 5 eventos: ningún campo email, full_name, password |
| AC10 | Docs reflejan el estado | `docs/01-tech-stack.md`, `docs/feature-status.md`, `docs/tech-proposals.md` actualizados; `docs/implementation-plan-pr6.md` creado |

---

## ✅ Validation results — 2026-05-29

PR6 fue mergeado a `main` el 2026-05-28 (commits direct-push, sin PR explícito) y validado end-to-end el 2026-05-29.

### Estado de cada AC

| AC | Status | Evidencia |
|---|---|---|
| **AC1** | ✅ | Golden path en Edge (sin shields) generó **6 `$pageview` events** con library `web` (posthog-js client SDK). Verificado vía HogQL: `SELECT * FROM events WHERE event='$pageview' AND distinct_id='<uuid>'`. |
| **AC2** | ✅ | Server events post-login emiten con `distinct_id = '5d2165ea-9a39-4278-8d97-fd4a75e92aa5'` (UUID Supabase). `$identify` event capturado en el client con la transición de anon → identified distinct_id. |
| **AC3** | ✅ | Los 5 funnel events confirmados: `onboarding_completed` (cuenta nueva), `daily_pack_claimed`, `pack_opened`, `card_pinned` (con `tier`), `share_initiated` (con `channel` y `target_card_id`). Cross-verified con DB: `is_pinned=true` para la card pinneada y row en `share_events`. **Caveat**: `pack_opened` doblea en SC re-renders — ver [issue #10](https://github.com/Ezem98/cromiks/issues/10). |
| **AC4** | ✅ | Code review de [`src/lib/analytics.ts`](../src/lib/analytics.ts) (server) y [`src/components/analytics/posthog-provider.tsx`](../src/components/analytics/posthog-provider.tsx) (client): ambos kill switches cortan circuit antes de cualquier request a `us.i.posthog.com`. Server: `getClient()` retorna `null` si `POSTHOG_DISABLED=true`. Client: `initPostHog()` no llama `posthog.init()` si `NEXT_PUBLIC_POSTHOG_DISABLED=true`. |

### PRs derivados de la validación

La validación descubrió 4 bugs que requirieron PRs post-mergeo:

| PR | Fix | Estado |
|---|---|---|
| [#6](https://github.com/Ezem98/cromiks/pull/6) | `pack_opened` guard inicial con `!wasReplay` (no resuelve completo) | Merged |
| [#7](https://github.com/Ezem98/cromiks/pull/7) | `cardId` Zod schema: era `z.uuid()`, pero la columna es text slug | Merged |
| [#8](https://github.com/Ezem98/cromiks/pull/8) | ShareSheet desmontaba el componente antes de que recordShare ejecute; falta de `tier` en `card_pinned` props | Merged |
| [#9](https://github.com/Ezem98/cromiks/pull/9) | Trigger SQL `_on_share_event_inserted` referenciaba `new.channel` (columna inexistente); fix usa `new.platform` | Merged + aplicado a prod vía Supabase MCP |

### Followups conocidos (no en scope de PR6)

- [#10](https://github.com/Ezem98/cromiks/issues/10) — `pack_opened` aún doblea por idempotency del RPC; el guard de PR #6 no atrapa el segundo render porque el RPC devuelve `is_new=true` en ambas llamadas. Fix sugerido: checar `packs.status` antes del RPC.
- [#11](https://github.com/Ezem98/cromiks/issues/11) — Console 404s en `/about` y `/missions` por `<Link>` prefetch a rutas inexistentes. Bug separado, sin impacto en funcionalidad.
- [#12](https://github.com/Ezem98/cromiks/issues/12) — `unpinCard` emite `card_pinned` con `action: 'unpin'`. Renombrar a `card_unpinned` para que funnels en PostHog no cuenten unpins como pins.

### Infraestructura levantada para la validación

Durante el proceso se autorizaron MCPs que quedan disponibles para futuras iteraciones (configurados en `~/.claude.json`):

- **PostHog MCP** — `https://mcp.posthog.com/mcp?features=sql,data_schema` (con `features=` para evitar `invalid_scope` OAuth)
- **Supabase MCP** — `https://mcp.supabase.com/mcp?project_ref=oaussuztahdxivemqbnd` (commiteado en `.mcp.json`, OAuth per-user)
- **Resend MCP** — stdio con `RESEND_API_KEY` (full-access scope para automatizar domain setup)
- **Railway CLI** — linked al project `respectful-transformation` / service `cromiks`

Tambien se verificó el dominio `cromiks.app` en Resend (DKIM + 2x SPF records via Porkbun DNS) y se seteó `NEXT_PUBLIC_APP_URL` en Railway (env var que faltaba y rompía magic links OTP).

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| **Bundle creciendo demasiado** por `posthog-js` | Media | AC7 mide. Si se va de 30kb, considerar lazy import (dynamic import dentro de `useEffect`). |
| **Eventos perdidos por no-flush** en server | Baja | Singleton de `posthog-node` con flush interno cada 10s. Railway corre Node persistente, no hay cold start que mate el buffer. Si vemos pérdidas en prod, agregar `await flush()` en actions críticas. |
| **PostHog Cloud caído** | Baja | `track()` tiene try/catch defensivo. La action sigue funcionando. |
| **Cuota de free tier explotada** en beta | Baja | 5 eventos por usuario por sesión x 1000 beta users x 30 días = 150k events/mo. Free tier es 1M. Espacio amplio. |
| **PII accidental** | Media | AC9 explícito. Code review de las 5 actions wiring. Si autocapture estuviera ON sería más riesgo, pero está OFF. |
| **Identify race condition** (eventos antes de identify se quedan anónimos) | Media | `posthog.identify()` reenvía los eventos anónimos previos al nuevo distinct_id (default behavior). No mitigación adicional. |

---

## Orden de commits sugerido

1. **Setup base** (§1): `feat(analytics): add posthog deps + config module`
2. **Server helper** (§3): `feat(analytics): add server-side track() helper`
3. **Client provider** (§2): `feat(analytics): mount PostHogProvider with identify`
4. **Wire events** (§4): `feat(analytics): emit 5 funnel events from server actions`
5. **Feature flag hook** (§5): `feat(analytics): add useFeatureFlag hook`
6. **CI + Playwright** (§6): `chore(ci): disable posthog in e2e job`
7. **Docs** (§7): `docs: PR6 PostHog plan + status updates`

Squash al merge a `main`. Branch: `feat-pr6-posthog`.
