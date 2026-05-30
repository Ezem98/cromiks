# 🛠️ Plan PR8 · Better Stack (Uptime + Logs) — TP-04

> Snapshot: 2026-05-29.

---

## Context

Hoy tenemos **Sentry** (errores) y **PostHog** (product analytics), pero falta lo
operativo: no sabemos si el sitio está **caído** hasta que un usuario se queja, y
los logs del proceso Next viven solo en el dashboard de Railway (retención corta,
sin búsqueda decente, sin alertas). [`docs/tech-proposals.md` §TP-04](./tech-proposals.md)
identificó **Better Stack** (ex Better Uptime + Logtail) como la opción: uptime
monitoring + log aggregation + status page, con free tier decente y, sobre todo,
**casi sin código** — Railway tiene log drains nativos y Better Stack expone un
endpoint de ingesta; el uptime monitor es config de dashboard.

El incidente de PR6 (faltaba `NEXT_PUBLIC_APP_URL` en Railway y los magic links
OTP se rompían sin que nada avisara — ver [`docs/implementation-plan-pr6.md`](./implementation-plan-pr6.md)
§Validation results) es exactamente la clase de cosa que un uptime monitor sobre
un endpoint de salud real hubiera atrapado en minutos. PR7 (env-validation, TP-11)
ataca la causa raíz en build-time; PR8 agrega la **red de seguridad en runtime**.

**Outcome esperado de PR8**:
- Endpoint `GET /api/health` (route handler nuevo — hoy no existe `src/app/api/`)
  que devuelve **200 + JSON** con un ping barato a Supabase, **503** si la DB no
  responde. Es el target del uptime monitor (mejor señal que la landing 3D).
- **Log drain nativo de Railway → Better Stack** configurado en el dashboard de
  Railway (sin código): todo lo que la app escribe a stdout/stderr queda
  buscable + retenido + alertable en Better Stack.
- **Uptime monitor** en Better Stack apuntando a `https://cromiks.app/api/health`,
  con alertas por email (y Slack si está el canal), chequeo cada 1–3 min.
- **Status page privada/interna** (solo equipo) — beta cerrado, se hace pública en
  el launch. Mapea el monitor de uptime.
- **Cero env vars nuevas en el runtime de la app**: el token del drain vive en la
  config del drain de Railway (platform-side), no en el bundle ni en `src/env.ts`.

> **Numeración**: env-validation (TP-11) ocupa `implementation-plan-pr7.md` +
> `implementation-plan-pr7-followups.md` y la rama `feat-pr7-env-validation`. Este
> plan es **PR8** (rama `feat-pr8-better-stack`).

---

## 📊 Tabla resumen

| # | Item | Decisión | Esfuerzo (h) | Archivos clave |
|---|---|---|---|---|
| 1 | Health endpoint `/api/health` | Route handler nuevo, Node runtime, `force-dynamic` + `no-store`, ping a `cards` con `head:true` (admin client) y timeout 2s; 200/503 | 1 | `src/app/api/health/route.ts` (nuevo) |
| 2 | Log drain nativo Railway → Better Stack | Config en dashboard de Railway (HTTP/syslog), **sin código**. Source "Logs" en Better Stack | 0.5 | — (Railway dashboard + Better Stack) |
| 3 | Uptime monitor | Better Stack monitor → `https://cromiks.app/api/health`, intervalo 1–3 min, espera HTTP 200 + `"status":"ok"`, alertas email/Slack | 0.25 | — (Better Stack dashboard) |
| 4 | Status page privada | Better Stack status page protegida (interna), mapea el monitor de uptime | 0.25 | — (Better Stack dashboard) |
| 5 | E2E smoke del health endpoint | Test Playwright: `GET /api/health` → 200 + `status: 'ok'` | 0.25 | `tests/e2e/health.spec.ts` (nuevo) o assert en el smoke existente |
| 6 | Docs | tech-stack, feature-status, TP-04 → done, roadmap "Better Uptime" → done | 0.5 | `docs/01-tech-stack.md`, `docs/feature-status.md`, `docs/tech-proposals.md`, `docs/roadmap.md` |
| **Total** | | | **~2.75 h** | |

| Env vars nuevas | Servicio | Dónde se setea |
|---|---|---|
| **(ninguna en el runtime de la app)** | — | — |
| Token de ingesta del drain | Better Stack | **Config del log drain en Railway** (platform-side), NO en `src/env.ts` ni en el bundle |

