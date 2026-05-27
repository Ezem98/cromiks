# 🧪 Propuestas de tecnologías y librerías

Snapshot: 26 mayo 2026.

Este archivo propone librerías/servicios a sumar al stack. Para ver **qué hay hoy**, ir a [`01-tech-stack.md`](./01-tech-stack.md). Para arquitectura ver [`02-architecture.md`](./02-architecture.md).

Cada propuesta documenta: **qué resuelve · por qué · compatibilidad · esfuerzo · alternativas**.

## Cómo leer

| Símbolo | Significado |
|---|---|
| ✅ | Compatible 1:1 con stack actual, sin caveats |
| ⚠️ | Compatible pero con consideraciones (config / versión / peer dep) |
| ❌ | Incompatible o requiere reemplazar otra pieza |
| 🔥 | Recomendado para pre-launch |
| 🟡 | Recomendado post-launch |
| 🟢 | Nice-to-have / situacional |

---

## 🎯 Snapshot del stack actual (referencia rápida)

| Área | Hoy |
|---|---|
| Framework | Next.js 16.2.6 (App Router, RSC, Server Actions, Turbopack) |
| UI runtime | React 19.2 |
| Lenguaje | TypeScript 5.7+ |
| Lint/format | Biome 2.4 (sin ESLint/Prettier) |
| Estilos | Tailwind v4 + `tw-animate-css` |
| Primitivos UI | `radix-ui` + `class-variance-authority` |
| Iconos | `lucide-react` |
| Toasts | `sonner` |
| Theme | `next-themes` |
| Animación | `motion` (Framer Motion v12) |
| 3D | `three` 0.184 + `@react-three/fiber` 9.6 + `@react-three/drei` 10.7 |
| Forms / validación | `zod` 4 (instalado pero subutilizado) |
| Backend / Auth / DB | Supabase (`@supabase/ssr` 0.10 + `supabase-js` 2.47) |
| Email | Resend |
| Scripts | `tsx` |
| Package manager | pnpm 10 / Node 22 |

**Gaps detectados** (lo que NO hay):
- Sin error monitoring / observabilidad
- Sin analytics / feature flags
- Sin tests (unit ni E2E)
- Sin rate limiting
- Sin payment processor (tip jar / suscripciones eventuales)
- Sin cron / scheduled jobs (más allá de lo que da Supabase)
- Sin image optimization más allá de `next/image`
- Sin push notifications setup
- Sin gestor de env vars (`.env.local` solo)

---

## 🔍 Observabilidad y errores

### TP-01 · **Sentry** (`@sentry/nextjs`) 🔥 ✅
**Resuelve**: error tracking en producción (server + client + edge + RSC), release tracking, performance traces, source maps, alertas. Hoy `console.error` se pierde en Railway logs.

**Por qué pre-launch**: sin esto, los bugs reportados como B-04/B-08/B-14 en [`bugs.md`](./bugs.md) son invisibles después del launch.

**Compatibilidad**:
- ✅ SDK oficial de Next.js 16 con soporte App Router + Server Actions
- ✅ Funciona con Turbopack
- ✅ Edge runtime compatible
- ⚠️ Hay que envolver server actions con `Sentry.withServerActionInstrumentation()` o helper propio
- ⚠️ El wizard `npx @sentry/wizard@latest -i nextjs` configura `instrumentation.ts` automáticamente

**Esfuerzo**: 2-3 horas (wizard + tunear `beforeSend` para filtrar errors esperados como `not_owner`).

**Alternativas consideradas**: Highlight.io (más nuevo, menos maduro en RSC), Bugsnag (más caro, sin ventaja en RSC), self-hosted GlitchTip (overhead operativo).

---

### TP-02 · ~~Vercel Analytics + Speed Insights~~ ❌ N/A (era Vercel-specific)

**Estado**: descartada. Eran productos atados a deploys en Vercel y no aplican en Railway.

**Cómo se cubre el gap**:

- **Product analytics** (funnels, top pages, retention): ya planeado en TP-03 PostHog, que además incluye web analytics básicos (pageviews, devices, referrers).
- **Web vitals / performance**: TP-01 Sentry ya captura traces con `tracesSampleRate: 0.1` — alcanza para detectar regresiones de performance por ruta.

**Si más adelante hace falta web analytics liviano y portable** (sin la complejidad de PostHog): considerar **Plausible** o **Pirsch** — ambos son script-tag externos, agnósticos del hosting, EU-friendly y baratos. No los meto pre-launch porque PostHog ya cubre el caso.

---

### TP-03 · **PostHog** 🔥 ⚠️
**Resuelve**: product analytics (funnels, retention, replays, feature flags, A/B). Reemplaza varias herramientas (Mixpanel + LaunchDarkly + LogRocket). Generous free tier.

**Compatibilidad**:
- ⚠️ `posthog-node` para server, `posthog-js` para client — hay que separar capturas (no usar el client en RSC)
- ⚠️ Replays consumen MB de bundle (~50kb gzipped) — opcional
- ✅ Feature flags integran bien con Server Components (lectura en server, pasar como prop)

**Esfuerzo**: 1 día (instalar + definir 5-10 eventos clave: `pack_opened`, `card_pinned`, `mission_claimed`, `share_clicked`).

**Alternativas**: Mixpanel (más caro, no tiene replays gratis), Amplitude (genial para eventos pero sin feature flags free).

---

### TP-04 · **Better Stack** (Logs + Uptime) 🟡 ✅
**Resuelve**: log aggregation desde Railway + uptime monitoring + status page público. Free tier decente.

**Compatibilidad**: ✅ Railway tiene log drains nativos hacia syslog/HTTP — configurar Better Stack como destino del drain en el dashboard de Railway, sin código.

**Esfuerzo**: 30 minutos.

**Alternativas**: Axiom (mejor para logs queryables tipo SQL — también soporta Railway drains), Datadog (caro, overkill para MVP).

---

## 🧪 Testing

### TP-05 · **Vitest** + **@testing-library/react** 🔥 ⚠️
**Resuelve**: unit + component tests rápidos. Compatible con Next 16, mejor DX que Jest (HMR de tests).

**Compatibilidad**:
- ✅ Vitest 2+ corre con Vite plugin Next-compat
- ⚠️ Para Server Components / Server Actions necesita helpers (`vi.mock('next/cache')`, mock de Supabase client)
- ✅ Funciona con React 19 (RTL ya tiene support)
- ✅ Biome no tiene conflicto con Vitest config

**Esfuerzo**: 3-4 horas setup + 1 día primer batch de tests (RPC parsers, helpers de `lib/`, validators de Zod).

**Alternativas**: Jest (más maduro pero más lento, peor DX con ESM y TS).

---

### TP-06 · **Playwright** (E2E) 🔥 ✅
**Resuelve**: tests end-to-end. Smoke crítico (signup → open pack → ver cromo) y regression de flows. Trace viewer + auto-wait + retries.

**Compatibilidad**: ✅ Independiente del runtime. Levanta el server de dev y navega.

**Esfuerzo**: 4-6 horas setup + 1 día primeros 3-5 tests críticos.

**Alternativas**: Cypress (más popular pero peor para multi-tab y mobile emulation), Puppeteer (low-level).

---

### TP-07 · **MSW** (Mock Service Worker) 🟡 ✅
**Resuelve**: mockear Supabase / Resend / cualquier HTTP en tests y en dev offline. Interceptor a nivel network.

**Compatibilidad**: ✅ Funciona en Node (tests) y browser (dev/Storybook). Sin patch monkey de fetch.

**Esfuerzo**: Solo si vamos a hacer testing serio de la capa de queries.

---

## 🛡 Seguridad / robustez

### TP-08 · **Upstash Redis** + **Upstash Ratelimit** 🔥 ✅
**Resuelve**: rate limiting en server actions y route handlers. Pre-launch crítico para evitar abuso del endpoint OG image (Satori es caro) y spam de share_events. Free tier alcanza el MVP.

