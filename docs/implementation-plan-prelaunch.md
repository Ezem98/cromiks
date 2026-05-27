# 🚀 Plan de implementación pre-launch · Cromiks

> **Nota**: Este archivo, una vez aprobado, se copia tal cual a `docs/implementation-plan-prelaunch.md`. Pre-launch target: junio 2026. Snapshot del plan: 2026-05-26.

## Context

El MVP funcional de Cromiks está cerrado (auth + onboarding + home + pack opening 3D + álbum + misiones + sharing + perfil + badges). Antes del launch público de junio 2026 hay 4 gaps críticos del stack que hay que tapar — todos identificados ya en [`docs/tech-proposals.md`](./tech-proposals.md) y conectados con [`docs/improvements.md`](./improvements.md) (C-01, C-02, C-03) y [`docs/bugs.md`](./bugs.md) (B-03, B-04, B-08):

1. **Sin observabilidad**: `console.error` se pierde en Vercel logs. Si algo se rompe post-launch, no nos enteramos.
2. **Server actions sin validación uniforme**: 9 actions exportadas en `src/features/*/actions.ts` validan inputs de forma ad-hoc con `parseUuid()` en `src/lib/validation.ts`. No hay un wrapper que centralice schema + auth + ratelimit + telemetry.
3. **Sin anti-abuso**: endpoints calientes (`openPack`, `claimMission`, `recordShare`, `claimDailyPack`, `/api/og/card/[cardId]`) están abiertos a flooding. El OG endpoint con Satori es particularmente caro de renderizar.
4. **Sin tests E2E**: no podemos detectar regresiones en el golden path. Cualquier deploy puede romper el flow signup → primer sobre → primer cromo en álbum sin que nos enteremos hasta que un usuario lo reporte.

Este plan integra los 4 items con un **único helper `defineAction`** que aplica los 3 cross-cuts (Zod + Sentry + Ratelimit) en un solo punto, y un test E2E que verifica el camino más crítico.

---

## 📊 Tabla resumen

| Item | Esfuerzo (h) | Riesgo si no se hace | PR sugerido |
|---|---|---|---|
| **TP-01** Sentry | 3-4 | Bugs post-launch invisibles | PR 2 |
| **TP-10** Zod en actions | 4-5 | Inputs malformados → unknown errors | PR 1 (base) |
| **TP-08** Upstash Ratelimit | 3-4 | OG endpoint farmeable / spam de shares | PR 3 |
| **TP-06** Playwright smoke | 5-6 | Regresiones en golden path silenciosas | PR 4 |
| **CI workflow** | 1 | Lint/type/test no enforced | Incluido en PR 4 |
| **Total focused** | ~17-22 h (4 sesiones de 4h) | | |

| Env vars nuevas | Servicio | Dónde se setea |
|---|---|---|
| `SENTRY_DSN` (public) | Sentry | `.env.local` + Vercel + GitHub secret |
| `SENTRY_AUTH_TOKEN` (build) | Sentry | Vercel build env + GitHub secret |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Sentry | Vercel build env |
| `SENTRY_DISABLED` (kill switch) | Sentry | Vercel runtime env |
| `UPSTASH_REDIS_REST_URL` | Upstash | Vercel runtime + `.env.local` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Vercel runtime + `.env.local` |
| `RATELIMIT_DISABLED` (kill switch) | — | Vercel runtime env |
| `PLAYWRIGHT_TEST_USER_EMAIL` | — | GitHub secret + `.env.test` |
| `PLAYWRIGHT_TEST_USER_ID` | — | GitHub secret + `.env.test` |
| `PLAYWRIGHT_BASE_URL` | — | CI workflow |

---

## 🧩 Diseño cruzado: el helper `defineAction`

El corazón del plan. Un solo helper en [`src/lib/actions.ts`](../src/lib/actions.ts) (archivo **nuevo**) que envuelve cada server action con: parsing Zod → auth check (opcional) → rate-limit (opcional) → invocación del fn → Sentry instrumentation. Esto vive en un solo lugar y se aplica uniformemente a las 9 actions actuales.

### Firma propuesta