> **No tocamos `src/env.ts`.** Better Stack uptime + status page son 100% dashboard.
> El log drain es config de Railway. El único artefacto de código es el route
> handler, que reusa `env.*` ya existentes (`RAILWAY_*`, `SUPABASE_*`). Esto es
> consistente con TP-04 ("integración sin código en gran parte").

---

## 🧩 Diseño cruzado: por qué casi todo es dashboard y el único código es `/api/health`

Decisión: PR8 mete **un solo archivo de código** (`src/app/api/health/route.ts`).
Todo lo demás (drain, monitor, status page, alertas) es configuración en los
dashboards de Railway y Better Stack.

Razones:
- **TP-04 es deliberadamente low-code**: Railway ya empuja stdout/stderr a un log
  drain nativo; Better Stack ya expone ingesta HTTP/syslog. Meter un SDK de
  logging (pino + transport) o un sidecar Vector sería trabajo y bundle para algo
  que el platform resuelve gratis. Lo descartamos para el MVP (ver §2, alternativa).
- **Sin SDK de cliente = sin bundle, sin kill switch nuevo**: a diferencia de
  PostHog (PR6) o Sentry, Better Stack no corre nada en el browser ni en el server
  de la app. No hay `BETTERSTACK_DISABLED` que mantener. Si querés "apagarlo",
  desactivás el monitor/drain en el dashboard.
- **El endpoint de salud merece código propio**: monitorear `/` (landing) daría
  falsos OK — un 200 ahí solo dice "Next responde", no que Supabase esté vivo, y
  renderiza la marketing 3D completa en cada chequeo. Un `/api/health` que pinguea
  la DB es la señal correcta y es barato.
- **Reusa el patrón del repo**: el route handler sigue el estilo de
  [`src/app/auth/callback/route.ts`](../src/app/auth/callback/route.ts) (NextResponse)
  y lee config vía `env` (validado en PR7), no `process.env` crudo.

---

## 1️⃣ Health endpoint `/api/health`

### Resumen ejecutivo
- **Objetivo**: route handler liviano que reporta salud real (proceso vivo **y**
  DB alcanzable), apto para que Better Stack lo pingee cada 1–3 min.
- **Outcome**: `GET /api/health` → `200 {"status":"ok",...}` si Supabase responde,
  `503 {"status":"unhealthy",...}` si no. Nunca tira (try/catch + timeout).

### Pasos

#### 1.1 Crear `src/app/api/health/route.ts`

```ts
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { env } from '@/env'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Health check para el uptime monitor de Better Stack (TP-04 / PR8).
 *
 * Liveness + readiness en un solo hit:
 *  - Si este handler responde, el proceso Next está vivo (liveness).
 *  - El ping a Supabase valida que la dependencia crítica está sana (readiness).
 *
 * force-dynamic + no-store: NUNCA cachear — cada hit refleja el estado real.
 * runtime nodejs: usamos el admin client (SUPABASE_SECRET_KEY), no Edge.
 *
 * No hay middleware en el repo, así que esta ruta es pública (no requiere sesión).
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DB_TIMEOUT_MS = 2_000

async function pingDb(): Promise<'ok' | 'down'> {
  try {
    const supabase = createAdminClient()
    // head:true + count → no trae rows, solo valida que la conexión y el query
    // plan corran contra una tabla estable del catálogo. Barato.
    const query = supabase.from('cards').select('*', { head: true, count: 'exact' })
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('db_timeout')), DB_TIMEOUT_MS),
    )
    const { error } = (await Promise.race([query, timeout])) as { error: unknown }
    return error ? 'down' : 'ok'
  } catch {
    // Timeout, red caída, o cualquier throw → la DB no está sana para nosotros.
    return 'down'
  }
}

export async function GET() {
  const db = await pingDb()
  const healthy = db === 'ok'

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'unhealthy',
      checks: { db },
      environment: env.RAILWAY_ENVIRONMENT_NAME ?? env.NODE_ENV,
      release: env.RAILWAY_GIT_COMMIT_SHA ?? null,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
```

### Decisiones tomadas
- ✅ **Endpoint nuevo `/api/health`, no monitorear `/`** (decisión del usuario): un
  200 en la landing no garantiza que la app esté sana y renderiza 3D pesado en cada
  chequeo. El health endpoint da señal real y barata.
- ✅ **Ping a Supabase con `head:true` sobre `cards`**: tabla de catálogo estable y
  chica. `head:true` no transfiere rows. Vía **admin client** para no depender de
  RLS ni de una sesión.