**Compatibilidad**:
- ✅ HTTP-based (no TCP) → funciona en Edge runtime y RSC
- ✅ Cliente oficial `@upstash/ratelimit` + `@upstash/redis`
- ✅ Pattern: `const { success } = await ratelimit.limit(userId)` al inicio de la action

**Esfuerzo**: 2-3 horas para cablear en acciones clave (`openPack`, `claimMission`, `recordShare`, OG endpoint).

**Alternativas**: Cloudflare WAF (R2 ya implica que el tráfico pasa por Cloudflare — se puede sumar rate-limit rules a nivel edge sin código), self-hosted Redis (overhead).

---

### TP-09 · **Arcjet** 🟡 ✅
**Resuelve**: bot detection + rate limiting + email validation + signup protection. Producto más nuevo, diseñado para Next.js.

**Compatibilidad**: ✅ Middleware nativo Next 16.

**Esfuerzo**: 2 horas.

**Trade-off vs TP-08**: Arcjet es más completo pero menos battle-tested. Upstash es más liviano y específico.

---

### TP-10 · **Zod schemas en TODAS las server actions** 🔥 ✅
**Resuelve**: validación de inputs. Ya está instalado (`zod` 4.4) pero subutilizado. Conecta con C-01 de [`improvements.md`](./improvements.md).

**Compatibilidad**: ✅ Ya instalado. Zod 4 tiene `z.uuid()`, `z.iso.datetime()`, mejor inferencia y `z.prettifyError()`.

**Esfuerzo**: helper `defineAction(schema, fn)` en `lib/actions.ts` + migrar 5 actions → media tarde.

---

### TP-11 · **`@t3-oss/env-nextjs`** 🟡 ✅
**Resuelve**: validar env vars al boot (server y client separados). Hoy si falta `RESEND_API_KEY` se rompe en runtime, no en build.

**Compatibilidad**: ✅ Reemplaza `process.env.X` por `env.X` tipado. Schema con Zod (ya tenemos).

**Esfuerzo**: 1-2 horas para crear `env.ts` y migrar usos.

---

## 📊 Data fetching / state cliente

### TP-12 · **TanStack Query** (React Query) 🟡 ⚠️
**Resuelve**: cache cliente, optimistic updates serios, retries, polling. Mejora UX de pin/unpin/dismantle (que hoy son full round-trip sin optimismo real).

**Compatibilidad**:
- ⚠️ Conflicto conceptual con RSC + Server Actions: Next 16 ya da cache server-side y `revalidatePath`. Solo agregar si tenés interacciones client-heavy.
- ⚠️ Usar **solo** en client components con interacción frecuente (no para data inicial — eso queda en RSC).
- ✅ Funciona con React 19, hydration helper de Next.

**Recomendación**: posponerlo. Para Cromiks el pattern de RSC + Server Action + `revalidatePath` cubre el 90%. Si aparece una vista con polling / refresh / interacciones rápidas (chat, leaderboard live), entonces sí.

**Alternativas**: SWR (más simple), Zustand + fetch manual (DIY).

---

### TP-13 · **Zustand** 🟢 ✅
**Resuelve**: state global cliente (modales, tour de onboarding, preferencias). Liviano (1kb).

**Compatibilidad**: ✅ Client-only. No interfiere con RSC.

**Recomendación**: solo si el state de UI client se complica. Hoy `useState` + props lo cubre.

---

## 💳 Pagos y monetización

### TP-14 · **Mercado Pago Checkout Pro** + SDK 🟡 ⚠️
**Resuelve**: tip jar + suscripciones eventuales (Argentina-native). Backlog 🚧 11.8.

**Compatibilidad**:
- ⚠️ SDK oficial JS es viejo pero funciona; mejor usar REST API directo desde Server Action (firma con secret).
- ⚠️ Recurring payments (`/preapproval`) tienen UX no-ideal pero único way de cobrar suscripciones en ARS.
- ✅ Webhooks compatibles con `route.ts` handlers de Next.