```ts
// src/lib/actions.ts
import 'server-only'
import * as Sentry from '@sentry/nextjs'
import type { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getRateLimiter, type RateLimitName } from '@/lib/ratelimit'

export type ActionResult<TOk> =
  | { ok: true; data: TOk }
  | { ok: false; code: string; message?: string }

export type ActionContext = {
  userId: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

type DefineActionOpts<TSchema extends z.ZodType, TOk> = {
  name: string                       // ej. 'openPack' — usado como Sentry tag + ratelimit key namespace
  schema: TSchema
  rateLimit?: RateLimitName | false  // 'openPack' | 'claimMission' | ... | false para opt-out
  auth?: 'required' | 'optional'     // default 'required'
  expectedErrors?: readonly string[] // codes que NO se reportan a Sentry (ej: 'not_owner')
  fn: (input: z.infer<TSchema>, ctx: ActionContext) => Promise<ActionResult<TOk>>
}

export function defineAction<TSchema extends z.ZodType, TOk>(
  opts: DefineActionOpts<TSchema, TOk>,
): (rawInput: unknown) => Promise<ActionResult<TOk>>
```

### Orden de verificaciones (importante)

```
1. parse Zod schema
   └─ fail → { ok: false, code: 'invalid_input' }     (no Sentry, es input error)
2. auth check (si required)
   └─ fail → { ok: false, code: 'unauthenticated' }   (no Sentry, esperado)
3. ratelimit.limit(`${name}:${userId}`)
   └─ fail → { ok: false, code: 'rate_limited' }      (no Sentry, esperado; sí log info)
4. Sentry.withServerActionInstrumentation(name, { ... }, async () => fn(input, ctx))
   └─ fn devuelve { ok: false, code: 'X' }
      └─ if code ∈ expectedErrors → return tal cual (no escalado)
      └─ else → Sentry.captureMessage con tag code, return
   └─ fn throw inesperado → Sentry.captureException + return { ok:false, code:'unknown' }
```

### Implementación esqueleto

```ts
export function defineAction<TSchema extends z.ZodType, TOk>(
  opts: DefineActionOpts<TSchema, TOk>,
) {
  return async (rawInput: unknown): Promise<ActionResult<TOk>> => {
    // 1. Validate input
    const parsed = opts.schema.safeParse(rawInput)
    if (!parsed.success) {
      return { ok: false, code: 'invalid_input', message: parsed.error.issues[0]?.message }
    }

    // 2. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && opts.auth !== 'optional') {
      return { ok: false, code: 'unauthenticated' }
    }

    // 3. Rate limit (only if user present and ratelimit configured)
    if (opts.rateLimit && user && process.env.RATELIMIT_DISABLED !== 'true') {
      const rl = getRateLimiter(opts.rateLimit)
      const { success } = await rl.limit(`${opts.name}:${user.id}`)
      if (!success) return { ok: false, code: 'rate_limited' }
    }

    // 4. Run with Sentry instrumentation
    return Sentry.withServerActionInstrumentation(
      opts.name,
      { recordResponse: true },
      async () => {
        try {
          const result = await opts.fn(parsed.data, {
            userId: user!.id,
            supabase,
          })
          if (!result.ok && !opts.expectedErrors?.includes(result.code)) {
            Sentry.captureMessage(`[action:${opts.name}] ${result.code}`, {
              level: 'warning',
              tags: { action: opts.name, code: result.code },
            })
          }
          return result
        } catch (err) {
          Sentry.captureException(err, { tags: { action: opts.name } })
          return { ok: false, code: 'unknown' }
        }
      },
    )
  }
}
```

### Ejemplo de uso (refactor de `openPack`)

```ts
// src/features/pack-opening/actions.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { defineAction } from '@/lib/actions'

const openPackSchema = z.object({
  packId: z.uuid(),
})

export const openPack = defineAction({
  name: 'openPack',
  schema: openPackSchema,
  rateLimit: 'openPack',
  expectedErrors: ['not_owner', 'already_opened', 'not_found'],
  fn: async ({ packId }, { userId, supabase }) => {
    const { data, error } = await supabase.rpc('open_pack', { p_pack_id: packId })
    if (error) {
      // P0001 + structured code path — ver C-02 en improvements.md
      const code = (error as { details?: string }).details ?? 'unknown'
      return { ok: false, code }
    }
    if (!data?.length) return { ok: false, code: 'empty_result' }
    revalidatePath('/')
    return { ok: true, data: { /* ... map data ... */ } }
  },
})
```

### Por qué este orden importa

- **Zod primero**: parsing es barato. Si el input es basura, no consumo cuota de auth ni ratelimit.
- **Auth antes que ratelimit**: el userId es la key del ratelimit. Sin user, no tiene sentido contar.
- **Ratelimit antes que la RPC**: la RPC es lo caro (DB round-trip). El ratelimit es Redis HTTP, mucho más barato.
- **Sentry envuelve solo la ejecución del fn**: los errores de validación/auth/ratelimit no son bugs, son business logic esperado. No los queremos en el dashboard de Sentry inflando el ruido.

