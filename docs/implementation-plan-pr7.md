# 🛠️ Plan PR7 · Validación de env vars al boot (TP-11 · `@t3-oss/env-nextjs`)

> Snapshot: 2026-05-29.

---

## Context

Hoy las env vars se leen con `process.env.X` crudo y sin validación central. Si en Railway falta una var crítica, el síntoma aparece **en runtime con un error críptico** (o peor, en silencio): el caso real ya nos pasó en PR6 — faltaba `NEXT_PUBLIC_APP_URL` en Railway y rompía los magic links OTP sin que nada lo avisara hasta que un usuario no podía loguear (ver [`docs/implementation-plan-pr6.md`](./implementation-plan-pr6.md) §Validation results). [`docs/tech-proposals.md` §TP-11](./tech-proposals.md) propuso `@t3-oss/env-nextjs` para resolverlo: un único `src/env.ts` con schema Zod (ya usamos Zod en `defineAction`) que **falla el build** si falta o está vacía una var requerida, y que reemplaza `process.env.X` por un `env.X` **tipado**.

**Outcome esperado de PR7**:
- `src/env.ts` con `createEnv()`: split server / client / shared, validado con Zod.
- El `next build` (local, CI y Railway) **falla con un error claro** si falta una var requerida — antes de deployar.
- Todos los `process.env.X` de **config de la app** migrados a `env.X` tipado (autocompletado + narrowing, sin `!` ni guards manuales `if (!url) throw`).
- `RESEND_API_KEY` declarada como **guard de presencia** aunque Next no la lea (la consume Supabase Auth SMTP) — un Railway sin esa var ahora rompe el build en vez de romper los mails en silencio.
- Upstash **requerido en producción** (build de prod falla si falta), fail-open preservado en dev/preview.
- Kill switches y vars de tooling (Playwright, CI) **quedan como `process.env` crudo** — no son config requerida.
- Escape hatch `SKIP_ENV_VALIDATION=1` para lint/type-check y etapas de build sin secrets.

---

## 📊 Tabla resumen

| # | Item | Decisión | Esfuerzo (h) | Archivos clave |
|---|---|---|---|---|
| 1 | Setup (deps + `env.ts` skeleton) | `@t3-oss/env-nextjs` + `jiti` (devDep, para validar en `next.config`) | 0.5 | `package.json`, `src/env.ts` (nuevo) |
| 2 | Schema (server / client / shared) | Todas las vars **que Next lee** + `RESEND_API_KEY` como guard. R2/OAuth/`APP_NAME` fuera | 1 | `src/env.ts` |
| 3 | Validación en build + refine Upstash-en-prod | Import vía `jiti` en `next.config.ts` + `emptyStringAsUndefined` + `SKIP_ENV_VALIDATION` + refine prod | 0.5 | `next.config.ts`, `src/env.ts` |
| 4 | Migración de call sites a `env.X` | Migración **completa** en `src/` + config + scripts | 1 | `src/lib/supabase/*`, `src/lib/{ratelimit,analytics}.ts`, `src/lib/posthog/config.ts`, `src/features/auth/actions.ts`, `sentry.*.config.ts`, etc. |
| 5 | Vars que NO migran (kill switches + tooling) | Documentar por qué quedan crudas | 0.25 | — (comentarios en `env.ts`) |
| 6 | CI / build | Asegurar `RESEND_API_KEY` en build job o `SKIP_ENV_VALIDATION` en type-check/lint | 0.25 | `.github/workflows/ci.yml` |
| 7 | Docs | `.env.example` ordenado, tech-stack, TP-11 → done | 0.5 | `docs/01-tech-stack.md`, `docs/tech-proposals.md`, `.env.example` |
| **Total** | | | **~4 h** | |

| Env vars nuevas | Servicio | Dónde se setea |
|---|---|---|
| `SKIP_ENV_VALIDATION` (escape hatch, opt-in) | — | CI (type-check/lint job), Docker dep-install stage si aplica. Ausente en builds reales = validación ON |

> **No agregamos ninguna env var de negocio nueva.** PR7 solo formaliza/valida las que ya existen.

---

## 🧩 Diseño cruzado: alcance del schema y qué queda afuera