- ✅ **503 cuando la DB no responde** (no 200 "degraded"): queremos que un outage
  real de Supabase **dispare la alerta** del uptime monitor. Trade-off asumido: un
  blip transitorio de Supabase puede paginar — aceptable, es justo lo que un uptime
  monitor debe atrapar. Si genera ruido, subimos el `DB_TIMEOUT_MS` o el umbral de
  reintentos del monitor (config dashboard, sin tocar código).
- ✅ **timeout 2s + try/catch**: el handler nunca cuelga ni tira. Si Supabase tarda,
  devolvemos `down` rápido en vez de dejar al monitor esperando.
- ✅ **`force-dynamic` + `no-store` + `runtime nodejs`**: sin caché (cada hit es
  real) y con acceso al secret de Supabase.
- ✅ **Sin rate limit ni Sentry**: es un route handler, no un `defineAction`, así que
  no pasa por el limiter; y como no tira, no contamina Sentry. Better Stack lo
  pegará seguido (cada 1–3 min) — está previsto.

### Verificación
```bash
pnpm dev
# en otra terminal:
curl -i http://localhost:3000/api/health
# → HTTP/1.1 200 OK, body {"status":"ok","checks":{"db":"ok"},...}
```
- Simular DB caída: setear `SUPABASE_SECRET_KEY` a un valor inválido en `.env.local`
  → `curl` debe devolver **503** con `"checks":{"db":"down"}`.
- Confirmar header `Cache-Control: no-store` en la respuesta.

### Rollback
Borrar `src/app/api/health/route.ts`. Nada más lo importa. (Recordá pausar el
monitor en Better Stack antes, o alertará 404.)

---

## 2️⃣ Log drain nativo Railway → Better Stack

### Resumen ejecutivo
- **Objetivo**: que todo lo que la app escribe a stdout/stderr (incluidos los
  `console.*` actuales y los logs de Next/Sentry) quede en Better Stack: buscable,
  retenido y alertable.
- **Outcome**: un "Source" de logs en Better Stack recibiendo el stream de Railway.
  **Sin código.**

### Pasos (dashboard — documentar, no commitear)

1. **Better Stack** → *Logs* → **Connect source** → tipo **Railway** (o HTTP/syslog
   genérico si Railway no aparece como preset). Guardar el **ingesting host/URL** y
   el **source token**.
2. **Railway** → proyecto `respectful-transformation` → servicio `cromiks` →
   *Settings* → **Log Drains** → **Add drain**:
   - Tipo: **HTTP** (o syslog, según lo que Better Stack indique para el source).
   - URL/host: el endpoint de ingesta de Better Stack.
   - Header de auth / token: el source token.
3. Guardar. Railway empieza a empujar logs del servicio al drain (también vía
   `railway` CLI: `railway logs` para ver el stream local; el drain se gestiona en
   el dashboard).
4. Disparar tráfico (abrir el sitio, correr el golden path) y confirmar que los logs
   llegan a Better Stack en *Live tail*.