---

## 1️⃣ TP-10 · Zod efectivo en todas las server actions

### Resumen ejecutivo
- **Objetivo**: Validar uniformemente los inputs de las 9 server actions con Zod + helper `defineAction`.
- **Outcome esperado**: Inputs malformados nunca tocan la DB; logs estructurados con `code`; baseline para que TP-01 y TP-08 cuelguen de un solo wrapper. Cierra B-03 ya cerrado a nivel patches sueltos, lo formaliza.
- **Esfuerzo**: ~4-5 horas (1 sesión).

### Pasos

#### 1.1 Crear el helper `defineAction`
- **Archivo nuevo**: `src/lib/actions.ts`
- **Contenido**: el esqueleto del bloque anterior, pero con los imports de Sentry y `getRateLimiter` **mockeados como no-op** en este paso (los habilita TP-01 y TP-08 después). Así desbloquea el resto sin orden estricto:

```ts
// Versión interim — Sentry y ratelimit se enchufan en TP-01 y TP-08
import 'server-only'
import type { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// TODO(TP-01): replace with real Sentry wrapper
const withInstrumentation = async <T,>(name: string, fn: () => Promise<T>) => fn()
// TODO(TP-08): replace with real ratelimit
const noopLimit = async () => ({ success: true })
```

- **Verificación**: `pnpm type-check` pasa y un import desde una action existente compila.

#### 1.2 Crear catálogo de error codes
- **Archivo nuevo**: `src/lib/errors.ts`
- Mapeo `code → copy ES` (cierra C-05 en improvements):

```ts
export const ERROR_COPY: Record<string, string> = {
  invalid_input: 'Revisá los datos e intentá de nuevo',
  unauthenticated: 'Iniciá sesión para continuar',
  rate_limited: 'Demasiados intentos. Esperá un momento',
  unknown: 'Algo salió mal. Intentá de nuevo',
  // pack
  not_owner: 'Este sobre no es tuyo',
  already_opened: 'Este sobre ya fue abierto',
  not_found: 'No encontramos ese sobre',
  // album
  not_owned: 'No tenés este cromo',
  no_extra_copies: 'No tenés copias extras',
  insufficient_copies: 'No alcanzan las copias',
  // missions
  mission_not_completed: 'La misión todavía no está completa',
  mission_not_found: 'No encontramos esa misión',
}

export function errorCopy(code: string): string {
  return ERROR_COPY[code] ?? ERROR_COPY.unknown
}
```

- **Verificación**: en `card-detail-dialog.tsx` reemplazar el switch hardcodeado por `toast.error(errorCopy(result.code))`.

#### 1.3 Migrar actions una por una al helper
Orden sugerido (de menos a más invasivo):
1. `src/features/sharing/actions.ts` — `recordShare` (1 action, schema chico)
2. `src/features/missions/actions.ts` — `claimMission`
3. `src/features/album/actions.ts` — `pinCard`, `unpinCard`, `dismantleCard`
4. `src/features/pack-opening/actions.ts` — `openPack`
5. `src/features/home/actions.ts` — `claimDailyPack`, `assignDailyMissions`
6. `src/features/onboarding/actions.ts` — `completeOnboarding`, `checkUsernameAvailable`

Por cada action:
- Definir `schema = z.object({ ... })` con `z.uuid()`, `z.enum([...])` etc.
- Listar `expectedErrors` con los codes mapeados desde el RPC.
- Wrappear con `defineAction({...})`.
- **Cliente**: actualizar el caller para usar `result.code` (ya estaba con esta shape post B-03).