`@t3-oss/env-nextjs` valida **lo que el proceso Next lee**. El inventario real (grep de `process.env` en `src/` + config) dividió las vars en tres grupos, y eso define el scope:

**1. Vars que Next lee → entran al schema (tipadas + validadas):**
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (client), `SUPABASE_SECRET_KEY` (server).
- App: `NEXT_PUBLIC_APP_URL` (magic links — el incidente de PR6).
- Upstash: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- PostHog: `NEXT_PUBLIC_POSTHOG_KEY`.
- Railway (platform-injected): `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_GIT_COMMIT_SHA`, `NEXT_PUBLIC_RAILWAY_*`.

**2. Vars que Next NO lee pero declaramos como guard de presencia (decisión del usuario):**
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. La consume **Supabase Auth (SMTP, configurado en el dashboard)**, no el proceso Next — por eso ningún `process.env.RESEND_API_KEY` aparece en `src/`. Las declaramos igual como **server requeridas**: t3-oss valida *presencia*, no *correctitud* (no verifica que la key funcione), pero convierte "falta en Railway → mails rotos en silencio" en un **build rojo**. Es exactamente el dolor que motiva el PR.

**3. Vars que quedan AFUERA del schema (deliberadamente):**
- `R2_*` (5 vars): R2 todavía **no está wired** en `src/` (ver `next.config.ts:14` — `remotePatterns` comentado). Declararlas haría fallar el build por una feature inexistente.
- `GOOGLE_CLIENT_*`, `APPLE_*`: OAuth se configura en el **dashboard de Supabase**, no en código. Magic-link es el auth primario; que falten no debe romper el build.
- `NEXT_PUBLIC_APP_NAME`: no se lee en código.
- **Kill switches** (`POSTHOG_DISABLED`, `NEXT_PUBLIC_POSTHOG_DISABLED`, `SENTRY_DISABLED`, `NEXT_PUBLIC_SENTRY_DISABLED`, `RATELIMIT_DISABLED`): opt-in con semántica `!== 'true'` (ausente = habilitado, que es el default seguro). Meterlos en Zod suma coerción boolean + default + refactor de 3 helpers a cambio de cero seguridad. **Quedan en sus funciones helper** leyendo `process.env` crudo (decisión del usuario).
- **Tooling**: `PLAYWRIGHT_*`, `CI`, `NEXT_RUNTIME`, `SENTRY_AUTH_TOKEN`. Corren fuera del runtime de la app (test runner, webpack plugin de Sentry, introspección de runtime). Importar `env.ts` en `playwright.config.ts` arrastraría la validación de toda la app al harness de tests. Quedan crudas.

> Documentamos los grupos 2 y 3 como bloque de comentario en `env.ts` para que haya **un solo lugar** donde descubrir todas las vars del proyecto, incluso las que no se validan.

---

## 1️⃣ Setup

### Resumen ejecutivo
- **Objetivo**: instalar deps y crear el esqueleto de `src/env.ts`.
- **Outcome**: `import { env } from '@/env'` disponible (vacío todavía).

### Pasos

#### 1.1 Instalar dependencias
```bash
pnpm add @t3-oss/env-nextjs
pnpm add -D jiti
```
- `@t3-oss/env-nextjs` ~ wrapper liviano sobre Zod, sin runtime pesado.
- `jiti` (devDep): permite importar `src/env.ts` (TS, con alias) dentro de `next.config.ts` para validar **antes** de compilar. Patrón oficial de t3-oss.

#### 1.2 Crear `src/env.ts` (skeleton)
```ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {},
  client: {},
  shared: {},
  runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
```

> **Nota**: `env.ts` **no** lleva `import 'server-only'` — lo importan también client components. El split server/client lo maneja t3-oss internamente (acceder a una var server desde el cliente tira error en dev).

### Verificación
```bash
pnpm install && pnpm type-check
```

### Rollback
`pnpm remove @t3-oss/env-nextjs jiti` + borrar `src/env.ts`.

---

## 2️⃣ Schema (server / client / shared)

### Resumen ejecutivo
- **Objetivo**: declarar todas las vars en scope con sus reglas Zod.
- **Outcome**: `env.X` tipado para cada var; build/boot falla si falta una requerida o viene vacía (`emptyStringAsUndefined: true` trata `VAR=` como ausente).

### Pasos

