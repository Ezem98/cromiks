# 🐛 Bugs detectados

Snapshot: 26 mayo 2026 · Detectados por auditoría de código.

Esta lista cubre bugs **reales o muy probables** que viven hoy en el código. **No** incluye features 🚧 pendientes — eso vive en [`feature-status.md`](./feature-status.md) y [`roadmap.md`](./roadmap.md). Tampoco repite el placeholder Pokemon del modelo 3D (ya documentado en [`assets/3d-pack.md`](./assets/3d-pack.md)).

## Cómo leer

| Símbolo | Significado |
|---|---|
| 🔴 | **Crítico** — rompe flujo principal, afecta datos, o filtra info entre usuarios |
| 🟡 | **Medio** — edge case razonablemente alcanzable o frágil ante cambios |
| 🟢 | **Menor** — cosmético, dev-only, o muy improbable |

---

## 🔴 Críticos

### B-01 · ~~Error de openPack no es visible al usuario~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/app/(focus)/open/[packId]/page.tsx`](../src/app/(focus)/open/[packId]/page.tsx)

Si `openPack()` falla la página redirige a `/?error=open_failed` pero no hay componente que lea ese query param y muestre toast/banner. El usuario pierde su sobre del día sin entender qué pasó.

**Fix sugerido**: leer `searchParams.error` en `(app)/home/page.tsx` y disparar un toast (`sonner` ya está instalado) con copy contextual por código de error (`open_failed`, `not_owner`, `already_opened`).

---

### B-02 · ~~`dismantleCard` no tiene confirmación destructiva~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/features/album/components/card-detail-dialog.tsx`](../src/features/album/components/card-detail-dialog.tsx), [`src/features/album/actions.ts`](../src/features/album/actions.ts)

La acción "Canjear duplicado" es irreversible (la copia se pierde + ganás coins) y no pide confirmación. Un mis-tap en un legendary duplicado es destructivo.

**Fix sugerido**: AlertDialog con copy "Vas a canjear 1 copia de {{name}} por {{coins}} coins. Esta acción no se puede deshacer." y CTA "Sí, canjear".

---

### B-03 · ~~Server actions sin validación de inputs~~ ✅ FIXED (26 may 2026)
**Archivos**: [`src/features/pack-opening/actions.ts`](../src/features/pack-opening/actions.ts), [`src/features/album/actions.ts`](../src/features/album/actions.ts), [`src/features/missions/actions.ts`](../src/features/missions/actions.ts), [`src/features/sharing/actions.ts`](../src/features/sharing/actions.ts)

Ninguna server action valida que `packId` / `cardId` / `userMissionId` sean UUIDs antes de pasarlos al RPC. No es SQL injection (Supabase parametriza), pero un input malformado puede hacer que RPC tire un error genérico que cae al branch `unknown` y rompe UX. Además, no hay verificación explícita de sesión antes de delegar al RPC en algunos casos (la RLS lo cubre, pero la action retorna `unknown` en vez de `unauthenticated`).

**Fix sugerido**: schema Zod por action (`z.string().uuid()`), parse al inicio, retornar `{ ok: false, code: 'invalid_input' }` antes de tocar la DB.

---

### B-04 · ~~Error handling por substring matching es frágil~~ ✅ FIXED (26 may 2026)
**Archivos**: [`src/features/pack-opening/actions.ts:28-39`](../src/features/pack-opening/actions.ts), [`src/features/album/actions.ts`](../src/features/album/actions.ts), [`src/features/missions/actions.ts`](../src/features/missions/actions.ts)

El branching usa `error.message.includes('not_found')` / `'already_opened'` / `'not_owner'`. Si la SQL function cambia el wording o agregamos i18n al raise, todo cae a `unknown` y el usuario ve un toast genérico. Bug latente que va a aparecer al primer refactor de migrations.

**Fix sugerido**: las RPC tirar `raise exception using errcode = 'P0001', message = 'pack_not_found'` y la action chequear `error.code === 'P0001'` o leer `error.details` estructurado. Documentar contrato en [`05-sql-functions.md`](./05-sql-functions.md).