**Convención de shape**: `ActionResult<TOk>` reemplaza el `{ ok: true } | { ok: false; error: string }` actual. Buscar cualquier `error:` y migrar a `code:`. Ver [convenciones](./02-architecture.md#4-pattern-de-actions).

**Snippet de schema típico**:

```ts
const dismantleSchema = z.object({
  cardId: z.uuid(),
  count: z.number().int().min(1).max(99).optional().default(1),
})
```

- **Verificación**:
  - `pnpm type-check` clean
  - Probar manualmente desde la UI: abrir sobre, pinear, dismantle. Probar inputs corruptos con devtools (`openPack({ packId: 'not-a-uuid' })`) → debe devolver `code: 'invalid_input'`.

#### 1.4 Documentar el patrón
- Editar [`docs/02-architecture.md`](./02-architecture.md) sección **4. Pattern de actions** para reflejar `defineAction` como el nuevo estándar.

### Decisiones tomadas
- ✅ Codes en inglés snake_case, copy ES en `src/lib/errors.ts`.
- ✅ `z.uuid()` (Zod 4) en vez de `z.string().uuid()`.
- ✅ Shape: `{ ok: true; data: T } | { ok: false; code: string; message?: string }`.

### Compatibilidad
- ✅ Zod 4.4.3 ya instalado.
- ✅ React 19 + Server Actions: el wrapper devuelve un async function — compatible con cualquier action que se pase como `action={fn}` a un form o se llame desde `useTransition`.
- ⚠️ Turbopack: ningún issue conocido con Zod 4.

### Rollback
- El helper es opt-in por action. Si una migración rompe algo, se revierte solo esa action al patrón anterior. No hay kill switch global porque es código puro, no servicio.

---

## 2️⃣ TP-01 · Sentry

### Resumen ejecutivo
- **Objetivo**: Error monitoring server + client + edge + RSC + Server Actions con source maps y release tracking.
- **Outcome esperado**: Bugs en producción visibles en dashboard; alertas cuando un release introduce regresiones; cobertura de los 9 server actions vía `defineAction`.
- **Esfuerzo**: ~3-4 horas (1 sesión).

### Pasos

#### 2.1 Instalar y correr el wizard

```bash
pnpm dlx @sentry/wizard@latest -i nextjs --signup
```

El wizard pide:
- Login (usar GitHub OAuth)
- Crear org `cromiks` (o reusar si ya existe)
- Crear proyecto `cromiks-web` con platform `Next.js`

**Archivos que crea el wizard automáticamente**:
- `instrumentation.ts` (raíz) — registra los hooks
- `instrumentation-client.ts` (raíz) — config cliente, opcionalmente
- `sentry.server.config.ts` (o equivalente para App Router)
- `sentry.edge.config.ts`
- `next.config.ts` — wrappea con `withSentryConfig`
- `.env.sentry-build-plugin` — token (este NO se commitea)

#### 2.2 Tunear las configs

**`sentry.server.config.ts`** y **`instrumentation-client.ts`** — sample rate conservador + kill switch:

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.SENTRY_DISABLED !== 'true',
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV ?? 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  beforeSend(event, hint) {
    // Filtrar errores esperados de negocio
    const expectedTags = new Set(['not_owner', 'already_opened', 'no_extra_copies', 'rate_limited'])
    const code = event.tags?.code
    if (typeof code === 'string' && expectedTags.has(code)) return null
    return event
  },
})
```

#### 2.3 Reemplazar el stub en `defineAction`

En `src/lib/actions.ts`, importar Sentry real:

```ts
import * as Sentry from '@sentry/nextjs'
// ... (usar Sentry.withServerActionInstrumentation y Sentry.captureException como en el diseño cruzado)
```

#### 2.4 Wrappear el route handler de OG image

`src/app/api/og/card/[cardId]/route.tsx` ya tiene try/catch (B-08 cerrado). Agregar `Sentry.captureException(err)` en el catch:

```ts
} catch (err) {
  Sentry.captureException(err, { tags: { route: 'og-card', cardId } })
  return new Response(/* fallback PNG */)
}
```

#### 2.5 Agregar `(app)/error.tsx` con report

Ya existe post B-05. Confirmar que llama a `Sentry.captureException` y muestra CTA "Reintentar":

```tsx
'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return ( /* UI con botón reset */ )
}
```

#### 2.6 Source maps en build
El wizard ya configura `withSentryConfig({ silent: false, org: ..., project: ... })`. Verificar que `SENTRY_AUTH_TOKEN` está seteado en Vercel build env, sino el upload falla silenciosamente.

#### 2.7 Endpoint de prueba (descartable)
- Crear `src/app/sentry-test/page.tsx` temporal con un botón que tira un error a propósito. Confirmar que aparece en el dashboard de Sentry. Borrar después.

### Decisiones tomadas
- ✅ `tracesSampleRate: 0.1` + `beforeSend` filtra business errors.
- ✅ Replays: **off** por ahora (bundle ~50kb + privacidad pre-launch).
- ✅ DSN nuevo en proyecto `cromiks-web`.

### Compatibilidad
- ✅ `@sentry/nextjs` v8+ soporta Next 16 + App Router + RSC + Turbopack.
- ✅ React 19 soportado.
- ⚠️ Wizard usa `withSentryConfig` — verificar que no rompa `next.config.ts` (revisar después del wizard que las opciones existentes se preserven).

### Verificación
- Endpoint `/sentry-test` dispara error → aparece en dashboard
- Forzar `result.code = 'unknown'` en una action → captureMessage aparece
- Forzar `result.code = 'not_owner'` → **no** aparece (beforeSend lo filtra)
- Source maps: en el dashboard de un error, ver código fuente legible, no minificado

### Rollback / kill switch
- `SENTRY_DISABLED=true` en Vercel env → init no inicializa, no hay overhead, no llegan eventos. Toma efecto al siguiente deploy.
- Si el wizard rompe algo en build: borrar `withSentryConfig` wrap en `next.config.ts` y los archivos `sentry.*.config.ts`. El helper `defineAction` queda usando el stub.

---

## 3️⃣ TP-08 · Upstash Ratelimit

### Resumen ejecutivo
- **Objetivo**: Anti-abuso en endpoints calientes con sliding window.
- **Outcome esperado**: el OG endpoint (Satori es caro) no es farmeable; spam de shares y opens limitado por user; free tier alcanza el MVP.
- **Esfuerzo**: ~3-4 horas (1 sesión).

### Pasos

#### 3.1 Crear cuenta Upstash + base Redis
- Sign up en upstash.com → crear DB Redis en region `sa-east-1` (São Paulo, misma que Supabase).
- Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a `.env.local` y Vercel.

#### 3.2 Instalar deps

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

#### 3.3 Crear el módulo de ratelimit
- **Archivo nuevo**: `src/lib/ratelimit.ts`

```ts
import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? Redis.fromEnv()
  : undefined