#### 2.1 `src/env.ts` completo
```ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Validación central de env vars (TP-11). Falla el build si falta una requerida.
 *
 * --- Vars que NO viven acá (a propósito) ---
 * Guard externo (consumido por Supabase/servicios, no por Next): incluido abajo
 *   como server requerido → RESEND_API_KEY, RESEND_FROM_EMAIL.
 * Kill switches (opt-in `!== 'true'`, leídos crudos en sus helpers):
 *   POSTHOG_DISABLED, NEXT_PUBLIC_POSTHOG_DISABLED, SENTRY_DISABLED,
 *   NEXT_PUBLIC_SENTRY_DISABLED, RATELIMIT_DISABLED.
 * Tooling (fuera del runtime de la app, crudos): PLAYWRIGHT_*, CI, NEXT_RUNTIME,
 *   SENTRY_AUTH_TOKEN (webpack plugin).
 * No wired / dashboard-configured (fuera de scope): R2_*, GOOGLE_CLIENT_*,
 *   APPLE_*, NEXT_PUBLIC_APP_NAME.
 */
export const env = createEnv({
  server: {
    SUPABASE_SECRET_KEY: z.string().min(1),
    // Guard de presencia: lo consume Supabase Auth SMTP, no Next. Requerido
    // para que un Railway sin la var falle el build (mails OTP).
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email().default('hola@cromiks.com'),
    // Fail-open en dev/preview; el refine de abajo los exige en producción.
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Platform-injected por Railway (pueden faltar en local).
    RAILWAY_ENVIRONMENT_NAME: z.string().optional(),
    RAILWAY_GIT_COMMIT_SHA: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.url(),
    // PostHog: opcional (SDK no manda eventos si está vacía). Mantiene el
    // comportamiento actual (`?? ''` en config.ts).
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    // Inyectadas por next.config.ts desde las RAILWAY_* server-side.
    NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME: z.string().optional(),
    NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA: z.string().optional(),
  },
  shared: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  // Next inlinea NEXT_PUBLIC_* → hay que mapear cada var explícitamente.
  runtimeEnv: {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_GIT_COMMIT_SHA: process.env.RAILWAY_GIT_COMMIT_SHA,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME: process.env.NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME,
    NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA,
    NODE_ENV: process.env.NODE_ENV,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
```

> `z.url()` / `z.email()` son la API de Zod 4 (ya en uso en el repo — ver `z.uuid()` en las actions de PR6).

### Decisiones tomadas
- ✅ **`emptyStringAsUndefined: true`**: el `.env.example` tiene muchas `VAR=` vacías; sin esto, una var presente-pero-vacía pasaría la validación y rompería igual en runtime.
- ✅ **`RESEND_*` como server requerido (guard)**: decisión del usuario. Presencia, no correctitud.
- ✅ **Upstash `.optional()`** en el schema base; la exigencia en prod va por refine (§3).
- ✅ **`NEXT_PUBLIC_POSTHOG_KEY` opcional**: preserva el `?? ''` actual.

### Verificación
```bash
SKIP_ENV_VALIDATION=1 pnpm type-check   # tipa sin requerir vars
pnpm dev                                 # con .env.local completo, bootea OK
```
Probar el fail: renombrar temporalmente `SUPABASE_SECRET_KEY` en `.env.local` → `pnpm build` debe abortar con `❌ Invalid environment variables`.

### Rollback
Vaciar los objetos `server`/`client`/`shared`/`runtimeEnv`.

---

## 3️⃣ Validación en build + Upstash-requerido-en-prod

### Resumen ejecutivo
- **Objetivo**: que `next build` valide **antes** de compilar (falla rápida y clara) y que producción exija Upstash.
- **Outcome**: build rojo inmediato si falta una var requerida; prod nunca corre sin ratelimit.

### Pasos

#### 3.1 Importar `env.ts` en `next.config.ts` vía `jiti`
Arriba de todo en [`next.config.ts`](../next.config.ts):
```ts
import { createJiti } from 'jiti'

// Valida src/env.ts en build-time (antes de compilar). Si falta una var
// requerida, el build aborta acá con un error legible.
const jiti = createJiti(import.meta.url)
await jiti.import('./src/env')
```
> El grafo de imports de la app ya importaría `env` durante `next build` (validación implícita), pero el import explícito vía `jiti` falla **antes** de arrancar la compilación → feedback más rápido y a prueba de tree-shaking.