---

### B-05 · ~~Sin error boundary en el route group `(app)`~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/app/(app)/layout.tsx`](../src/app/(app)/layout.tsx)

Si `getHomeData()` o el query de `profiles`/`user_coins` tira (network blip, RLS denegado, DB con problemas), el usuario ve la pantalla en blanco / redirect raro. No hay `error.tsx` en el route group.

**Fix sugerido**: agregar `src/app/(app)/error.tsx` con CTA "Reintentar" + log a Sentry cuando esté.

---

## 🟡 Medio

### B-06 · ~~`assignDailyMissions` + re-fetch dispara doble query~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/app/(app)/home/page.tsx:24-27`](../src/app/(app)/home/page.tsx)

Si el usuario no tiene misiones del día se llama `assignDailyMissions()` y después `getHomeData()` otra vez. Son 2 round-trips innecesarios cada primera carga del día.

**Fix sugerido**: que `assignDailyMissions` retorne las misiones creadas o que `getHomeData` haga el assign-if-missing en una sola transacción RPC.

---

### B-07 · ~~OG image cache sin invalidación cuando cambia el cromo~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/app/api/og/card/[cardId]/route.tsx:23-24`](../src/app/api/og/card/[cardId]/route.tsx)

El comment ya admite el problema: si cambia la foto/nombre/rareza del cromo en DB la OG image queda stale en CDN. Posts viejos compartidos siguen mostrando data vieja.

**Fix sugerido**: agregar `revalidate = 60 * 60` (1h) en vez de `revalidate = false`, o `revalidateTag('og-card-' + cardId)` cuando se actualiza la card vía admin (cuando exista admin).

---

### B-08 · ~~OG endpoint sin try/catch alrededor de Satori~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/app/api/og/card/[cardId]/route.tsx`](../src/app/api/og/card/[cardId]/route.tsx)

Si Satori falla renderizando (CSS no soportado, font 404, gradient inválido) el endpoint tira 500 y los crawlers de WhatsApp/Twitter no muestran preview. Sin fallback graceful.

**Fix sugerido**: try/catch global, devolver una OG estática "Cromiks · Eterno Diciembre" si el render dinámico tira.

---

### B-09 · `revalidatePath` fire-and-forget puede mostrar coins stale
**Archivos**: [`src/features/missions/actions.ts`](../src/features/missions/actions.ts), [`src/features/album/actions.ts`](../src/features/album/actions.ts)

Después de `claim_mission` o `dismantle_card` se llama `revalidatePath('/')` y el cliente navega. Si la sigueinte request al home llega antes que la invalidación termine, el balance de coins viene del cache viejo.

**Fix sugerido**: usar `revalidateTag('user-balance')` + tag explícito en los queries, o pasar los datos actualizados como retorno de la action para optimistic update inmediato.

---

### B-10 · ~~RPC `open_pack` puede devolver rows con campos null no manejados~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/features/pack-opening/actions.ts:42-63`](../src/features/pack-opening/actions.ts)

Se hace `data.map(row => ({ cardId: row.out_card_id, tier: row.card_tier as Tier, ... }))` sin verificar que `out_card_id` o `card_tier` no sean null. Si una de las cartas rolleadas tiene un join roto, `cardId: null` rompe `key={card.cardId}` y la animación de stack.

**Fix sugerido**: filtrar `data.filter(r => r.out_card_id && r.card_tier)` y/o tirar error explícito si el RPC entrega data incompleta.

---

### B-11 · ~~Type assertions sin validación: `as Tier`, `as OpenPackResult`~~ ✅ FIXED (26 may 2026)
**Archivos**: [`src/features/pack-opening/actions.ts`](../src/features/pack-opening/actions.ts), [`src/app/api/og/card/[cardId]/route.tsx`](../src/app/api/og/card/[cardId]/route.tsx)