> **Estructura de logs**: hoy logueamos con `console.*` plano (10 usos en 8 archivos
> — p.ej. [`src/app/auth/callback/route.ts:26`](../src/app/auth/callback/route.ts#L26),
> [`src/lib/analytics.ts`](../src/lib/analytics.ts)). Better Stack parsea texto
> plano OK. Estructurar (JSON con `level`/`context`) queda como **followup opcional**
> post-PR8, no es bloqueante.

### Decisiones tomadas
- ✅ **Drain nativo de Railway, no Vector** (decisión del usuario): es el camino
  sin-código que describe TP-04, ~30 min, suficiente para MVP. Vector (transformar/
  filtrar/rutear) es overkill pre-launch; si más adelante necesitamos parsing o
  sampling server-side, se evalúa.
- ✅ **No tocamos `console.*` en este PR**: el drain captura lo que ya existe.
  Estructurar logs es mejora separada (no bloquea uptime + agregación).
- ✅ **Token del drain vive en Railway, no en `src/env.ts`**: la app no lee ese
  token; lo usa la plataforma para empujar el stream. No es env var de runtime.

### Verificación
- *Live tail* en Better Stack muestra entradas mientras navegás el sitio en prod.
- Un `console.error` real (p.ej. forzar un `invalid_code` en `/auth/callback`)
  aparece en Better Stack con el texto correcto.

### Rollback
Borrar el drain en Railway *Settings → Log Drains* y archivar el source en Better
Stack. La app no cambia.

---

## 3️⃣ Uptime monitor (Better Stack)

### Resumen ejecutivo
- **Objetivo**: monitor que pega `/api/health` y alerta cuando cae.
- **Outcome**: monitor verde en Better Stack + alerta configurada.

### Pasos (dashboard)

1. **Better Stack** → *Monitors* → **Create monitor**:
   - URL: `https://cromiks.app/api/health`.
   - Tipo: **HTTP(S)**, método **GET**.
   - Espera: **status 200** y (opcional) **body contiene** `"status":"ok"` — así un
     503 con `"unhealthy"` (DB down) dispara incidente aunque el server responda.
   - Intervalo: **1–3 min** (el free tier suele permitir 3 min; subir a 1 min si el
     plan lo permite).
   - Regiones: al menos una US/SA (cercana a Railway/Supabase).
2. **Alert policy**: email del equipo. Si está conectado el workspace de Slack,
   sumar el canal de alertas (Better Stack tiene integración Slack nativa).
3. Confirmar primer chequeo verde.

### Decisiones tomadas
- ✅ **Target `/api/health`** (§1), no `/`.
- ✅ **Validar body `"status":"ok"`**, no solo el código: redundante con el 503, pero
  barato y atrapa un futuro endpoint que devuelva 200 con `unhealthy` por error.
- ✅ **Intervalo según free tier**: empezar conservador (3 min); apretar a 1 min si
  el plan alcanza. Beta cerrado no necesita sub-minuto.

### Verificación
- Pausar momentáneamente el servicio en Railway (o apuntar el monitor a una URL que
  devuelva 503 de prueba) → Better Stack marca el incidente y manda la alerta.
- Reanudar → el monitor vuelve a verde y cierra el incidente.

### Rollback
Pausar/eliminar el monitor en Better Stack.

---

## 4️⃣ Status page privada/interna

### Resumen ejecutivo
- **Objetivo**: una status page que consuma el monitor de uptime, **no pública**
  todavía (beta cerrado).
- **Outcome**: status page protegida, visible solo para el equipo.

### Pasos (dashboard)

1. **Better Stack** → *Status pages* → **Create status page**.
2. Visibilidad: **password-protected** / acceso restringido (NO indexable, NO
   pública). Sin dominio público todavía (reservar `status.cromiks.app` para el
   launch).
3. Agregar el monitor de `/api/health` como recurso ("API / App").

### Decisiones tomadas
- ✅ **Privada pre-launch** (decisión del usuario): no hay audiencia pública en beta
  cerrado, y una status page abierta expone incidentes y que el producto no está
  live. Se hace pública en el launch (followup: apuntar `status.cromiks.app` y
  quitar la protección).
- ✅ **Reusar el mismo monitor**: una sola fuente de verdad de uptime.

### Verificación
- Abrir la status page con las credenciales internas → muestra el componente
  "API / App" en verde, ligado al monitor.
- Verificar que NO es accesible sin credenciales (incógnito → pide auth).

### Rollback
Eliminar la status page en Better Stack.

---

## 5️⃣ E2E smoke del health endpoint

### Resumen ejecutivo
- **Objetivo**: que CI verifique que `/api/health` responde 200 + `status: 'ok'`,
  para no romper el target del monitor en un refactor.
- **Outcome**: un test Playwright rápido (request API, sin browser).

### Pasos

#### 5.1 Crear `tests/e2e/health.spec.ts` (o sumar al smoke existente)

```ts
import { expect, test } from '@playwright/test'

test('GET /api/health responde 200 ok', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.status).toBe('ok')
  expect(body.checks.db).toBe('ok')
})
```

> El job `e2e` de CI ya levanta el server en `localhost:3000` con `SUPABASE_SECRET_KEY`
> de secrets (ver [`.github/workflows/ci.yml:62`](../.github/workflows/ci.yml#L62)),
> así que el ping a Supabase funciona. No hace falta tocar el workflow: el health
> endpoint no usa PostHog/Sentry/ratelimit (ya disabled en ese job).

### Decisiones tomadas
- ✅ **Test de request API, no de UI**: rápido y determinístico, sin browser.
- ✅ **Sin cambios en `ci.yml`**: el job `e2e` ya tiene las vars necesarias y los
  kill switches no afectan a `/api/health`.

### Verificación
- `pnpm test:e2e` local con `.env.local` válido → el test pasa.

### Rollback
Borrar el spec.

---

## 6️⃣ Docs

### Resumen ejecutivo
- **Objetivo**: reflejar que Better Stack está vivo (uptime + logs), TP-04 done.
- **Outcome**: una sesión nueva con la docs cargada entiende el setup operativo.

### Pasos

#### 6.1 [`docs/tech-proposals.md`](./tech-proposals.md)
- TP-04 (línea 105): ya tiene 🟡 ✅ — agregar nota "**Implementado en PR8** — ver
  [`implementation-plan-pr8.md`](./implementation-plan-pr8.md). Health endpoint
  `/api/health`, log drain nativo Railway → Better Stack, uptime monitor, status
  page privada."

#### 6.2 [`docs/01-tech-stack.md`](./01-tech-stack.md)
- Mover Better Stack / Better Uptime a la sección de servicios activos, marcar ✅.
- Nota: sin env vars de runtime; el único código es `/api/health`.

#### 6.3 [`docs/feature-status.md`](./feature-status.md)
- Fila nueva: `Observabilidad (Better Stack) | ✅ Uptime /api/health · log drain Railway · status page privada`.

#### 6.4 [`docs/roadmap.md`](./roadmap.md)
- En "Pre-launch", marcar **"Better Uptime"** (línea 130) como ✅ / hecho.

### Verificación
- `pnpm lint` no aplica a `docs/` (biome corre sobre `./src`), pero revisar links
  relativos a mano.

### Rollback
Revert de los 4 archivos.

---

## ✅ Acceptance criteria

| # | Criterio | Cómo se valida |
|---|---|---|
| AC1 | `GET /api/health` devuelve 200 + `{"status":"ok","checks":{"db":"ok"}}` con DB sana | `curl -i http://localhost:3000/api/health` en dev |
| AC2 | `/api/health` devuelve **503** + `"db":"down"` cuando Supabase no responde | `SUPABASE_SECRET_KEY` inválida → `curl` da 503; el handler no tira |
| AC3 | Respuesta nunca cacheada | Header `Cache-Control: no-store` presente; dos hits seguidos refrescan `timestamp` |
| AC4 | Log drain activo: logs de prod llegan a Better Stack | Navegar prod → entradas en Better Stack *Live tail*; un `console.error` real aparece |
| AC5 | Uptime monitor verde sobre `/api/health` | Monitor en Better Stack en verde tras el primer chequeo |
| AC6 | Monitor alerta en caída | Forzar 503/pausa de servicio → incidente + alerta (email/Slack) |
| AC7 | Status page **privada** funcional | Accesible con credenciales internas; incógnito pide auth |
| AC8 | E2E smoke del health endpoint pasa en CI | Job `e2e` verde con `tests/e2e/health.spec.ts` |
| AC9 | Type-check + lint limpios | `pnpm type-check && pnpm lint` 0 errores |
| AC10 | Sin env vars nuevas en runtime; `src/env.ts` intacto | Diff no toca `src/env.ts`; el token del drain vive en Railway |
| AC11 | Docs reflejan el estado | TP-04 → PR8, tech-stack, feature-status, roadmap actualizados |

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| **Health check pagina por blips transitorios de Supabase** | Media | Timeout 2s + el monitor de Better Stack soporta umbral de reintentos (alertar tras N fallos). Ajuste 100% dashboard, sin código. |
| **El ping a `cards` agrega carga en cada chequeo** | Baja | `head:true` no transfiere rows; intervalo 1–3 min es trivial para Supabase. Si molesta, bajar frecuencia. |
| **Free tier de Better Stack excedido** (volumen de logs) | Baja | Beta cerrado = poco tráfico/logs. Si se acerca al límite, filtrar a nivel drain o subir plan. Monitorear el uso en el dashboard. |
| **`/api/health` queda detrás de un futuro middleware de auth** | Baja | Hoy no hay middleware. Si se agrega uno, **excluir `/api/health`** del matcher (documentado acá). |
| **Drain mal configurado → logs no llegan y nadie se entera** | Media | AC4 valida *Live tail* en el setup. El uptime monitor (independiente del drain) sigue cubriendo disponibilidad aunque el drain falle. |
| **Status page se publica por accidente** | Baja | Crear directamente como password-protected; no asignar dominio público hasta el launch. |

---

## Orden de commits sugerido

1. **Health endpoint** (§1): `feat(health): add /api/health route handler with supabase ping`
2. **E2E smoke** (§5): `test(e2e): assert /api/health returns 200 ok`
3. **Docs** (§6): `docs: PR8 Better Stack plan + status updates`

> Log drain, uptime monitor y status page (§2–4) son configuración de dashboard
> (Railway + Better Stack) — no generan commits; se documentan acá y se ejecutan en
> el setup. Squash al merge a `main`. Branch: `feat-pr8-better-stack`.