#### 3.2 Refine Upstash-en-prod (en `src/env.ts`, después de `createEnv`)
```ts
// Upstash es fail-open en dev/preview, pero en producción queremos garantía de
// que el ratelimit está activo. Gateamos por RAILWAY_ENVIRONMENT_NAME (no
// NODE_ENV) para que preview/staging no lo exijan.
if (
  !process.env.SKIP_ENV_VALIDATION &&
  env.RAILWAY_ENVIRONMENT_NAME === 'production' &&
  (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
) {
  throw new Error(
    '❌ UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN son requeridas en producción (ratelimit fail-open no permitido en prod).',
  )
}
```

### Decisiones tomadas
- ✅ **Gate por `RAILWAY_ENVIRONMENT_NAME === 'production'`**, no `NODE_ENV`: cualquier build optimizado tiene `NODE_ENV=production`, pero solo el deploy de prod en Railway tiene `RAILWAY_ENVIRONMENT_NAME=production`. Así preview/staging conservan el fail-open.
- ✅ **Refine imperativo** post-`createEnv` en vez de `createFinalSchema`: más legible para un único cross-field check, y respeta `SKIP_ENV_VALIDATION`.

### Verificación
- `RAILWAY_ENVIRONMENT_NAME=production pnpm build` sin Upstash vars → falla con el mensaje.
- Mismo build con las vars seteadas → pasa.

### Rollback
Quitar el import en `next.config.ts` y el bloque refine.

---

## 4️⃣ Migración de call sites a `env.X` (completa)

### Resumen ejecutivo
- **Objetivo**: reemplazar todos los `process.env.X` de **config de la app** por `env.X`, borrando guards manuales redundantes.
- **Outcome**: codebase consistente; el typing garantiza presencia (no más `!` ni `if (!url) throw`).

### Pattern de cambio
```ts
// ANTES — src/lib/supabase/server.ts
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Supabase env vars are not defined')
return createServerClient<Database>(url, key, { ... })

// DESPUÉS
import { env } from '@/env'
return createServerClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { ... },
)
// El guard `if (!url||!key) throw` se elimina: env.ts ya garantiza presencia.
```

### Call sites a migrar
| Archivo | Vars | Nota |
|---|---|---|
| [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts), [`client.ts`](../src/lib/supabase/client.ts), [`admin.ts`](../src/lib/supabase/admin.ts), [`src/proxy.ts`](../src/proxy.ts) | `NEXT_PUBLIC_SUPABASE_URL`, `..._PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | borrar guards `if (!x) throw` |
| [`src/lib/ratelimit.ts`](../src/lib/ratelimit.ts) | `UPSTASH_REDIS_REST_URL`, `..._TOKEN` | `RATELIMIT_DISABLED` **queda crudo** (kill switch) |
| [`src/lib/analytics.ts`](../src/lib/analytics.ts) | `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_GIT_COMMIT_SHA`, `NODE_ENV` | — |
| [`src/lib/posthog/config.ts`](../src/lib/posthog/config.ts) | `NEXT_PUBLIC_POSTHOG_KEY` | `*_DISABLED` **quedan crudos** |
| [`src/app/layout.tsx`](../src/app/layout.tsx), [`src/features/auth/actions.ts`](../src/features/auth/actions.ts) | `NEXT_PUBLIC_APP_URL` | 2 usos en auth |
| [`src/components/analytics/posthog-provider.tsx`](../src/components/analytics/posthog-provider.tsx) | `NEXT_PUBLIC_RAILWAY_*` | — |
| [`src/instrumentation-client.ts`](../src/instrumentation-client.ts) | `NEXT_PUBLIC_RAILWAY_*` | `NEXT_PUBLIC_SENTRY_DISABLED` **queda crudo** |
| [`sentry.server.config.ts`](../sentry.server.config.ts), [`sentry.edge.config.ts`](../sentry.edge.config.ts) | `RAILWAY_*`, `NODE_ENV` | `SENTRY_DISABLED` **queda crudo** |
| [`scripts/seed.ts`](../scripts/seed.ts), [`scripts/reset.ts`](../scripts/reset.ts), [`tests/e2e/global-setup.ts`](../tests/e2e/global-setup.ts) | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` | migrar a `env` (vars de app); `PLAYWRIGHT_*` **quedan crudos** |

