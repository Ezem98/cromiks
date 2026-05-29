# 🛠️ Plan PR7 · Followups post-PR6 (analytics + nav bugs)

> Snapshot: 2026-05-29.

---

## 🚩 Flags de la investigación (antes del plan)

Tres cosas que cambiaron respecto al texto de los issues después de validar contra código/SQL/PostHog:

1. **#10 — la Opción A del issue tiene TOCTOU race**. El issue propone "chequear `packs.status` desde la action antes de llamar al RPC y NO emitir si está `opened`". Pero dos renders concurrentes del SC pueden hacer el SELECT en paralelo, ambos ver `status='pending'`, ambos entrar al RPC y disparar el race que la migration de B-22 ya maneja DENTRO del RPC. El gate desde TS sigue siendo unreliable. La fuente de verdad de "esto fue replay" vive adentro del RPC (variable `v_replay`). El fix correcto es exponerla — agregar una columna `was_replay boolean` al return de `open_pack`. La action gatea con ese flag, sin inferir.

2. **#11 — surface más amplio que lo descrito**. El issue lista `/about` y `/missions`, pero un grep completo encontró que el footer también linkea a `/help`, `/donate`, `/legal` (más `/legal#homenaje`) y la landing usa `/about`. **Ninguna de esas rutas existe como page**. Mismo bug (Next prefetch contra rutas inexistentes), surface 4x más grande. Lo trato como un único bug "limpiar links rotos" y no como N items.

3. **#12 — no hay queries históricas que migrar**. HogQL `SELECT properties.action, count() FROM events WHERE event='card_pinned'` devolvió 1 fila: `pin | 1`. Cero eventos con `action='unpin'`. Como sospechábamos pero ahora con números: el rename de evento NO requiere migration de queries de PostHog ni notas a stakeholders. Limpio.

---

## Context

PR6 mergeó PostHog (5 eventos críticos, pageviews automáticos, identify, feature flag hook). La validación end-to-end del 2026-05-29 cerró los 10 ACs pero descubrió 3 bugs que se documentaron como issues:

- [#10](https://github.com/Ezem98/cromiks/issues/10) — `pack_opened` se dispara 2x por apertura real
- [#11](https://github.com/Ezem98/cromiks/issues/11) — Console 404s en `/about`, `/missions` (y otros)
- [#12](https://github.com/Ezem98/cromiks/issues/12) — `unpinCard` emite `card_pinned` con `action='unpin'`

Los tres son **pre-launch (beta cerrado planeado para junio 2026)**, así que el costo de migrar/limpiar ahora es mínimo (1 user de prueba, ~1 evento histórico) y la deuda no se acumula.

**Outcome esperado de PR7**:
- `pack_opened` se emite **exactamente 1 vez** por apertura real (sin trucos en TS — el RPC devuelve la fuente de verdad).
- Console del browser limpia en navegación normal (sin 404 spam de prefetch).
- Funnels en PostHog usables sin filtrar `properties.action = 'pin'` (eventos `card_pinned` y `card_unpinned` separados).

---

## 📊 Tabla resumen

| # | Item | Decisión | Esfuerzo (h) | Prioridad | Archivos clave |
|---|---|---|---|---|---|
| 1 | #10 — `open_pack` devuelve `was_replay` explícito | Modificar RPC + simplificar gate en action | 1.5 | **Alta** | [`supabase/migrations/2026052914_open_pack_explicit_was_replay.sql`](../supabase/migrations/) (nuevo), [`src/features/pack-opening/actions.ts`](../src/features/pack-opening/actions.ts) |
| 2 | #12 — Renombrar evento `card_unpinned` | Split en 2 eventos, dropear prop `action` | 0.5 | Media | [`src/features/album/actions.ts`](../src/features/album/actions.ts), [`docs/implementation-plan-pr6.md`](./implementation-plan-pr6.md) |
| 3 | #11 — Limpiar links rotos navbar/footer/landing | Remover `<Link>` a rutas inexistentes (no crear pages stub) | 0.75 | Baja | [`src/components/layout/navbar.tsx`](../src/components/layout/navbar.tsx), [`src/components/layout/mobile-nav.tsx`](../src/components/layout/mobile-nav.tsx), [`src/components/layout/footer.tsx`](../src/components/layout/footer.tsx), [`src/features/landing/landing.tsx`](../src/features/landing/landing.tsx) |
| **Total** | | | **~2.75 h** | | |

---

## 1️⃣ #10 — `pack_opened` doblea (idempotency leak via `is_new`)

### Root cause confirmado (vs hipótesis del issue)

El issue dice "el guard `wasReplay` no atrapa la segunda llamada porque el RPC devuelve `is_new=true` en ambas". **Confirmado** leyendo [`supabase/migrations/20260527120000_make_open_pack_idempotent.sql:166-196`](../supabase/migrations/20260527120000_make_open_pack_idempotent.sql).

Cadena exacta:

1. Primera llamada (path no-replay):
   - El RPC entra a `if not v_replay` (línea 127): para cada `v_card_id`, hace `INSERT INTO user_cards ... ON CONFLICT DO UPDATE`.
   - Cards nuevas quedan con `user_cards.copies = 1`.
   - `v_total_earned = 0` (nadie tenía duplicados todavía).
   - Return query (línea 166): `(uc.copies = 1) as is_new` evalúa a `TRUE` en las 4 cards nuevas.
   - Action calcula: `coinsEarned=0`, `newCardsCount=4` → `wasReplay = false` → **emite**. ✅
2. Segunda llamada concurrente o post-prefetch (path replay):
   - El RPC entra a `elsif v_pack.status = 'opened'` (línea 116) → `v_replay := true`.
   - **No re-ejecuta el upsert**. `user_cards.copies` sigue en 1 para esas mismas cards.
   - Return query es la misma (líneas 166-196): `(uc.copies = 1) as is_new` **sigue devolviendo TRUE** porque el state de la DB no cambió desde la primera llamada.
   - `v_total_earned = 0` (correcto, replay).
   - Action calcula: `coinsEarned=0`, `newCardsCount=4` → `wasReplay = false` → **emite OTRA VEZ**. ❌

El guard inferencial fue una buena heurística pero falla cuando el primer open también tuvo `coinsEarned=0` (ej. user con álbum vacío recibiendo solo cards nuevas, que es **literalmente el caso del onboarding** — el primer pack de un user nuevo).

### Por qué no la Opción A del issue (chequear `packs.status` desde la action)

El issue propone:

```ts
const pack = await supabase.from('packs').select('status').eq('id', packId).single()
if (pack.data.status === 'opened') {
  // replay — no emit
}
```

**Problema**: TOCTOU. El Server Component puede correr 2 veces casi en paralelo (prefetch + render real). Ambas ejecuciones hacen el SELECT antes de que la primera UPDATE-atómica del RPC marque `status='opened'`. Ambas ven `pending`, ambas pasan el gate, ambas emiten. Las migrations de B-22 ya documentaron este race (ver `pages.tsx` comment line 17-21). Resolverlo en TS con otro SELECT no agrega garantías.

### Diseño del fix (Opción C — fuente de verdad en el RPC)

El RPC ya tiene `v_replay boolean` (línea 60). Lo único que falta es exponerlo. Agregamos una columna al `RETURNS TABLE`. Cero ambigüedad, cero race, cero inferencia.

#### 1.1 Migration: `supabase/migrations/2026052914_open_pack_explicit_was_replay.sql`

```sql
-- =============================================================================
-- B-23 (PR7 followup #10): expose was_replay explicitly from open_pack
-- =============================================================================
-- Problema: la action openPack infería "fue replay?" desde
-- (coins_earned === 0 && new_cards_count === 0). Falla cuando la primera
-- apertura legítima tiene 0 monedas Y todas las cards son nuevas (caso onboarding:
-- user con álbum vacío). Resultado: pack_opened emite 2 veces por apertura real
-- en lugar de 1.
--
-- Fix: agregar columna was_replay al return. La function ya tiene v_replay
-- internamente (set en líneas 108, 118 de la migration anterior). Sólo lo
-- proyectamos al output.
-- =============================================================================

DROP FUNCTION IF EXISTS public.open_pack(uuid);

CREATE OR REPLACE FUNCTION public.open_pack(p_pack_id uuid)
 RETURNS TABLE(
   out_card_id     text,
   card_name       text,
   card_role       text,
   out_card_number integer,
   card_tier       card_rarity,
   image_url       text,
   is_new          boolean,
   copies_after    integer,
   coin_reward     integer,
   pack_type       pack_type,
   coins_earned    integer,
   coins_after     integer,
   was_replay      boolean      -- NUEVO
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  -- ... idéntico a la migration anterior ...
begin
  -- ... cuerpo idéntico (todo el control flow de v_replay queda igual) ...

  return query
  with rolled as (
    select unnest(v_rolled_ids) as cid, generate_subscripts(v_rolled_ids, 1) as ord
  )
  select
    c.id::text                                                     as out_card_id,
    -- ... resto de columnas idénticas ...
    v_pack.type                                                    as pack_type,
    v_total_earned                                                 as coins_earned,
    v_coins_after                                                  as coins_after,
    v_replay                                                       as was_replay   -- NUEVO
  from rolled r
  join public.cards c on c.id = r.cid
  join public.user_cards uc on uc.card_id = c.id and uc.user_id = v_user_id
  order by r.ord;
end;
$function$;
```

> **Nota**: la migration es ~95% copia textual de [`20260527120000_make_open_pack_idempotent.sql`](../supabase/migrations/20260527120000_make_open_pack_idempotent.sql) con UNA línea agregada al RETURNS TABLE y UNA línea al return query. No hay cambios de lógica. Mantener el archivo completo (no DDL-diff) sigue el pattern de Cromiks y simplifica el revert.

#### 1.2 [`src/features/pack-opening/actions.ts`](../src/features/pack-opening/actions.ts) — simplificar gate

```ts
// ANTES (líneas 104-124)
const coinsEarned = first.coins_earned ?? 0
const newCardsCount = cards.filter((c) => c.isNew).length
const wasReplay = coinsEarned === 0 && newCardsCount === 0

if (!wasReplay) {
  await track('pack_opened', { ... }, { distinctId: userId })
}

// DESPUÉS
const coinsEarned = first.coins_earned ?? 0
const newCardsCount = cards.filter((c) => c.isNew).length
const wasReplay = first.was_replay === true   // fuente de verdad: la RPC

if (!wasReplay) {
  await track(
    'pack_opened',
    {
      pack_type: first.pack_type ?? 'daily',
      cards_count: cards.length,
      new_cards_count: newCardsCount,
      coins_earned: coinsEarned,
    },
    { distinctId: userId },
  )
}
```

Mantenemos el shape de props sin cambios — los dashboards de PostHog no necesitan tocarse.

#### 1.3 Aplicación

Pattern usado en PR #9 (`_on_share_event_inserted` fix):
1. `mcp__supabase__apply_migration` para aplicar a prod inmediato (sin esperar deploy del frontend — la nueva columna es additive, el RPC viejo y el nuevo coexisten lógicamente para readers).
2. Commit del archivo en `supabase/migrations/` en el mismo PR para que el snapshot del repo refleje prod.

**Orden importante**: aplicar la migration **antes** de mergear el cambio del action. Si se mergea el action primero, en producción intentaría leer `first.was_replay` cuando la columna todavía no existe → `undefined === true` → `false` → `!wasReplay` → emite siempre (incluyendo replays). Side effect: vuelve al estado **pre-PR6** del doble-tracking. Tolerable durante la ventana pero feo. Aplicar SQL primero elimina el flicker.

### Acceptance criteria

| AC | Criterio | Cómo se valida |
|---|---|---|
| AC10.1 | Migration aplicada en prod | `mcp__supabase__list_migrations` lista `2026052914_open_pack_explicit_was_replay` |
| AC10.2 | RPC devuelve columna `was_replay` | HogQL no aplica — verificar vía `mcp__supabase__execute_sql` haciendo `SELECT * FROM open_pack('<existing-opened-pack-uuid>')` con `auth.uid()` set; debe traer columna `was_replay = true` |
| AC10.3 | Abrir un sobre nuevo produce **exactamente 1** `pack_opened` | HogQL: `SELECT count() FROM events WHERE event='pack_opened' AND distinct_id='<test-user>' AND timestamp > '<inicio-test>'` → 1 |
| AC10.4 | Refresh manual de `/open/[packId]` no incrementa el conteo | Mismo HogQL post-refresh → sigue en 1 |
| AC10.5 | El primer pack del onboarding (caso "todo nuevo, 0 coins") tampoco doblea | Crear cuenta nueva end-to-end, abrir el daily pack inicial → HogQL → 1 evento |
| AC10.6 | TypeScript compila | `pnpm type-check` limpio. Si los tipos generados de Supabase quedan stale, regenerar con `mcp__supabase__generate_typescript_types` y commitear |

### Rollback

1. `mcp__supabase__apply_migration` con un DDL que vuelva al CREATE OR REPLACE de `20260527120000_make_open_pack_idempotent.sql` (la versión sin `was_replay`).
2. Revert del commit en `src/features/pack-opening/actions.ts` (vuelve al guard inferencial).
3. Sigue habiendo doble-emisión, pero el funnel sobrevive — los dashboards llevan ~1 día con el bug y ya filtran el ruido manual.

### Riesgos específicos

| Riesgo | Mitigación |
|---|---|
| Drift entre migration aplicada en prod y archivo en repo | Aplicar vía `apply_migration` y commitear el SQL exacto en la misma sesión, antes del PR. Patrón usado en PR #9. |
| Tipos generados de Supabase no se regeneran y `first.was_replay` es `any` | Correr `mcp__supabase__generate_typescript_types`. Si se omite, TS compila igual (no hay strict check) pero perdemos la garantía estática. AC10.6 lo cubre. |
| User abre sobre durante el deploy window (migration aplicada pero action vieja) | La columna nueva se ignora silenciosamente (action lee `first.coins_earned`, `first.is_new`, etc — no `was_replay`). No regresión durante ese minuto. |

---

## 2️⃣ #12 — Rename `card_pinned` con `action='unpin'` → `card_unpinned`

### Root cause confirmado

[`src/features/album/actions.ts:52`](../src/features/album/actions.ts) y [`:78`](../src/features/album/actions.ts) — ambas actions emiten el **mismo nombre de evento** (`card_pinned`) y se distinguen sólo por la prop `action`. Esto exactamente como dice el issue.

Side effect en PostHog: funnels que cuentan "users que pinnearon" suman pins + unpins por default a menos que el query agregue `WHERE properties.action = 'pin'`. Mismo problema para cohorts.

### Decisión sobre historicidad

Query a PostHog (2026-05-29 03:17 UTC) — `SELECT properties.action, count() FROM events WHERE event='card_pinned' GROUP BY action`:

| action | count |
|---|---|
| pin | 1 |
| (unpin) | 0 |

Hay **1 evento histórico total**, con `action='pin'`. Como observamos: PR6 mergeó hace 1 día, hubo 1 test E2E, no hay queries guardadas en PostHog (verificado vía grep en repo), no hay dashboards persistidos.

**Decisión**: rename limpio, sin compatibilidad hacia atrás. Sin alias del evento viejo. Sin migration de queries (no hay queries que migrar).

### Diseño del fix

#### 2.1 [`src/features/album/actions.ts`](../src/features/album/actions.ts)

```ts
// ANTES — pinCard (línea 52)
await track('card_pinned', { tier, action: 'pin' }, { distinctId: userId })

// DESPUÉS
await track('card_pinned', { tier }, { distinctId: userId })


// ANTES — unpinCard (línea 78)
await track('card_pinned', { tier, action: 'unpin' }, { distinctId: userId })

// DESPUÉS
await track('card_unpinned', { tier }, { distinctId: userId })
```

#### 2.2 [`docs/implementation-plan-pr6.md`](./implementation-plan-pr6.md) §4 tabla de eventos

Actualizar la fila de `card_pinned` para reflejar el split:

```diff
- | `card_pinned` | `pinCard` + `unpinCard` (...) | `{ tier, action: 'pin'\|'unpin' }` |
+ | `card_pinned`   | `pinCard`   (...) | `{ tier }` |
+ | `card_unpinned` | `unpinCard` (...) | `{ tier }` |
```

> El plan de PR6 es histórico, pero queremos que un agente futuro que lo lea no se confunda. Patch + nota al pie ("renombrado en PR7 #12").

### Acceptance criteria

| AC | Criterio | Cómo se valida |
|---|---|---|
| AC12.1 | `pinCard` emite `card_pinned` con props `{ tier }` (sin `action`) | Test manual: pin desde `/album`, HogQL `SELECT event, properties FROM events WHERE event='card_pinned' ORDER BY timestamp DESC LIMIT 1` → no contiene key `action` |
| AC12.2 | `unpinCard` emite `card_unpinned` con props `{ tier }` | HogQL `SELECT event, properties FROM events WHERE event='card_unpinned' ORDER BY timestamp DESC LIMIT 1` → contiene `tier` y NO contiene `action` |
| AC12.3 | El plan de PR6 refleja el rename | grep en `docs/implementation-plan-pr6.md` por `card_unpinned` → al menos 1 match |
| AC12.4 | TS + lint limpios | `pnpm type-check && pnpm lint` |

### Rollback

Revert del commit. El único side-effect de un rollback parcial sería que algunos eventos quedaron emitidos como `card_unpinned` durante la ventana — convivirían con `card_pinned + action='unpin'` post-rollback. Como no hay queries dependientes en producción, es inerte.

---

## 3️⃣ #11 — Console 404s en navegación

### Root cause confirmado + scope expandido

El issue lista `/about` y `/missions`. Grep completo encontró **6 rutas referenciadas que no existen como pages**:

| Referencia | Archivo | Línea | Ruta inexistente |
|---|---|---|---|
| `<NavLink href="/missions">` | [`src/components/layout/navbar.tsx`](../src/components/layout/navbar.tsx) | 75 | `/missions` |
| `{ href: '/missions', ... }` | [`src/components/layout/mobile-nav.tsx`](../src/components/layout/mobile-nav.tsx) | 28 | `/missions` |
| `<a href="/about">` | [`src/components/layout/footer.tsx`](../src/components/layout/footer.tsx) | 45 | `/about` |
| `<a href="/help">` | [`src/components/layout/footer.tsx`](../src/components/layout/footer.tsx) | 53 | `/help` |
| `<a href="/donate">` | [`src/components/layout/footer.tsx`](../src/components/layout/footer.tsx) | 61 | `/donate` |
| `<a href="/legal">` + `/legal#homenaje` | [`src/components/layout/footer.tsx`](../src/components/layout/footer.tsx) | 77, 85 | `/legal` |
| `<Link href="/about">` | [`src/features/landing/landing.tsx`](../src/features/landing/landing.tsx) | 56 | `/about` |

Verificación de existencia: `pnpm next ...` no hace falta — `Glob src/app/**/{missions,about,help,donate,legal}/**/*.tsx` devolvió 0 matches. Las rutas no existen.

Por qué `/missions` da 404 y no, digamos, `/album`: `<NavLink>` y `<Link>` de Next.js prefetchean el RSC payload de la ruta target on hover/in-viewport. Si la ruta no resuelve, Next devuelve 404 para el endpoint `?_rsc=<token>`. Visualmente invisible (el user no hace click) pero contamina la console y cualquier monitoring.

### Decisión scope (no crear pages stub)

Tres opciones:

| Opción | Costo | Pros | Contras |
|---|---|---|---|
| A. Remover los links | 0.75h | Console limpia ya. Cero deuda. | Footer queda con menos items (estéticamente pelado). |
| B. Crear pages stub ("próximamente") | 2h | UX consistente. | Mantenemos rutas vacías que hay que limpiar después. Y crea expectativa al user que quizás no pensemos cumplir. |
| C. Cambiar `<Link>`/`<a>` por `<button onClick>` no-op | 1h | UI ve igual. | Engaña al user (parecen links activos). Peor UX. |

**Decisión: A — Remover los links**. Razones:
- Pre-launch. Es razonable que el footer/navbar sólo muestre lo que YA funciona.
- Si después decidimos crear `/about` etc., el link vuelve en el mismo PR que la page (acoplado al feature, no a un placeholder).
- Mantenemos `/missions` deshabilitado del navbar pero las **misiones siguen visibles** dentro de `/home` vía `MissionsCard` (ver [`src/features/home/components/missions-card.tsx`](../src/features/home/components/missions-card.tsx)). No perdemos discoverability — sólo el shortcut.

### Diseño del fix

#### 3.1 [`src/components/layout/navbar.tsx`](../src/components/layout/navbar.tsx)

```diff
  <nav className="hidden md:flex items-center gap-1 ml-6">
    <NavLink href="/">Inicio</NavLink>
    <NavLink href="/album">Álbum</NavLink>
-   <NavLink href="/missions">Misiones</NavLink>
  </nav>
```

#### 3.2 [`src/components/layout/mobile-nav.tsx`](../src/components/layout/mobile-nav.tsx)

```diff
  { href: '/album', label: 'Álbum', icon: LayoutGridIcon },
- { href: '/missions', label: 'Misiones', icon: TargetIcon },
  ] as const
```

#### 3.3 [`src/components/layout/footer.tsx`](../src/components/layout/footer.tsx) — colapsar la sección "Producto" + "Legal"

```diff
  <div>
    <h4>Producto</h4>
    <ul>
-     <li><a href="/about">Conocé el proyecto</a></li>
-     <li><a href="/help">Ayuda</a></li>
-     <li><a href="/donate">Donar a fundación</a></li>
+     {/* Footer items disabled hasta que existan las pages — ver PR7 #11. */}
    </ul>
  </div>

  <div>
    <h4>Legal</h4>
    <ul>
-     <li><a href="/legal">Términos y privacidad</a></li>
-     <li><a href="/legal#homenaje">Sobre el homenaje</a></li>
    </ul>
  </div>
```

> **Alternativa simétrica**: borrar completamente las dos `<div>` de "Producto" y "Legal" y dejar el footer con solo el branding + tagline. Más limpio visualmente pero requiere ajuste de layout (`grid-cols-3` → `grid-cols-1`). Si el footer se ve raro semi-vacío, ir por esta. **Decidir en el PR mirando el resultado en dev local.**

#### 3.4 [`src/features/landing/landing.tsx:55-57`](../src/features/landing/landing.tsx)

```diff
- <Button variant="ghost" size="lg" asChild>
-   <Link href="/about">Conocé el proyecto</Link>
- </Button>
```

En la landing es un CTA secundario debajo del CTA principal. Removerlo no rompe la jerarquía visual — el principal (`Empezar a coleccionar`) queda solo, más limpio.

### Acceptance criteria

| AC | Criterio | Cómo se valida |
|---|---|---|
| AC11.1 | Console limpia en `/home` al primer load | DevTools → Network → reload → 0 requests con status 404 a `*?_rsc=*` |
| AC11.2 | Console limpia en `/album`, `/`, `/u/[username]` | Mismo check en las otras pages clave |
| AC11.3 | Navegación válida funciona | Click manual en logo (→ `/`), Álbum, Inicio funciona. Footer items que quedan (si quedan) son clickables. |
| AC11.4 | Mobile nav no muestra el item de Misiones | Resize a <md, abrir drawer/burger → solo home + álbum |
| AC11.5 | TS + lint limpios | `pnpm type-check && pnpm lint` |

### Rollback

Revert del commit. Los `<Link>` vuelven a tirar 404 de prefetch — estado pre-PR7.

---

## 🔀 Decisión de ordering: 3 PRs separados

**Recomiendo 3 PRs independientes, mergeados en este orden**:

1. **PR-followup-10** (#10 — `pack_opened` doble) — **primero, alta prioridad**
2. **PR-followup-12** (#12 — `card_unpinned` rename) — **segundo, quick clean**
3. **PR-followup-11** (#11 — links rotos) — **tercero, polish**

### Por qué separados (no un PR combinado)

| Criterio | #10 | #12 | #11 |
|---|---|---|---|
| Tipo de cambio | SQL migration + TS | TS + docs | TSX only |
| Surface de revisión | RPC + action + types | 2 líneas TS + tabla docs | 4 archivos de layout |
| Apply order requirement | Migration **antes** de mergear TS | Una sola atómica | Una sola atómica |
| Riesgo si rompe | Funnel principal (pack_opened) | Funnel de pinning | Nada (cosmético) |
| Reverters | Migration + revert TS | Revert TS | Revert TSX |

Tres revisores naturalmente distintos (uno mira SQL, otro mira analytics naming, otro mira layout). Combinarlos da diff ruidoso, scope mezclado, y si uno tiene un problema bloquea los otros dos.

PR6 ya estableció el patrón en Cromiks (PR#7, #8, #9 fueron followups separados — ver [tabla en PR6 plan](./implementation-plan-pr6.md#L644-L650)).

### Por qué este orden

- **#10 primero**: prioridad alta + AC3 de PR6 quedó "cerrado con asterisco" por este bug + es el funnel principal (pack_opened es el evento más importante del producto). Resolverlo desbloquea cualquier análisis serio del funnel.
- **#12 segundo**: dependencia cero con #10, pero querés mergear antes de #11 porque #12 toca eventos (PostHog data) y #11 no toca nada que se observe en analytics. Si algo del #12 rompe la build, lo querés ver aislado del cleanup cosmético.
- **#11 último**: cero dependencias, riesgo cero, polish puro. Es el "PR de cierre" antes de empezar la próxima feature.

Cada PR contra `main`, branch nombrado `fix/pr7-issue-{10|11|12}-<slug>`. Squash al merge.

---

## ⚠️ Riesgos cross-cutting

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Aplicar la migration de #10 pero olvidar commitear el archivo en `supabase/migrations/` | Media | Drift entre prod y repo; futuro `db reset` rompe | Patrón de PR#9 explícito en §1.3. Después de `apply_migration`, validar con `mcp__supabase__list_migrations` que el nombre del archivo coincide exactamente con el del repo |
| Cambios concurrentes a `actions.ts` por otras ramas | Baja | Merge conflict | Trabajar los 3 PRs en serie no en paralelo. `git fetch` antes de cada branch |
| Tests E2E rotos por el rename de #12 | Baja | CI rojo | Grep el repo entero por el string `card_pinned` (hecho — sólo aparece en `src/features/album/actions.ts` y docs). Cero matches en `tests/` |
| Side effect en `_on_user_card_pinned` trigger (DB) | Baja | El trigger se llama `_on_user_card_pinned` pero NO depende del nombre del evento de PostHog | Verificado: el trigger es de DB (`user_cards.is_pinned` change) y NO tiene relación con el evento `card_pinned`/`card_unpinned` de analytics |
| #10 introduce regresión silenciosa (deja de emitir pack_opened cuando debería emitir) | Media | Funnel ciego | AC10.3 + AC10.5 cubren los dos casos críticos. Hacer la validación en el mismo turno que el deploy de prod |

---

## 📝 Open questions

1. **Migration filename de #10**: el último timestamp usado fue `20260527120000_make_open_pack_idempotent`. Hoy es 2026-05-29. Sugerencia: `2026052914_open_pack_explicit_was_replay.sql`. ¿Hay convention strict en Cromiks sobre HHMMSS? PR6 usó hora arbitraria; si querés alinear con el horario de aplicación real, lo ajustamos en el momento.
2. **Footer post-cleanup** (#11): si remover las dos columnas deja el footer feo, prefieren (a) borrar las columnas y reduce a 1, (b) reemplazar con un placeholder "Más info próximamente", o (c) crear `/about` con una página minimal? Default del plan: (a) decidir mirando dev local.
3. **PR6 plan amendment** (#12): ¿agrego nota inline al PR6 plan diciendo "rename ocurrido en PR7 #12", o sólo edito la tabla §4 in-place? Mi default: edito in-place + nota breve al final de la sección AC3 del validation block.