**Esfuerzo**: 1-2 sesiones para tip jar simple, +1 sesión para suscripción recurring.

**Alternativas**: Stripe (USD only en Argentina, fricción de tarjeta), dLocal (B2B no apto MVP), Lemon Squeezy (USD, no soporta tarjetas AR).

---

### TP-15 · **Polar.sh** 🟢 ⚠️
**Resuelve**: monetización de creator/SaaS con UX moderna. Útil si queremos vender supporter packs en USD (diáspora argentina).

**Compatibilidad**: ✅ SDK liviano. ⚠️ No es ARS-native — complementa Mercado Pago.

---

## 🗂 Storage / assets

### TP-16 · ~~Supabase Storage~~ ❌ Descartada en favor de R2

**Estado**: descartada. ✅ Cubierto por **Cloudflare R2** para todo: assets estáticos de cromos, OG renders cacheables **y** user-generated (avatares item 7.7, header images, fotos, audio de legendarios F-20).

**Por qué R2 y no Supabase Storage**:

- R2 ya está pagado y configurado para los assets estáticos — mantener una sola storage backend simplifica el mental model.
- Egress gratis (Supabase Storage cuenta egress contra el plan).
- No consume cuota de storage del proyecto Supabase.

**Trade-off asumido**: Supabase Storage te daría auth/RLS gratis en el upload (cliente sube con JWT, RLS valida ownership). Con R2 hay que escribir el flow de upload: server action auth-checkea → genera presigned URL → cliente sube directo a R2. Son ~20 líneas más de código por feature de upload, pero a cambio nos quedamos con una sola backend. Para escala de hobby project alcanza tranquilo.

---

### TP-17 · **Cloudinary** o **imgix** 🟢 ⚠️
**Resuelve**: image transformations on-the-fly (avatares circulares, OG images compuestas, blur placeholders). Hoy `next/image` cubre el grueso.

**Compatibilidad**: ✅ Independiente. ⚠️ Costo crece rápido con tráfico — R2 + `next/image` alcanzan para MVP.

**Recomendación**: posponer.

---

### TP-18 · ~~Vercel Blob~~ ❌ N/A (era Vercel-specific)