> **`next.config.ts`** mantiene `process.env.RAILWAY_*` crudo en el bloque `env:` (es el *bridge* que crea las `NEXT_PUBLIC_RAILWAY_*` — no puede depender de `env.ts`, que aún no está validado en ese punto). Solo se le agrega el import `jiti` de §3.1.

### Decisiones tomadas
- ✅ **Migración completa** (decisión del usuario): PR autocontenido, deja el codebase sin `process.env` de config disperso.
- ✅ **Borrar los guards manuales** `if (!url) throw`: el schema los vuelve redundantes (menos código, single source of truth).
- ✅ **Edge/middleware (`proxy.ts`) seguro**: solo usa vars `NEXT_PUBLIC_*` (client-safe); `@t3-oss/env-nextjs` funciona en edge.

### Verificación
```bash
pnpm type-check && pnpm lint   # 0 errores; env.X tipado en todos los call sites
pnpm dev                       # golden path: signup → onboarding → home → open pack
```
Grep de control: no debe quedar ningún `process.env.NEXT_PUBLIC_SUPABASE`, `process.env.SUPABASE_SECRET`, `process.env.UPSTASH`, `process.env.RAILWAY` ni `process.env.NEXT_PUBLIC_APP_URL` fuera de `env.ts` y `next.config.ts`.

### Rollback
`git revert` del commit de migración (cambio mecánico, aislado).

---

## 5️⃣ Vars que NO migran (referencia)

Documentado como comentario en `env.ts` (§2.1) y acá para el reviewer. **No tocar** estos `process.env`:

- **Kill switches** (siguen en sus helpers, semántica `!== 'true'`): `POSTHOG_DISABLED` + `NEXT_PUBLIC_POSTHOG_DISABLED` ([`posthog/config.ts`](../src/lib/posthog/config.ts)), `SENTRY_DISABLED` ([`sentry.server.config.ts`](../sentry.server.config.ts) / [`edge`](../sentry.edge.config.ts)), `NEXT_PUBLIC_SENTRY_DISABLED` ([`instrumentation-client.ts`](../src/instrumentation-client.ts)), `RATELIMIT_DISABLED` ([`ratelimit.ts`](../src/lib/ratelimit.ts)).
- **Tooling / runtime introspection**: `PLAYWRIGHT_*`, `CI` ([`playwright.config.ts`](../playwright.config.ts)), `NEXT_RUNTIME` ([`instrumentation.ts`](../src/instrumentation.ts)), `SENTRY_AUTH_TOKEN` (lo lee el webpack plugin de Sentry, [`next.config.ts`](../next.config.ts)).

> Si en un PR futuro alguno de estos pasa a ser "config requerida", se promueve al schema entonces — no ahora.

---

## 6️⃣ CI / build

### Resumen ejecutivo
- **Objetivo**: que la validación no rompa los jobs que no necesitan secrets, y que el build job sí valide de verdad.
- **Outcome**: CI verde; el build valida con las vars reales.