// Decisión: conservador por user_id
const LIMITS = {
  openPack:       { tokens: 10, window: '1 m' as const },
  claimMission:   { tokens: 20, window: '1 m' as const },
  recordShare:    { tokens: 30, window: '1 m' as const },
  claimDailyPack: { tokens: 5,  window: '1 m' as const },
  ogCard:         { tokens: 60, window: '1 m' as const }, // por IP
} satisfies Record<string, { tokens: number; window: `${number} ${'s'|'m'|'h'}` }>

export type RateLimitName = keyof typeof LIMITS

const limiters = new Map<RateLimitName, Ratelimit>()

export function getRateLimiter(name: RateLimitName): Ratelimit {
  if (!redis) {
    // Kill switch / dev sin Upstash → siempre permite
    return { limit: async () => ({ success: true }) } as unknown as Ratelimit
  }
  if (!limiters.has(name)) {
    const cfg = LIMITS[name]
    limiters.set(name, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
      analytics: true,
      prefix: `cromiks:rl:${name}`,
    }))
  }
  return limiters.get(name)!
}
```

#### 3.4 Mapear actions a sus limites
- `openPack` → `'openPack'`
- `claimMission` → `'claimMission'`
- `recordShare` → `'recordShare'`
- `claimDailyPack` → `'claimDailyPack'`
- El resto (`pinCard`, `unpinCard`, `dismantleCard`, `completeOnboarding`, `checkUsernameAvailable`, `assignDailyMissions`): **sin ratelimit** por ahora. Si después de launch aparece abuso, se agregan.

El wiring es solo cambiar el `rateLimit: 'openPack'` en cada `defineAction({...})`.

#### 3.5 Ratelimit en el OG endpoint
- Archivo: `src/app/api/og/card/[cardId]/route.tsx`
- Aplicar **por IP** (es un endpoint público sin user):

```ts
import { getRateLimiter } from '@/lib/ratelimit'
import { headers } from 'next/headers'