`row.card_tier as Tier` y `card.rarity as Tier` evaden el check de TS. Si la DB introduce un tier nuevo (`mythic`, `holographic`, etc.) sin actualizar el enum del cliente, el switch de `getPalette()` cae a `default` (common) sin warning.

**Fix sugerido**: helper `parseTier(value): Tier | null` con switch exhaustivo y log si no matchea.

---

### B-12 · ~~No hay loading state ni disabled en daily pack claim~~ ✅ Ya estaba implementado
**Archivo**: [`src/features/home/components/daily-pack-card.tsx`](../src/features/home/components/daily-pack-card.tsx)

Si el usuario hace doble-tap rápido en "Abrir sobre", la action puede dispararse 2 veces antes que el navigate redirija. La RPC `claim_daily_pack` es idempotente (un sobre por día) — pero la segunda llamada igual genera un error log y feedback raro.

**Fix sugerido**: `useTransition` + estado `isPending` + `disabled={isPending}` + spinner. Mismo patrón para `pinCard` / `unpinCard` / `dismantleCard`.

---

### B-13 · ~~Pin/unpin/share sin feedback visible~~ ✅ Ya estaba implementado
**Archivo**: [`src/features/album/components/card-detail-dialog.tsx`](../src/features/album/components/card-detail-dialog.tsx)

Las acciones se ejecutan en silencio. Si el server retorna `{ error: 'unknown' }`, el dialog se cierra y el usuario no sabe si pasó algo. Mismo problema en `recordShare`.

**Fix sugerido**: toast `sonner` con success ("Cromo pineado") / error ("No se pudo pinear, intentá de nuevo") + optimistic update con rollback si falla.

---

### B-14 · ~~Canvas 3D sin error boundary para context loss~~ ✅ FIXED (26 may 2026)
**Archivos**: [`src/features/pack-opening/components/3d/card-scene.tsx`](../src/features/pack-opening/components/3d/card-scene.tsx), [`src/features/pack-opening/components/3d/sobre-scene.tsx`](../src/features/pack-opening/components/3d/sobre-scene.tsx)

Si WebGL pierde contexto (GPU pressure en mobile, tab background, otro WebGL en otra app) el `<Canvas>` queda en blanco. Sin error boundary que muestre fallback ni listener de `webglcontextlost`. Esto ya está marcado como 🚧 3.13 en feature-status, pero quiero remarcarlo: en producción mobile es algo que **va a pasar**, no es exotic.

**Fix sugerido**: ErrorBoundary alrededor del Canvas + listener `onContextLost` que disponga un retry con fallback 2D (mostrar las cartas en stack sin 3D).

---

### B-15 · ~~Suspense fallback en escenas 3D es `null` → pantalla en blanco~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/features/pack-opening/components/3d/sobre-scene.tsx`](../src/features/pack-opening/components/3d/sobre-scene.tsx), [`src/features/pack-opening/components/3d/card-scene.tsx`](../src/features/pack-opening/components/3d/card-scene.tsx)

Con `<Suspense fallback={null}>` mientras carga el GLTF el usuario ve la pantalla con sólo el gradiente. En 3G/4G lento se siente "trabado".

**Fix sugerido**: skeleton del sobre/carta con shimmer (matchea el aspect ratio final).

---

### B-16 · ~~`revalidatePath` no se llama después de `recordShare`~~ ✅ Ya estaba implementado
**Archivo**: [`src/features/sharing/actions.ts`](../src/features/sharing/actions.ts)

`recordShare` inserta en `share_events` y eso dispara el trigger SQL de auto-progress de misiones. Pero después de compartir no se revalida `/` ni `/album`, así que el progreso de la misión "compartí 3 cromos" aparece desactualizado en el home hasta el siguiente full refresh.

**Fix sugerido**: `revalidatePath('/')` al final de `recordShare`.

---

## 🟢 Menor

### B-17 · ~~Tilt del overlay HTML hardcodeado en grados~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/features/pack-opening/components/3d/card-scene.tsx:119-120`](../src/features/pack-opening/components/3d/card-scene.tsx)