**Estado**: descartada. ✅ Ya cubierto por **Cloudflare R2** (ver [`01-tech-stack.md`](./01-tech-stack.md#hosting--deploy)) — única storage backend del proyecto, incluyendo user-generated. R2 da egress gratis, S3-compatible API y ya está pagado en el plan de Cloudflare.

---

## 📨 Email / notificaciones

### TP-19 · **react-email** + Resend (ya instalado) 🟡 ✅
**Resuelve**: templates de email tipados como JSX (welcome, magic link custom, "Tu Wrapped" F-41, "Te alcanzaron en cromos"). Hoy Resend manda el OTP default de Supabase sin branding.

**Compatibilidad**:
- ✅ `react-email` es de Resend → integración 1:1
- ✅ Compatible con tsx/RSC para preview en dev

**Esfuerzo**: 3-4 horas para los primeros 3 templates branded.

**Alternativas**: MJML (viejo standard, peor DX), templates en HTML a mano (frágil).

---

### TP-20 · **OneSignal** o **Pusher Beams** (Web Push) 🟡 ✅
**Resuelve**: web push notifications (F-04 en [`feature-ideas.md`](./feature-ideas.md), backlog 3.11). Subscripción del browser + envío server-side.

**Compatibilidad**:
- ✅ Standard Web Push API → funciona en Chromium, Firefox, Safari 16+
- ⚠️ iOS Safari requiere PWA install para push
- ✅ OneSignal tiene SDK ligero + dashboard

**Esfuerzo**: 1-2 días setup + integración con triggers (cron, eventos DB).

**Alternativas**: Web Push API nativa + VAPID self-hosted (gratis pero más código), Firebase Cloud Messaging (Google).

---

## 🎨 UI / componentes

### TP-21 · **shadcn/ui** (vendoring patterns) 🟡 ✅
**Resuelve**: ya estamos siguiendo el patrón (radix + cva + tailwind + ui/) pero a mano. La CLI de shadcn permite ingerir componentes nuevos con un comando.

**Compatibilidad**:
- ✅ Tailwind v4 compatible (la última CLI ya soporta)
- ✅ React 19 compatible
- ⚠️ Hay que mantener consistencia con los tokens custom existentes (gold, navy)

**Recomendación**: instalar la CLI y usarla para componentes nuevos (Combobox, Calendar, DataTable cuando aparezcan). No re-importar los que ya existen.

---

### TP-22 · **Vaul** (sheets/drawers) 🟢 ✅
**Resuelve**: bottom sheets mobile-first más nativos que Radix Sheet. Útil si el ShareSheet o un futuro tour de onboarding necesita gestures.

**Compatibilidad**: ✅ Standalone, no choca con Radix.

---

### TP-23 · **react-aria** primitivos selectos 🟢 ⚠️
**Resuelve**: accessibility hooks compone-tu-componente para casos donde Radix no llega (DateField, Slider con label custom).

**Compatibilidad**: ✅ Coexiste con Radix. ⚠️ Solo agregar feature por feature.

---

### TP-24 · **react-hook-form** 🟡 ✅
**Resuelve**: forms más complejos del MVP (onboarding multi-step si se complica, settings page futura, edit profile). Con Zod resolver tipado.

**Compatibilidad**: ✅ Integra perfecto con Zod (ya instalado) y Server Actions (`onSubmit` puede llamar la action).

**Esfuerzo**: drop-in para forms nuevos. No vale migrar los existentes.

---

## 🎬 Animación y 3D

### TP-25 · **Lottie** (`lottie-react`) 🟡 ✅
**Resuelve**: animaciones complejas pre-renderizadas (celebración de legendary, completar página, daily reward). Más cheap que renderear en runtime con motion. Designer entrega `.json` desde After Effects/Rive.

**Compatibilidad**: ✅ Standalone. No conflict con motion ni R3F.

**Trade-off**: bundle adicional ~60kb. Solo si hay 2+ animaciones que justifican.

---

### TP-26 · **Rive** 🟡 ✅
**Resuelve**: igual que Lottie pero con state machines (animaciones interactivas — el sobre que reacciona al hover). Output más liviano.

**Compatibilidad**: ✅ Standalone.

**Recomendación**: si vamos a hacer **skins de sobre** (F-28), Rive es mejor que crear N modelos 3D.

---

### TP-27 · **canvas-confetti** 🟢 ✅
**Resuelve**: confetti para milestones (página completa, primer legendary, racha de 7). 1kb, zero-config.

**Compatibilidad**: ✅ Client-only, drop-in.

---

### TP-28 · **react-three/postprocessing** 🟡 ✅
**Resuelve**: efectos visuales en el pack opening (bloom para legendaries, chromatic aberration, glow). Complementa el item 3.12 (variantes de complete por rareza).

**Compatibilidad**: ✅ Mismo team que R3F. Compatible con `three` 0.184.

**Esfuerzo**: 2-3 horas, vale 1000% el budget visual.

---

## 🛠 DX / build / CI

### TP-29 · **Turborepo** 🟢 ⚠️
**Resuelve**: monorepo si en el futuro hay app móvil / landing separada / admin tool. Hoy es un solo Next.

**Recomendación**: posponer. Solo si crece a múltiples apps.

---

### TP-30 · **GitHub Actions** workflows 🔥 ✅
**Resuelve**: CI básico (type-check + Biome + tests). Backlog 10.6 menciona "CI que valide migrations idempotentes".

**Compatibilidad**: ✅ Free para repos públicos / generous para privados.

**Esfuerzo**: 1-2 horas un workflow PR check (`pnpm install --frozen-lockfile && pnpm type-check && pnpm lint && pnpm test`).

---

### TP-31 · **Knip** 🟡 ✅
**Resuelve**: detectar exports, archivos y deps no usados. Cromiks ya tiene placeholders (`components/effects/`, `_deprecated_sobre-mesh.tsx`) — Knip los flagea.

**Compatibilidad**: ✅ Standalone. Solo dev dep.

**Esfuerzo**: 30 minutos run + un PR de limpieza.

---

### TP-32 · **`size-limit`** o **`@next/bundle-analyzer`** 🟡 ✅
**Resuelve**: budget de bundle size en CI. Three + motion + drei pueden inflar fácil. Verifica B-21 (CSS) y trends de bundle.

**Compatibilidad**: ✅ `@next/bundle-analyzer` es plugin oficial.

---

### TP-33 · **Husky + lint-staged ya instalados** ✅
Ya está. Verificar que `lint-staged` también corra `tsc` en pre-push (no en pre-commit, sería muy lento).

---

### TP-34 · **GitHub Dependabot / Renovate** 🟡 ✅
**Resuelve**: PRs automáticos de upgrades. Crítico cuando se pre-launch real.

**Recomendación**: Renovate es más configurable, Dependabot es más simple. Para Cromix, Dependabot alcanza.

---

## 🔁 Background jobs / cron

### TP-35 · **Supabase Cron** (extension `pg_cron`) 🔥 ✅
**Resuelve**: cron jobs sin infra adicional. Útil para reset de daily packs, recálculo de leaderboards, daily spotlight (F-05), cromo del mes (F-09).

**Compatibilidad**: ✅ Ya tenemos Supabase. Habilitar la extension en el dashboard.

**Esfuerzo**: 15 minutos por job, sin nuevas deps.

**Alternativas**: Railway Cron (cron jobs nativos en el mismo proyecto — útil si necesitamos correr scripts Node fuera de la DB), Upstash QStash (HTTP cron + delays/retries, free tier, pareja natural con Upstash Redis ya integrado en TP-08).

---

### TP-36 · **Upstash QStash** 🟡 ✅
**Resuelve**: cron jobs en HTTP + delays/retries de mensajes (útil para retries de email, async jobs como recomputar stats por usuario). Pareja natural con Upstash Redis.

**Compatibilidad**: ✅ Edge-compatible. Sin TCP.

**Recomendación**: solo si Supabase Cron queda corto.

---

## 🌍 i18n

### TP-37 · **next-intl** 🟡 ✅
**Resuelve**: traducción cuando se decida internacionalizar (la docs ya menciona idioma en onboarding). App Router-friendly, ICU messages.

**Compatibilidad**: ✅ Best-in-class para Next 16 App Router. RSC-aware.

**Recomendación**: posponer hasta tener decisión real de target multi-idioma (ES-AR es el target inicial).

---

## 📈 Resumen ejecutivo

### Lo que metería YA pre-launch 🔥

| Lib / servicio | Para qué | Esfuerzo |
|---|---|---|
| **Sentry** | Error monitoring server + client | 2-3 h |
| **PostHog** | Product analytics + feature flags + web analytics | 1 día |
| **Vitest + Testing Library** | Unit tests | 3-4 h setup |
| **Playwright** | 1 smoke E2E crítico | 1 día |
| **Upstash Ratelimit** | Anti-abuso en actions y OG | 2-3 h |
| **Zod en TODAS las actions** | Validación input (ya instalado) | 0.5 día |
| **GitHub Actions CI** | Type-check + lint + tests en PR | 1-2 h |
| **Supabase Cron** | Daily jobs | 15 min por job |

**Total**: ~3-4 días de trabajo. Cubre los gaps más críticos del MVP pre-launch.

### Post-launch (primer mes) 🟡

| Lib / servicio | Para qué |
|---|---|
| **react-email** | Templates branded de email |
| **Better Stack** | Log aggregation + uptime + status page |
| **OneSignal o Web Push nativo** | Web push (item 3.11 + F-04) |
| **react-three/postprocessing** | Variantes visuales de complete (item 3.12) |
| **Mercado Pago Checkout Pro** | Tip jar (item 11.8) |
| **`@t3-oss/env-nextjs`** | Env vars validados |
| **react-hook-form** | Forms complejos (settings, edit profile) |
| **Knip** | Cleanup de código no usado |
| **`@next/bundle-analyzer`** | Bundle budgets en CI |
| **Renovate / Dependabot** | Upgrades automáticos |

### Nice-to-have / situacional 🟢

`Rive`, `Lottie`, `canvas-confetti`, `Vaul`, `Polar.sh`, `next-intl`, `TanStack Query`, `Zustand`, `MSW`, `Cloudinary`, `Arcjet`, `Turborepo`.

---

## 🚫 Lo que NO sumaría (y por qué)

| Lib | Por qué no |
|---|---|
| **ESLint + Prettier** | Biome ya cubre ambos con mejor perf |
| **Jest** | Vitest es estrictamente mejor con React 19 + ESM |
| **Redux / Redux Toolkit** | Excesivo para Cromiks; RSC + server actions + `useState` alcanzan |
| **GraphQL / Apollo** | Supabase RPC + REST típado ya está |
| **Prisma / Drizzle** | Reemplazaría Supabase client; perdemos RLS automática y tipos generados |
| **Tailwind v3** | Ya estamos en v4 |
| **Framer Motion v11** (ya estamos en `motion` v12) | El paquete `motion` es la rebranding oficial |
| **Stripe** (para ARS) | Fricción de tarjeta + no soporta MP que es el default AR |
| **Firebase** | Duplicaría Supabase |
| **Auth.js / NextAuth** | Supabase Auth ya está integrado y funciona |
| **GSAP** | Decisión registrada en [`02-architecture.md`](./02-architecture.md) — motion alcanza |

---

## 📋 Matriz de compatibilidad rápida

| Propuesta | Next 16 | React 19 | Tailwind v4 | Turbopack | Edge runtime | RSC |
|---|---|---|---|---|---|---|
| Sentry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PostHog | ✅ | ✅ | ✅ | ✅ | ⚠️ (server separado) | ⚠️ (split client/server) |
| Vitest | ✅ | ✅ | n/a | n/a | n/a | ⚠️ (mocks RSC) |
| Playwright | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upstash Ratelimit | ✅ | ✅ | n/a | ✅ | ✅ | ✅ |
| Mercado Pago | ✅ | ✅ | n/a | ✅ | ⚠️ (Node runtime recomendado) | ✅ |
| react-email | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| react-hook-form | ✅ | ✅ | ✅ | ✅ | n/a | ❌ (client only) |
| TanStack Query | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (client only) |
| react-three/postprocessing | ✅ | ✅ | n/a | ✅ | ❌ (browser only) | ❌ (client only) |
| Lottie / Rive | ✅ | ✅ | ✅ | ✅ | ❌ (browser only) | ❌ (client only) |
| OneSignal | ✅ | ✅ | ✅ | ✅ | ⚠️ (server SDK Node) | ⚠️ |
| Supabase Cron | n/a | n/a | n/a | n/a | ✅ (server-side) | n/a |
| next-intl | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@t3-oss/env-nextjs` | ✅ | ✅ | n/a | ✅ | ✅ | ✅ |

---

## Referencias

- [`01-tech-stack.md`](./01-tech-stack.md) — Stack actual (lo que YA hay)
- [`02-architecture.md`](./02-architecture.md) — Conventions y patterns
- [`bugs.md`](./bugs.md) — Bugs detectados (varios resueltos por estas propuestas)
- [`improvements.md`](./improvements.md) — Mejoras de código (overlap con TP-01, TP-05, TP-10)
- [`feature-ideas.md`](./feature-ideas.md) — Features futuras que dependen de algunas de estas libs