export async function GET(req: Request, ctx: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await ctx.params
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = getRateLimiter('ogCard')
  const { success } = await rl.limit(`og:${ip}`)
  if (!success) return new Response('Rate limited', { status: 429 })
  // ... resto del render Satori
}
```

#### 3.6 UX cuando se dispara ratelimit
- El cliente recibe `{ ok: false, code: 'rate_limited' }` → `toast.error(errorCopy('rate_limited'))` → "Demasiados intentos. Esperá un momento".
- No reintentar automáticamente.

### Decisiones tomadas
- ✅ Free tier Upstash (10k commands/day, alcanza largo para pre-launch beta).
- ✅ Ventanas conservadoras por user_id; OG por IP.
- ✅ Region `sa-east-1` para minimizar latencia (Supabase está en São Paulo).

### Compatibilidad
- ✅ `@upstash/ratelimit` es HTTP-based → funciona en Edge y RSC.
- ✅ Sin TCP, sin pool de conexiones.
- ⚠️ Atención: si el OG endpoint corre en `runtime = 'nodejs'` (es el caso actual), está OK; si en algún momento se mueve a Edge, el client de Upstash sigue funcionando.

### Verificación
- Hacer 6 calls a `claimDailyPack` seguidas en devtools → la 6ta devuelve `code: 'rate_limited'`.
- En dashboard Upstash > Analytics ver el chart del prefix `cromiks:rl:openPack`.
- Refrescar `/api/og/card/<id>` 61 veces en un minuto → la 61 da 429.

### Rollback / kill switch
- `RATELIMIT_DISABLED=true` en Vercel env: el check en `defineAction` se saltea (línea `if (opts.rateLimit && user && process.env.RATELIMIT_DISABLED !== 'true')`). Toma efecto al siguiente deploy.
- Para el OG endpoint, hay que agregar la misma guard explícita.
- En `lib/ratelimit.ts`, si Upstash está down y el `redis` falla, el `getRateLimiter` ya devuelve un noop limiter — fail-open.

---

## 4️⃣ TP-06 · Playwright E2E smoke

### Resumen ejecutivo
- **Objetivo**: 1 test crítico que cubra signup → home → abrir sobre diario → ver cromo nuevo en `/album`.
- **Outcome esperado**: regresiones del golden path detectadas en CI antes de merge. Base para sumar más tests post-launch.
- **Esfuerzo**: ~5-6 horas (1 sesión larga).

### Estrategia de auth (decidida)
**Inyectar session cookie via admin SDK**. Justificación:
- No necesitamos verificar que el OTP de Supabase + Resend funciona (eso es código de Supabase, no nuestro).
- Más rápido (~3s vs ~30s por test) y aislado.
- No requiere agregar password auth solo para tests.
- Cubre el golden path post-auth que es donde está toda la lógica de negocio.

Mecánica:
1. Antes del test, en un setup global, usar `supabase.auth.admin.generateLink({ type: 'magiclink', email: testEmail })` con la service role key.
2. Del link extraer el token, llamar `supabase.auth.verifyOtp({ type: 'magiclink', token, email })`, obtener `session.access_token` y `refresh_token`.
3. Inyectar como cookies en el browser context de Playwright (`context.addCookies([{ name: 'sb-<ref>-auth-token', value: ..., ... }])`).
4. El test arranca con la sesión activa.

### Pasos

#### 4.1 Instalar Playwright

```bash
pnpm add -D @playwright/test
pnpm dlx playwright install --with-deps chromium
```

#### 4.2 Crear `playwright.config.ts` (raíz)

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.CI ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    timeout: 60_000,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
```

#### 4.3 Crear el global setup
- **Archivo nuevo**: `tests/e2e/global-setup.ts`

```ts
import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

export default async function globalSetup(_: FullConfig) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )

  const email = process.env.PLAYWRIGHT_TEST_USER_EMAIL!
  // Crear user si no existe (idempotente)
  await supabase.auth.admin.createUser({ email, email_confirm: true })

  // Generar magic link y canjearlo por una session
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const token = new URL(linkData.properties.action_link).searchParams.get('token')
  const { data: verify } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkData.properties.hashed_token!,
  })

  // Persistir session en storageState
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  await ctx.addCookies([
    {
      name: `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`,
      value: JSON.stringify([
        verify.session!.access_token,
        verify.session!.refresh_token,
      ]),
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
  ])
  await ctx.storageState({ path: 'tests/.auth/user.json' })
  await browser.close()
}
```

> ⚠️ El nombre de la cookie de Supabase y su shape exacta dependen del SSR client — verificar inspeccionando devtools en una sesión real. Si cambió en v0.10, ajustar.

#### 4.4 Escribir el smoke test
- **Archivo nuevo**: `tests/e2e/smoke.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test.use({ storageState: 'tests/.auth/user.json' })

test('golden path: home → open daily pack → see new card in album', async ({ page }) => {
  // 1. Home con sobre disponible
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: /sobre del día/i })).toBeVisible()

  // 2. Abrir el sobre
  await page.getByRole('button', { name: /abrir sobre/i }).click()
  await expect(page).toHaveURL(/\/open\/[\w-]+/)

  // 3. Skip animación 3D (botón "Saltar")
  await page.getByRole('button', { name: /saltar/i }).click({ timeout: 15_000 })

  // 4. Llegar al summary y al álbum
  await page.getByRole('button', { name: /ver álbum|continuar/i }).click()
  await expect(page).toHaveURL(/\/album/)

  // 5. Verificar que hay al menos un cromo nuevo (badge "Nuevo" o equivalente)
  // Adjust selector to match the actual album-slot.tsx markup
  const slots = page.locator('[data-album-slot][data-owned="true"]')
  await expect(slots.first()).toBeVisible({ timeout: 10_000 })
})
```