Los grados (11.5°, 17°) son la conversión a mano de los radianes (0.2, 0.3) del mesh. Si alguien tunea el tilt del mesh 3D el overlay HTML queda desincronizado.

**Fix sugerido**: extraer `TILT_X_RAD = 0.2` / `TILT_Y_RAD = 0.3` en constantes compartidas, derivar grados con `* (180/Math.PI)`.

### B-18 · `setTimeout` de reset de rotación sin guard de unmount
**Archivo**: [`src/features/pack-opening/components/3d/card-scene.tsx:36-41`](../src/features/pack-opening/components/3d/card-scene.tsx)

El `useEffect` limpia el timer en el return, pero si el state setter dispara en un componente medio-desmontado en dev mode dispara warning. No es bug en prod pero ensucia logs.

### B-19 · ~~`sm:col-span-1 col-span-1` redundante~~ ✅ FIXED (26 may 2026)
**Archivo**: [`src/app/(app)/home/page.tsx:77`](../src/app/(app)/home/page.tsx)

Tailwind ya hace `col-span-1` mobile-first, el modifier no aporta nada. Cleanup.

### B-20 · Strings hardcodeados sin abstracción i18n
**Archivos**: varios

"Próximamente", "Trades entre amigos", errores de form, etc. todo hardcoded en JSX. Hoy no es bug porque el target es ES-AR único, pero la docs ya menciona idioma en onboarding como concepto futuro.

### B-21 · `<Cromo>` / `<Sobre>` dependen de keyframes globales (`shimmer`, `float`) no co-localizados
**Archivos**: [`src/components/domain/cromo.tsx`](../src/components/domain/cromo.tsx), [`src/components/domain/sobre.tsx`](../src/components/domain/sobre.tsx)

Las animaciones inline asumen que los `@keyframes` viven en algún CSS global. Si alguien hace un cleanup del global CSS y renombra, los componentes pierden animación sin error de compile.

---

## Tabla resumen

| ID | Severidad | Área | 1-liner |
|---|---|---|---|
| B-01 | 🔴 | UX errores | Error de openPack invisible al usuario |
| B-02 | 🔴 | UX destructivo | dismantle sin confirmación |
| B-03 | 🔴 | Seguridad/UX | Server actions sin Zod |
| B-04 | 🔴 | Robustez | Error handling por substring |
| B-05 | 🔴 | Robustez | Sin error.tsx en (app) |
| B-06 | 🟡 | Perf | Doble query en home si misiones missing |
| B-07 | 🟡 | Sharing | OG cache sin invalidar |
| B-08 | 🟡 | Sharing | Satori sin fallback graceful |
| B-09 | 🟡 | Cache | revalidatePath race con re-render |
| B-10 | 🟡 | Pack opening | RPC con campos null no filtrados |
| B-11 | 🟡 | Tipos | `as Tier` sin validación runtime |
| B-12 | 🟡 | UX | Sin loading/disabled en daily claim |
| B-13 | 🟡 | UX | Pin/unpin/share sin feedback |
| B-14 | 🟡 | 3D | Canvas sin error boundary |
| B-15 | 🟡 | 3D | Suspense fallback null |
| B-16 | 🟡 | Sharing | recordShare no revalida home |
| B-17 | 🟢 | 3D | Tilt en grados hardcodeado |
| B-18 | 🟢 | 3D | setTimeout sin guard unmount |
| B-19 | 🟢 | CSS | `sm:col-span-1 col-span-1` redundante |
| B-20 | 🟢 | i18n | Strings hardcoded |
| B-21 | 🟢 | CSS | Keyframes globales sin co-locación |

---

## Próximo paso sugerido

Mi voto para un sprint corto pre-launch: arrancar por los **5 críticos** + B-12 + B-13 (feedback visible). Eso solo cubre el 80% del riesgo percibido. B-14/B-15 vienen junto al item 3.13 pendiente. El resto se puede atender en cleanup pass.