### Pasos
#### 6.1 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- **Jobs de type-check / lint** (no compilan ni necesitan secrets): agregar `SKIP_ENV_VALIDATION: '1'` al `env:` del job. Evita que esos jobs requieran `RESEND_API_KEY` & co.
- **Job que corre `next build`** (si existe en el pipeline): asegurar que tenga seteadas las vars requeridas (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`) vía GitHub secrets — o, si el build de CI es solo smoke, también puede ir con `SKIP_ENV_VALIDATION`. **Decisión a confirmar al ejecutar**: revisar qué hace hoy el job e2e (usa `next build`? `next dev`?) y aplicar el mínimo.
- **Job e2e**: ya setea `SENTRY_DISABLED`/`RATELIMIT_DISABLED`/`POSTHOG_DISABLED`. Agregar `SKIP_ENV_VALIDATION: '1'` si levanta el server sin el set completo de secrets, o las vars reales si se quiere validar el path completo.

### Decisiones tomadas
- ✅ **`SKIP_ENV_VALIDATION` solo en jobs sin secrets** (type-check/lint): mantiene esos jobs rápidos y sin acoplarlos a Railway.
- ✅ **El build real (Railway) nunca skipea**: ahí está el valor del PR.

### Verificación
- Push del PR → CI verde. Logs del build job: si falta un secret requerido y no hay skip, debe fallar con el mensaje de t3-oss (test negativo opcional en una branch descartable).

### Rollback
Quitar las líneas `SKIP_ENV_VALIDATION` agregadas.

---

## 7️⃣ Docs

### Pasos
#### 7.1 [`.env.example`](../.env.example)
- Reordenar marcando **[requerida]** vs **[opcional]** vs **[kill switch]** vs **[no usada por Next — la consume X]**. Aclarar que `RESEND_*` las valida el build aunque las lea Supabase, y que `R2_*`/OAuth quedan fuera de la validación.

#### 7.2 [`docs/01-tech-stack.md`](./01-tech-stack.md)
- Sección "Variables de entorno": reemplazar el ejemplo por una referencia a `src/env.ts` como **fuente de verdad**, y notar que el build falla si falta una requerida. Corregir el ejemplo que aún dice `NEXT_PUBLIC_SUPABASE_ANON_KEY` (hoy es `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

#### 7.3 [`docs/tech-proposals.md`](./tech-proposals.md)
- TP-11 (línea 189): 🟡 → ✅ + nota "Implementado en PR7 — ver `docs/implementation-plan-pr7.md`".

### Verificación
`pnpm lint` no rompe en docs. `docs/README.md` no necesita cambios.

### Rollback
Revert de los archivos tocados.

---

## ✅ Acceptance criteria

| # | Criterio | Cómo se valida |
|---|---|---|
| AC1 | Build falla con mensaje claro si falta una var requerida | Quitar `SUPABASE_SECRET_KEY` de `.env.local` → `pnpm build` aborta con `❌ Invalid environment variables` listando la var |
| AC2 | `RESEND_API_KEY` ausente rompe el build | Quitar `RESEND_API_KEY` → `pnpm build` falla (guard de presencia) |
| AC3 | Var vacía se trata como ausente | `SUPABASE_SECRET_KEY=` (vacía) → build falla (`emptyStringAsUndefined`) |
| AC4 | Upstash requerido solo en prod | `RAILWAY_ENVIRONMENT_NAME=production pnpm build` sin Upstash → falla; sin esa env (dev) → pasa fail-open |
| AC5 | `env.X` tipado en todos los call sites migrados | `pnpm type-check` 0 errores; autocompletado de `env.` en el editor |
| AC6 | Kill switches y tooling siguen crudos y funcionando | `NEXT_PUBLIC_POSTHOG_DISABLED=true pnpm dev` → 0 requests a posthog; `RATELIMIT_DISABLED=true` → NOOP limiter |
| AC7 | `SKIP_ENV_VALIDATION=1` saltea la validación | `SKIP_ENV_VALIDATION=1 pnpm type-check` pasa sin ninguna var seteada |
| AC8 | Golden path intacto | `pnpm dev` + flow signup→onboarding→home→open pack→pin→share funciona igual que en main |
| AC9 | CI verde | Push del PR → type-check/lint/e2e pasan |
| AC10 | Docs actualizadas | `.env.example`, `01-tech-stack.md`, `tech-proposals.md` (TP-11 ✅) actualizados |

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| **CI rojo** porque un job necesitaba una var que ahora se valida | Media | `SKIP_ENV_VALIDATION=1` en jobs sin secrets (§6); revisar el job e2e antes de mergear |
| **Build de Railway falla** post-merge por una var faltante real | Media | Es el comportamiento buscado, pero **antes de mergear**: verificar en Railway que las 5 requeridas (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`) estén seteadas |
| **`jiti` import en `next.config` rompe** en alguna versión de Next 16 | Baja | Fallback: confiar en la validación implícita del grafo de imports (la app importa `env`), quitar el import explícito. AC1 sigue cubierto |
| **Var server accedida desde client** tira error tras migrar | Baja | Los client components migrados solo usan `NEXT_PUBLIC_*`; t3-oss lo enforcea en dev. `pnpm dev` + AC8 lo detecta |
| **`RESEND_*` declarada pero falsa sensación de seguridad** (valida presencia, no que la key sirva) | Media | Documentado explícito en `env.ts` y §🧩. Sigue siendo mejor que el silencio actual |
| **Empty-string default sorpresa** (`RESEND_FROM_EMAIL` cae al default) | Baja | Default explícito `hola@cromiks.com` documentado; coincide con `.env.example` |

---

## 🔧 Desviaciones durante la implementación (2026-05-29)

Cosas que cambiaron respecto del plan al ejecutar:

1. **Scripts/tests NO migrados a `env.ts`** (revertido del §4). Migrar `scripts/seed.ts`, `scripts/reset.ts` y `tests/e2e/global-setup.ts` resultó contraproducente:
   - `env.ts` lee `process.env` en el *import* (hoisted), pero `seed.ts` recién carga `.env.local` con `loadEnv()` en runtime → la validación tiraría antes de tener las vars.
   - `env.ts` exige `RESEND_API_KEY` (guard server): `pnpm seed` y los tests e2e pasarían a requerirla sin usarla.
   - Corren con `tsx`/Playwright fuera del bundler (no usan alias `@/`).
   → Quedan con `process.env` crudo + sus guards propios. Es tooling fuera del runtime de Next.

2. **`NEXT_PUBLIC_APP_URL` pasó a ser estrictamente requerida** y se quitó el fallback `?? 'http://localhost:3000'` de los consumers (`layout.tsx`, `auth/actions.ts`). El fallback era justamente lo que enmascaraba el incidente de PR6 (usaba localhost en silencio). Consecuencia en CI: hubo que **agregar `NEXT_PUBLIC_APP_URL`** a los jobs `build` (literal `https://cromiks.app`) y `e2e` (`http://localhost:3000`), además del `SKIP_ENV_VALIDATION`.

3. **`SKIP_ENV_VALIDATION` en los 3 jobs de CI** (no solo `check`): el `build` de CI es smoke-compile y el `e2e` corre `pnpm dev` (que evalúa `next.config.ts`). Ninguno setea `RESEND_API_KEY`. El gate real de validación es el build de deploy en **Railway** (tiene todas las vars). Documentado en `ci.yml`; si se quiere validar también en CI, agregar los secrets faltantes y borrar el skip del job `build`.

4. **jiti v2 invocado de forma síncrona** (`jiti('./src/env')`, sin top-level await) — evita fragilidad de TLA en `next.config.ts`. Verificado en build real (con y sin `SKIP_ENV_VALIDATION`).

5. **`RESEND_FROM_EMAIL` usa `z.email()`** (no `z.string().email()`) — API de Zod 4.

6. **Componentes/módulos client NO usan el `env` de t3-oss — leen `NEXT_PUBLIC_*` con `process.env`** (`src/lib/supabase/client.ts`, `src/components/analytics/posthog-provider.tsx`, `src/instrumentation-client.ts`, `src/lib/posthog/config.ts`). **Por qué**: el smoke e2e falló (reproducido localmente). En el cliente `skipValidation` es `false` (`SKIP_ENV_VALIDATION` no es `NEXT_PUBLIC_` → no se inlinea), así que el guard de `@t3-oss/env-nextjs` queda activo y tira `❌ Attempted to access a server-side environment variable on the client` **durante la hidratación** → rompe la interactividad (los botones no disparan server actions) → el golden path se queda en `/home`. El gate **se mantiene**: `env.ts` valida la sección client en build (jiti en `next.config`, `isServer=true`) y en server; el runtime client solo lee las `NEXT_PUBLIC_*` ya inlineadas por Next. **Regla**: `env` de `@/env` es para server/edge/Server Components; los client components leen `NEXT_PUBLIC_*` de `process.env`.

---

## Orden de commits sugerido

1. **Setup** (§1): `chore(env): add @t3-oss/env-nextjs + jiti`
2. **Schema + build validation** (§2, §3): `feat(env): add src/env.ts with zod schema + build-time validation`
3. **Migración** (§4): `refactor(env): replace process.env reads with typed env.*`
4. **CI** (§6): `chore(ci): skip env validation in type-check/lint jobs`
5. **Docs** (§7): `docs: PR7 env validation plan + status updates`

Squash al merge a `main`. Branch: `feat-pr7-env-validation`.