#### 4.5 Test secundario (opcional, mismo PR): verificar ratelimit
Pequeño test que dispara `claimDailyPack` 6 veces seguidas vía fetch y verifica que el 6to responde con `rate_limited`. Confirma integration cruzada.

```ts
test('rate limit dispara después de 5 daily-pack claims/min', async ({ request, page }) => {
  await page.goto('/home') // hidrata cookies en el request context
  const results = []
  for (let i = 0; i < 6; i++) {
    // Llamar la action server vía fetch directo no es trivial; mejor disparar desde page.evaluate
  }
  // Skip si es complejo; documentar como TODO post-launch
})
```

Si este test se complica, dejarlo afuera del primer PR — el de golden path es el irrenunciable.

#### 4.6 Excludes en Biome
- Editar `biome.json` para excluir `tests/`, `playwright-report/`, `tests/.auth/`:

```jsonc
{
  "files": {
    "ignore": ["tests/.auth/**", "playwright-report/**", "test-results/**"]
  }
}
```

#### 4.7 Scripts en `package.json`

```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

#### 4.8 `.gitignore`

```
/playwright-report
/test-results
/tests/.auth
```

### Decisiones tomadas
- ✅ Auth: admin SDK + cookie injection en `global-setup.ts`.
- ✅ Supabase: usar el proyecto **real** pero con un user dedicado `e2e@cromiks.app`. Pre-launch el blast radius es bajo. Post-launch evaluar mover a un proyecto staging.
- ✅ `baseURL`: localhost en local, preview de Vercel en CI (set via env var en el workflow).

### Compatibilidad
- ✅ Playwright es runtime-agnostic.
- ✅ Next 16 + Turbopack: `pnpm dev` se levanta normal, Playwright navega.
- ⚠️ Supabase SSR cookie naming — verificar shape exacta antes de inyectar.
- ⚠️ Si el flow del pack opening hace un fetch al modelo GLTF de >5MB, considerar `timeout: 30_000` en `webServer`.

### Verificación
- `pnpm test:e2e` local pasa.
- En CI, el reporter de GitHub muestra check verde.
- Borrar el storage state forzadamente y volver a correr → setup regenera la session.

### Rollback / kill switch
- No aplica — los tests no afectan producción. Si rompen, se skipean con `test.skip(...)` o se quita del workflow temporalmente.

---

## 5️⃣ CI · GitHub Actions

### Resumen ejecutivo
- **Objetivo**: workflow PR check que corre type-check, lint, build, E2E.
- **Esfuerzo**: ~1 hora.

### Workflow

- **Archivo nuevo**: `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check
      - run: pnpm lint

  build:
    runs-on: ubuntu-latest
    needs: check
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
      SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
      SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  e2e:
    runs-on: ubuntu-latest
    needs: check
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}
      PLAYWRIGHT_TEST_USER_EMAIL: ${{ secrets.PLAYWRIGHT_TEST_USER_EMAIL }}
      RATELIMIT_DISABLED: 'true'
      SENTRY_DISABLED: 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx playwright install --with-deps chromium
      - run: pnpm dev &
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Notas
- Sentry y Ratelimit **disabled** en el job E2E para que el test sea determinístico (sin contar requests reales).
- Secrets a crear en GitHub repo settings: ver tabla de env vars al inicio.
- El job `build` valida que la integración de Sentry no rompe el build con source maps.

---

## 🔄 Orden de PRs sugerido

**Recomendado: 4 PRs separados**, en este orden. Justificación: cada uno es atómico y reviewable, y un rollback no arrastra al resto.

| # | PR | Depende de | Por qué este orden |
|---|---|---|---|
| 1 | **TP-10 (Zod + defineAction)** | — | Es la base. El helper tiene stubs de Sentry/Ratelimit. Las actions migradas no cambian comportamiento. Reviewable solo. |
| 2 | **TP-01 (Sentry)** | PR 1 | Reemplaza el stub de Sentry en `defineAction` por la implementación real. Wizard + configs. |
| 3 | **TP-08 (Upstash Ratelimit)** | PR 1 | Reemplaza el stub de ratelimit. Agrega `rateLimit:` a las 4 actions calientes + al OG endpoint. |
| 4 | **TP-06 (Playwright + CI)** | PR 1, 2, 3 | Test valida que las 3 cosas anteriores no rompieron el golden path. Incluye CI. |

**Por qué NO un PR monolítico**: 4 cambios cross-cutting en un solo PR es review imposible. Si uno falla en producción (ej. Sentry rompe el build), revertir todo te baja también las validaciones de Zod que son la mejora más importante.

---

## 📅 Timeline realista (1 dev solo, sesiones de 3-4h)

| Día | Sesión | Trabajo | Output |
|---|---|---|---|
| **Día 1** (lun) | AM 3-4h | PR 1.1-1.2: crear `defineAction` stub + `errors.ts` + tipos | Helper compila, errors mapeados |
| **Día 1** (lun) | PM 3-4h | PR 1.3: migrar `sharing`, `missions`, `album` actions | 5 actions con Zod, callers actualizados |
| **Día 2** (mar) | AM 3-4h | PR 1.3 cont: migrar `pack-opening`, `home`, `onboarding` + docs/02-architecture.md | PR 1 listo para review, mergeado |
| **Día 2** (mar) | PM 2h | PR 2: wizard Sentry + configs + reemplazar stub | PR 2 listo, mergeado el mismo día |
| **Día 3** (mié) | AM 3-4h | PR 3: Upstash setup + `lib/ratelimit.ts` + wire en actions + OG endpoint | PR 3 listo, mergeado |
| **Día 3** (mié) | PM 1-2h | Verificaciones manuales end-to-end de PR 1+2+3 en preview Vercel | Confirmación que stack integrado anda |
| **Día 4** (jue) | AM 3-4h | PR 4: Playwright setup + global-setup + smoke test | Test local pasa |
| **Día 4** (jue) | PM 2-3h | PR 4 cont: CI workflow + secrets en GitHub + run completo en PR | CI verde, PR 4 mergeado |
| **Día 5** (vie) | Buffer | Cleanup, ajustes de copy ES en `errors.ts`, screenshots para handoff | Listo para launch |

**Total**: ~20 horas focused, en 4 días + 1 buffer.

---

## ✅ Verificación end-to-end (acceptance criteria)

Una vez los 4 PRs mergeados:

- [ ] Cualquier action llamada con input malformado devuelve `code: 'invalid_input'` y se ve toast ES.
- [ ] Forzar un throw en una action → aparece en dashboard de Sentry con tag `action: <name>`.
- [ ] Forzar `code: 'not_owner'` → **no** aparece en Sentry (filtered).
- [ ] Llamar `claimDailyPack` 6 veces en 1 min → la 6ta devuelve `code: 'rate_limited'`.
- [ ] Hit a `/api/og/card/<id>` 61 veces/min desde la misma IP → 429.
- [ ] `SENTRY_DISABLED=true` → init no se ejecuta, no hay eventos.
- [ ] `RATELIMIT_DISABLED=true` → todas las llamadas pasan.
- [ ] CI corre type-check + lint + build + E2E en cada PR.
- [ ] El smoke test de Playwright pasa local y en CI con artifacts si falla.
- [ ] Source maps de Sentry funcionan en un error real (ver stack legible).

---

## 🔗 Referencias cruzadas

- [`01-tech-stack.md`](./01-tech-stack.md) — Stack base (no se modifica, se suma)
- [`02-architecture.md`](./02-architecture.md) — A actualizar sección 4 (pattern de actions) tras PR 1
- [`tech-proposals.md`](./tech-proposals.md) — TP-01, TP-06, TP-08, TP-10 (este plan los ejecuta)
- [`improvements.md`](./improvements.md) — C-01, C-02, C-03, C-05 (cerrados o avanzados por este plan)
- [`bugs.md`](./bugs.md) — B-03, B-04, B-08 (formalizados con `defineAction`)
- [`05-sql-functions.md`](./05-sql-functions.md) — A documentar contrato P0001 + codes (C-02, fuera de scope de este plan)

---

## 🚫 Fuera de scope (deliberadamente)

- **PostHog / analytics**: TP-03, post-launch.
- **react-email**: TP-19, post-launch.
- **Bundle analyzer**: TP-32, post-launch.
- **C-02 migrar RPCs a `errcode = 'P0001'`**: separar en un sprint dedicado. El helper actual maneja codes vía `error.message` o `error.details`; la migración SQL es independiente.
- **C-04 `strict: true`**: ya está en `tsconfig.json` según la exploración. Validar con `pnpm type-check` y matar los `as Tier` restantes en otro PR.
- **Más tests E2E**: solo 1 smoke en este sprint. Post-launch sumar onboarding flow, sharing flow, mission claim.

