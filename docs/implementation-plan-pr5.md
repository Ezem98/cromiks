# 🛠️ Plan PR5 · Idempotencia de RPCs + error codes alineados + smoke ampliado

> Una vez aprobado, este documento se copia a [`docs/implementation-plan-pr5.md`](../../Documents/cromiks/docs/implementation-plan-pr5.md). Snapshot: 2026-05-27.

---

## Context

Post-PR4 quedaron dos bugs documentados en la sección **"Hallazgos durante PR4"** de [`docs/implementation-plan-prelaunch.md`](../../Documents/cromiks/docs/implementation-plan-prelaunch.md):

- **B-22 🔴**: [`src/app/(focus)/open/[packId]/page.tsx:74`](../../Documents/cromiks/src/app/(focus)/open/[packId]/page.tsx#L74) llama `await openPack({ packId })` dentro del render de un Server Component. Prefetch automático de Next 16 + render de la respuesta real ejecutan la mutación dos veces; la segunda falla con `pack_not_pending` (porque la primera ya marcó `status='opened'`). El usuario termina en `/?error=open_failed` aunque el sobre se haya abierto. Bug prod-impactante: cualquier `router.push`, navegación back/forward o prefetch lo dispara.
- **B-23 🟡**: [`src/features/pack-opening/actions.ts:27`](../../Documents/cromiks/src/features/pack-opening/actions.ts#L27) declara `KNOWN_OPEN_PACK_CODES = ['not_found', 'already_opened', 'not_owner']` pero el RPC SQL en [`supabase/migrations/20260526120000_fix_open_pack_ambiguous_column.sql`](../../Documents/cromiks/supabase/migrations/20260526120000_fix_open_pack_ambiguous_column.sql) tira `['auth_required', 'pack_not_found', 'pack_not_pending', 'pack_expired']`. Todo error esperado cae a `code: 'unknown'` y se reporta a Sentry como warning siendo business logic.

Como workaround, [`tests/e2e/global-setup.ts:88-114`](../../Documents/cromiks/tests/e2e/global-setup.ts#L88-L114) pre-siembra 3 `user_cards` vía admin SDK y [`tests/e2e/smoke.spec.ts`](../../Documents/cromiks/tests/e2e/smoke.spec.ts) sólo valida `auth → /home → /album → cromo owned`. **No** valida el flow real de pack-opening.

**Outcome esperado de PR5**: B-22 fixeado de raíz a nivel SQL (idempotencia), B-23 fixeado a nivel TS + copy ES, smoke recupera el golden path completo `home → reclamar/abrir sobre → /album con cromo nuevo`. Pre-seed eliminado.

---

## 📊 Tabla resumen

| # | Item | Decisión | Esfuerzo (h) | Archivos clave |
|---|---|---|---|---|
| 1 | Idempotencia de `open_pack` (B-22) | RPC idempotente vía `UPDATE … WHERE status='pending'` + replay path | 3-4 | `supabase/migrations/20260527*_make_open_pack_idempotent.sql` |
| 2 | Auditar las otras 3 RPCs y versionar las missing | Dumpear `claim_daily_pack` y `dismantle_card` del remoto, revisar las 4 | 2-3 | `supabase/migrations/20260527*_snapshot_existing_rpcs.sql` (+ migrations idempotentes si aplican) |
| 3 | Alinear error codes (B-23) | Match exacto con los del RPC + copy ES | 0.5 | `src/features/pack-opening/actions.ts`, `src/lib/errors.ts` |
| 4 | Smoke ampliado (golden path real) | Click "Saltar animación", quitar pre-seed | 2-3 | `tests/e2e/smoke.spec.ts`, `tests/e2e/global-setup.ts` |
| 5 | Smoke secundario (UI sin DB) | `?debug=true` en NODE_ENV=development | 0.5 | `tests/e2e/smoke.spec.ts` (extra `test`) |
| **Total** | | | **~8-11 h** | |

---

## 1️⃣ Fix B-22 · `open_pack` idempotente

### Resumen ejecutivo

**Objetivo**: el RPC `open_pack` puede llamarse N veces para el mismo `pack_id` y siempre devuelve el mismo resultado (cartas asignadas + monedas), sin tirar `pack_not_pending`. Esto inmuniza contra cualquier pattern de re-invocación (Server Component double-render, prefetch, retry, navegación back/forward).

**Por qué SQL y no Client Component guard**: el fix de raíz protege contra futuros patterns de retry que aún no anticipamos. El `useRef` guard arregla *este* punto de invocación, no la fragilidad de la RPC. Además mantiene el Server Component limpio (await directo) sin convertir media página en `'use client'`.

**Cómo funciona la idempotencia**: un solo `UPDATE … WHERE status='pending'` atómico hace de barrera. Si devuelve filas, es la "primera vez" y corre el upsert de cartas + coins. Si devuelve 0 filas, leemos el pack actual:
- Status `opened` → replay path: reconstruir respuesta desde `rolled_card_ids` (ya persistidos), `is_new=false` y `coins_earned=0` para esta llamada (las monedas reales ya están en el balance del user).
- Pack no existe / no es del user → `pack_not_found`.
- Status `expired` → `pack_expired`.

### Decisiones tomadas

- ✅ **SQL idempotente** (decisión del usuario).
- ✅ No persistir `coins_earned` en `packs` (overengineer para el MVP). En el replay se devuelve `coins_earned=0`. El balance real del user es correcto porque sólo se actualiza en el path "primera vez". Tradeoff: si el browser muestra el summary del replay verá "+0 monedas" — aceptable porque las monedas ya están acreditadas y el caso es raro (prefetch+render del mismo URL).
- ✅ Nueva migration, no editar la previa (convención: ver [`docs/02-architecture.md`](../../Documents/cromiks/docs/02-architecture.md)).
- ✅ Mantener exactamente los mismos error codes (`auth_required`, `pack_not_found`, `pack_not_pending`, `pack_expired`). `pack_not_pending` queda como código vivo sólo para el caso donde el pack está en un estado *distinto a `opened` o `expired`* (defensivo).

### Pasos

#### 1.1 Crear la migration

```bash
# Timestamp del momento (today = 2026-05-27); ajustar segundos
touch supabase/migrations/20260527120000_make_open_pack_idempotent.sql
```

**Archivo nuevo**: `supabase/migrations/20260527120000_make_open_pack_idempotent.sql`

```sql
-- =============================================================================
-- B-22: hacer open_pack idempotente
-- =============================================================================
-- Problema: el Server Component (focus)/open/[packId]/page.tsx puede ejecutar
-- openPack dos veces en una misma navegación (prefetch + render). La segunda
-- corrida ve packs.status='opened' y tira pack_not_pending → user redirigido a
-- /?error=open_failed aunque el sobre esté abierto.
--
-- Solución: convertir el SELECT…FOR UPDATE + check de status en un UPDATE
-- atómico WHERE status='pending'. Si afecta filas, primera vez (correr upsert
-- de cartas + coins). Si NO afecta filas, leer estado actual y decidir:
--   - opened  → replay path (devuelve cartas desde rolled_card_ids, sin re-mutar)
--   - expired → pack_expired
--   - no row  → pack_not_found
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
   coins_after     integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id      uuid;
  v_pack         record;
  v_rolled_ids   text[];
  v_card_id      text;
  v_rarity       card_rarity;
  v_is_new       boolean;
  v_total_earned int := 0;
  v_coins_after  int;
  v_album_id     text := 'eterno-diciembre';
  v_replay       boolean := false;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  -- Sortear cromos (sólo si vamos a abrir realmente; cheap eval, lo dejamos
  -- pre-UPDATE para no tener que hacer un branch raro: si el UPDATE falla por
  -- status, descartamos los IDs sorteados — no se persisten en ningún lado).
  -- Lo sorteamos primero porque el UPDATE necesita los IDs en el SET.
  v_rolled_ids := public.roll_cards(v_album_id, (
    select card_count from public.packs where id = p_pack_id and user_id = v_user_id
  ));

  -- UPDATE atómico: solo afecta si el pack está pending. Devuelve la row si
  -- es la "primera vez". Si ya estaba opened, no afecta filas → vamos al
  -- replay path abajo.
  update public.packs
  set
    status = 'opened',
    rolled_card_ids = v_rolled_ids,
    opened_at = now()
  where id = p_pack_id
    and user_id = v_user_id
    and status = 'pending'
  returning * into v_pack;

  if not found then
    -- Diagnóstico: leer estado actual del pack para distinguir casos.
    select * into v_pack
    from public.packs
    where id = p_pack_id and user_id = v_user_id;

    if not found then
      raise exception 'pack_not_found' using errcode = 'P0001';
    end if;

    -- Expirado real: chequeo antes de declarar replay
    if v_pack.expires_at is not null and v_pack.expires_at < now() and v_pack.status != 'opened' then
      update public.packs set status = 'expired' where id = p_pack_id;
      raise exception 'pack_expired' using errcode = 'P0001';
    end if;

    if v_pack.status = 'opened' then
      -- ===== REPLAY PATH =====
      -- El pack ya fue abierto. No re-mutamos nada. Devolvemos las cartas
      -- desde el rolled_card_ids persistido. is_new y coins_earned son
      -- "estado actual" (no del momento de la apertura): por construcción
      -- v_total_earned = 0 en este path (no entramos al for-loop).
      v_replay := true;
      v_rolled_ids := v_pack.rolled_card_ids;
    elsif v_pack.status = 'expired' then
      raise exception 'pack_expired' using errcode = 'P0001';
    else
      -- Estados desconocidos: defensivo, mantenemos el código existente
      raise exception 'pack_not_pending' using errcode = 'P0001';
    end if;
  end if;

  -- Path "primera vez": upsert al inventario y acumular monedas
  if not v_replay then
    for v_card_id in select unnest(v_rolled_ids) loop
      select c.rarity into v_rarity from public.cards c where c.id = v_card_id;

      insert into public.user_cards (user_id, card_id, copies, first_obtained_at, last_obtained_at)
      values (v_user_id, v_card_id, 1, now(), now())
      on conflict (user_id, card_id) do update
      set copies = public.user_cards.copies + 1,
          last_obtained_at = now()
      returning (xmax = 0) into v_is_new;

      if not v_is_new then
        v_total_earned := v_total_earned + public._coin_reward_for_rarity(v_rarity);
      end if;
    end loop;

    if v_total_earned > 0 then
      insert into public.user_coins (user_id, balance, lifetime_earned)
      values (v_user_id, v_total_earned, v_total_earned)
      on conflict (user_id) do update
      set balance = public.user_coins.balance + v_total_earned,
          lifetime_earned = public.user_coins.lifetime_earned + v_total_earned,
          updated_at = now()
      returning public.user_coins.balance into v_coins_after;
    else
      select coalesce(uc.balance, 0) into v_coins_after
      from public.user_coins uc where uc.user_id = v_user_id;
      v_coins_after := coalesce(v_coins_after, 0);
    end if;
  else
    -- replay: balance actual, sin cambios
    select coalesce(uc.balance, 0) into v_coins_after
    from public.user_coins uc where uc.user_id = v_user_id;
    v_coins_after := coalesce(v_coins_after, 0);
  end if;

  -- Return query (idéntica a la versión previa)
  return query
  with rolled as (
    select unnest(v_rolled_ids) as cid, generate_subscripts(v_rolled_ids, 1) as ord
  )
  select
    c.id::text                                                     as out_card_id,
    c.name::text                                                   as card_name,
    case
      when coalesce(c.metadata->>'position','') != '' and coalesce(c.metadata->>'club','') != ''
        then (c.metadata->>'position') || ' · ' || (c.metadata->>'club')
      when coalesce(c.metadata->>'position','') != '' then c.metadata->>'position'
      when coalesce(c.metadata->>'club','')     != '' then c.metadata->>'club'
      else ''
    end::text                                                      as card_role,
    (c.metadata->>'number')::int                                   as out_card_number,
    c.rarity                                                       as card_tier,
    (case
      when coalesce(c.content->'photo'->>'source','') in ('','TODO') then null
      else c.content->'photo'->>'source'
    end)::text                                                     as image_url,
    (uc.copies = 1)                                                as is_new,
    uc.copies                                                      as copies_after,
    (case when uc.copies = 1 then null
          else public._coin_reward_for_rarity(c.rarity) end)::int  as coin_reward,
    v_pack.type                                                    as pack_type,
    v_total_earned                                                 as coins_earned,
    v_coins_after                                                  as coins_after
  from rolled r
  join public.cards c on c.id = r.cid
  join public.user_cards uc on uc.card_id = c.id and uc.user_id = v_user_id
  order by r.ord;
end;
$function$;
```

> **Nota sobre `roll_cards` antes del UPDATE**: lo movemos arriba para tener `v_rolled_ids` disponible en el `UPDATE … SET rolled_card_ids=`. Si el pack está expired/opened, los IDs sorteados se descartan (no se persisten). `roll_cards` es deterministic-random pero no idempotente — está OK porque sólo se persisten en el path de primera vez.

#### 1.2 Aplicar y regenerar tipos

```bash
# Aplicar la migration al proyecto remoto (Supabase CLI)
pnpx supabase db push

# Regenerar types
pnpm db:types
```

#### 1.3 Verificación

Manual end-to-end:

```bash
# 1. Local: reclamar daily pack → abrir → ver cromo en álbum
pnpm dev
# (en otra terminal) abrir devtools y forzar doble llamada:
#   await fetch(window.location, { headers: { rsc: '1' } })
#   await fetch(window.location, { headers: { rsc: '1' } })
# Ambas responses deben tener cards[] poblada, no error.

# 2. Test SQL directo (Supabase Studio o psql)
select * from open_pack('<uuid-de-pack-pending>');  -- abre el pack
select * from open_pack('<mismo-uuid>');             -- replay, devuelve mismas cartas
select * from open_pack('<uuid-inexistente>');       -- pack_not_found
```

### Rollback sin downtime

Si la migration rompe algo en producción, el rollback es **una migration nueva** que restaura la versión previa: `cp supabase/migrations/20260526120000_fix_open_pack_ambiguous_column.sql supabase/migrations/20260527130000_revert_open_pack_idempotent.sql` y aplicar. `DROP FUNCTION IF EXISTS public.open_pack(uuid)` al principio de cada migration garantiza la sustitución limpia. Sin downtime — la función se reemplaza atómicamente.

---

## 2️⃣ Auditar las otras 3 RPCs

### Resumen ejecutivo

**Objetivo**: snapshotear en migrations las RPCs `claim_daily_pack` y `dismantle_card` (que NO están versionadas — viven en el proyecto remoto directamente) y revisar si tienen el mismo anti-pattern. `claim_mission` sí está versionada en [`supabase/migrations/20260526130000_add_claim_mission.sql`](../../Documents/cromiks/supabase/migrations/20260526130000_add_claim_mission.sql).

**Decisión del usuario**: dump + audit de las 4, agregar migrations idempotentes para las que tengan el anti-pattern.

### Pasos

#### 2.1 Dumpear definiciones del remoto

```bash
# Conectado al proyecto remoto via supabase CLI
pnpx supabase db dump --schema public --data-only=false \
  --file /tmp/cromiks-schema-dump.sql

# Alternativa más targeted: extraer sólo las funciones específicas
psql "$DATABASE_URL" -At <<'SQL' > /tmp/cromiks-rpc-dump.sql
select pg_get_functiondef(p.oid) || ';'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('claim_daily_pack', 'dismantle_card');
SQL
```

> Si no hay acceso directo via psql, usar **Supabase Studio → Database → Functions**, abrir cada función y copiar el `CREATE OR REPLACE FUNCTION ...` al portapapeles.

#### 2.2 Versionar el estado actual (sin cambios funcionales)

**Archivo nuevo**: `supabase/migrations/20260527100000_snapshot_existing_rpcs.sql`

Pegar los `CREATE OR REPLACE FUNCTION` exactos (con `DROP FUNCTION IF EXISTS` al inicio de cada uno si cambian el `RETURNS TABLE`). Es un no-op funcional pero formaliza el estado.

```sql
-- Snapshot inicial de RPCs que existían sólo en el proyecto remoto.
-- A partir de acá quedan versionadas. Sin cambios funcionales en este archivo.

DROP FUNCTION IF EXISTS public.claim_daily_pack();
CREATE OR REPLACE FUNCTION public.claim_daily_pack() ...
-- (pegar contenido del dump)

DROP FUNCTION IF EXISTS public.dismantle_card(text, integer);  -- ajustar signature
CREATE OR REPLACE FUNCTION public.dismantle_card(...) ...
```

#### 2.3 Auditar el anti-pattern en cada una

Revisar cada función dumpeada por el pattern peligroso:
- `SELECT … FOR UPDATE` seguido de `if status != 'X' then raise` (frágil ante replay)
- Mutaciones efectivas (INSERT/UPDATE side-effecting) que se disparan ANTES del check de estado terminal

**Hipótesis previa** (verificar contra el dump):
- `claim_mission` ([migration ya versionada](../../Documents/cromiks/supabase/migrations/20260526130000_add_claim_mission.sql)): usa `FOR UPDATE` + status='completed' check. **Bajo riesgo de replay** porque sólo se dispara desde un click explícito (no desde un Server Component render). Marcar como "auditado, no requiere migration adicional" salvo que el audit revele algo.
- `claim_daily_pack`: probablemente check de `last_claimed_at` o similar. Riesgo medio (click manual, no render).
- `dismantle_card`: muy probable patrón `SELECT copies … FOR UPDATE` + check + decrement. Bajo riesgo de replay (también click manual).

**Criterio para decidir migration nueva**: sólo si la RPC se invoca desde un Server Component o si el cliente tiene retry automático. Si es click-only desde Client Component con disabled-state, **no migrar**. Documentar la decisión en el body del PR.

#### 2.4 Si alguna requiere fix, migration aparte

Si el audit muestra que (por ejemplo) `claim_daily_pack` tiene el anti-pattern y se invoca desde un sitio frágil, crear migration adicional:

```
supabase/migrations/20260527110000_make_claim_daily_pack_idempotent.sql
```

Aplicando el mismo pattern: `UPDATE … WHERE status='X' RETURNING` + replay path.

#### 2.5 Verificación

```bash
# Después del dump + nueva migration
pnpm db:types
pnpm type-check    # asegurar que el dump no cambia signatures usadas en TS
```

Probar manualmente cada flow afectado: home (claim daily pack), card-detail-dialog (dismantle), mission-card (claim mission).

---

## 3️⃣ Fix B-23 · Alinear error codes y copy

### Resumen ejecutivo

**Objetivo**: que los códigos declarados en `KNOWN_OPEN_PACK_CODES` y `expectedErrors` matcheen exactamente los del RPC. Que `ERROR_COPY` en [`src/lib/errors.ts`](../../Documents/cromiks/src/lib/errors.ts) tenga copy ES para cada uno.

**Esfuerzo**: 30 min.

### Pasos

#### 3.1 Actualizar [`src/features/pack-opening/actions.ts`](../../Documents/cromiks/src/features/pack-opening/actions.ts)

```ts
// Reemplazar el bloque actual (líneas 23-37):

/**
 * Contrato de errores del RPC (match exacto contra `error.message`):
 *  - 'auth_required'      → user sin sesión (no debería pasar; la page filtra antes)
 *  - 'pack_not_found'     → pack no existe o no pertenece al user
 *  - 'pack_not_pending'   → pack en estado desconocido (no opened, no expired)
 *  - 'pack_expired'       → pack venció antes de abrirse
 *
 * Post B-22: el RPC es idempotente → el caso "ya abierto" devuelve ok con
 * las mismas cartas, no es un error. `pack_not_pending` queda como caso
 * defensivo para estados no contemplados.
 */

const KNOWN_OPEN_PACK_CODES = new Set([
  'auth_required',
  'pack_not_found',
  'pack_not_pending',
  'pack_expired',
])

const openPackSchema = z.object({
  packId: z.uuid(),
})

export const openPack = defineAction({
  name: 'openPack',
  schema: openPackSchema,
  rateLimit: 'openPack',
  expectedErrors: [
    'auth_required',
    'pack_not_found',
    'pack_not_pending',
    'pack_expired',
    'empty_result',
  ],
  fn: async ({ packId }, { supabase }) => {
    // ... resto idéntico
  },
})
```

#### 3.2 Actualizar [`src/lib/errors.ts`](../../Documents/cromiks/src/lib/errors.ts)

Agregar los 3 codes faltantes y limpiar los muertos:

```ts
// Pack opening (post-B-22/B-23)
pack_not_found: 'No encontramos ese sobre',
pack_not_pending: 'Este sobre no puede abrirse',
pack_expired: 'Este sobre expiró',
// 'auth_required' ya existe arriba (línea 32)

// Borrar (muertos post-fix; el RPC ya no los emite):
// - not_owner        (ahora plegado en pack_not_found — la RPC filtra por user_id)
// - already_opened   (post-B-22: el replay devuelve ok, ya no es error)
// - not_found        (era el código antiguo; reemplazado por pack_not_found)
```

> **Nota**: revisar con `grep` que `not_owner`, `already_opened` y `not_found` no se referencian en otros features antes de borrar (otros features tienen su propio `not_found` semántico que NO debe tocarse — buscar específicamente en `src/features/pack-opening/`).

#### 3.3 Verificación

```bash
pnpm type-check
pnpm lint

# Manual: simular cada error
# - pack_not_found: openPack({ packId: '<uuid-de-otro-user>' })
# - pack_expired: openPack sobre un pack con expires_at < now()
# (auth_required no es alcanzable desde la UI porque la page redirige antes)
```

---

## 4️⃣ Smoke ampliado · Golden path completo

### Resumen ejecutivo

**Objetivo**: el smoke E2E recorre el flow real `auth → /home → click "abrir sobre" → /open/[id] → skip animación → /album con cromo nuevo`. Valida implícitamente que B-22 está fixeado (sin double-render error) y que B-23 está OK (errores no caen a `unknown`).

**Decisión del usuario**: usar el botón "Saltar animación" como path primario; agregar test secundario con `?debug=true` para validar UI sin DB (en `NODE_ENV=development` solamente).

### Pasos

#### 4.1 Quitar el pre-seed de [`tests/e2e/global-setup.ts`](../../Documents/cromiks/tests/e2e/global-setup.ts)

Borrar el bloque de líneas 88-114 (el comentario "3b) Pre-sembrar 3 cromos…" y el upsert siguiente). El user fresh queda sin `user_cards` — los obtiene a través del flow real.

#### 4.2 Reescribir [`tests/e2e/smoke.spec.ts`](../../Documents/cromiks/tests/e2e/smoke.spec.ts)

```ts
import { expect, test } from '@playwright/test'

/**
 * Smoke E2E · Golden path post-auth.
 *
 * Flow: /home → reclamar daily pack → abrir sobre → saltar animación 3D →
 *       summary → /album con cromo nuevo owned.
 *
 * Valida implícitamente:
 *   - B-22 fix (open_pack idempotente — no redirect a /?error=open_failed)
 *   - B-23 fix (error codes alineados — no warnings de unknown en Sentry)
 *   - Pre-seed de user_cards removido del global-setup
 */
test('smoke: golden path home → open pack → album', async ({ page }) => {
  // 1. Home: el daily-pack-card debe ofrecer reclamar
  await page.goto('/home')
  await expect(page).toHaveURL(/\/home/)

  const claimButton = page.getByRole('button', { name: /reclam[aá]r sobre|abrir sobre/i })
  await expect(claimButton).toBeVisible({ timeout: 10_000 })
  await claimButton.click()

  // 2. Navegamos a /open/[packId]. El Server Component ahora ejecuta openPack
  // y NO debe redirigir a /?error=open_failed (B-22 fix).
  await expect(page).toHaveURL(/\/open\/[\w-]+/, { timeout: 15_000 })

  // 3. Skip animación 3D: el botón con aria-label="Saltar animación" es
  // visible mientras phase ∈ {intro, reveal, outro-pre-summary}.
  const skipButton = page.getByRole('button', { name: /saltar animaci[oó]n/i })
  await expect(skipButton).toBeVisible({ timeout: 15_000 })
  await skipButton.click()

  // 4. Summary: botón para ir al álbum
  const goToAlbum = page.getByRole('button', { name: /ver [aá]lbum|continuar|ir al [aá]lbum/i })
  await expect(goToAlbum).toBeVisible({ timeout: 10_000 })
  await goToAlbum.click()

  // 5. /album con al menos un cromo OBTENIDO (de los recién abiertos)
  await expect(page).toHaveURL(/\/album/, { timeout: 10_000 })
  const ownedSlots = page.locator('button[aria-label*="cromo"]:not([aria-label*="no obtenido"])')
  await expect(ownedSlots.first()).toBeVisible({ timeout: 10_000 })
  expect(await ownedSlots.count()).toBeGreaterThan(0)
})

/**
 * Secundario · UI rendering del flow sin DB.
 *
 * Usa ?debug=true (sólo NODE_ENV=development). Valida que el componente
 * PackOpeningFlow + 3D scene renderea sin errores con mock data. NO valida
 * el RPC ni la idempotencia (eso lo hace el test principal).
 */
test('smoke: pack-opening UI renders en debug mode', async ({ page }) => {
  test.skip(process.env.NODE_ENV !== 'development' && !process.env.PLAYWRIGHT_FORCE_DEBUG_TEST,
    'debug mode sólo activo en NODE_ENV=development')

  // No necesitamos un packId real — debug mode bypassa la validación de DB.
  // Usamos un uuid v4 ficticio.
  await page.goto('/open/00000000-0000-4000-8000-000000000000?debug=true')

  const skipButton = page.getByRole('button', { name: /saltar animaci[oó]n/i })
  await expect(skipButton).toBeVisible({ timeout: 15_000 })
  await skipButton.click()

  // Debe llegar al summary sin errores de cliente
  const goToAlbum = page.getByRole('button', { name: /ver [aá]lbum|continuar/i })
  await expect(goToAlbum).toBeVisible({ timeout: 10_000 })
})
```

#### 4.3 CI: confirmar que `pnpm dev` deja `NODE_ENV=development`

El job e2e en [`.github/workflows/ci.yml`](../../Documents/cromiks/.github/workflows/ci.yml) corre `pnpm dev` como webserver → `NODE_ENV=development` por default. El test secundario corre. Si en el futuro se mueve a `pnpm build && pnpm start`, el test secundario se skipea automáticamente — no hace falta tocar el workflow.

#### 4.4 Verificación

```bash
# Local
pnpm test:e2e                  # ambos tests pasan
pnpm test:e2e:ui               # inspección visual del flow

# CI: el PR debe mostrar check verde en el job `e2e`
```

### Caveats

- **Three.js + R3F en headless Chromium**: funciona out-of-the-box. El GLTF del sobre se descarga (~1-2MB) — el timeout de 15s en `expect(skipButton).toBeVisible` es generoso para la carga. Si el modelo se infla en el futuro, subir el timeout.
- **Selectores por aria-label**: estables porque el botón "Saltar animación" tiene `aria-label="Saltar animación"` literal en [`pack-opening-flow.tsx`](../../Documents/cromiks/src/features/pack-opening/components/pack-opening-flow.tsx). Si se renombra, romperá el test — easy fix.
- **No flakiness conocido**: Playwright config tiene `retries: 2` en CI ([`playwright.config.ts:12`](../../Documents/cromiks/playwright.config.ts#L12)) y `workers: 1` para evitar contención de DB.

### Rollback

Si el smoke ampliado es flaky en CI tras merge, revertir el `smoke.spec.ts` a la versión anterior (sólo navegación + assert de cromo owned) **y** restaurar el pre-seed en `global-setup.ts`. Los fixes de B-22 y B-23 permanecen — son ortogonales.

---

## ✅ Acceptance criteria

Antes de mergear, verificar:

| # | Criterio | Cómo se valida |
|---|---|---|
| 1 | `open_pack` es idempotente | Llamar el RPC dos veces seguidas para el mismo `pack_id` → ambas devuelven cartas (no `pack_not_pending`) |
| 2 | La primera llamada acredita coins, la segunda no | Antes/después de 2 llamadas, `user_coins.balance` cambia sólo en la primera |
| 3 | `pack_not_found`, `pack_expired` siguen tirándose correctamente | Test SQL directo: pack inexistente o expired devuelve excepción esperada |
| 4 | `KNOWN_OPEN_PACK_CODES` matchea con los del RPC | `grep` cruzado entre `actions.ts` y la migration nueva |
| 5 | `ERROR_COPY` tiene copy ES para cada code esperado | `errorCopy('pack_not_pending') !== 'Algo salió mal…'` |
| 6 | Las 3 RPCs adicionales están versionadas | `supabase/migrations/` incluye snapshot de `claim_daily_pack` y `dismantle_card` |
| 7 | Audit de las 4 RPCs documentado en el PR body | Decisión sí/no por cada RPC con justificación |
| 8 | Pre-seed de `user_cards` removido del `global-setup.ts` | Líneas 88-114 borradas |
| 9 | Smoke ampliado pasa en local y CI | `pnpm test:e2e` verde + check verde en PR |
| 10 | Smoke secundario (`?debug=true`) pasa en NODE_ENV=development | Mismo comando, ambos tests |
| 11 | `pnpm db:types` regenerado sin diffs sospechosos | `git diff src/types/database.types.ts` razonable |
| 12 | `pnpm type-check && pnpm lint && pnpm build` pasan | CI |

---

## 🔄 Rollback global

Si todo PR5 explota post-merge:

```bash
# 1. Revert del merge commit (asume squash-merge)
git revert <merge-sha> -m 1

# 2. Forward-fix de la SQL: nueva migration que restaure la versión 20260526120000
cp supabase/migrations/20260526120000_fix_open_pack_ambiguous_column.sql \
   supabase/migrations/20260528000000_revert_to_pre_idempotent.sql
pnpx supabase db push
pnpm db:types

# 3. Restaurar el pre-seed en global-setup.ts si los E2E rompen
```

Tiempo total de rollback: ~10 min, sin downtime (la función SQL se reemplaza atómicamente).

---

## 🔗 Referencias

- [docs/02-architecture.md](../../Documents/cromiks/docs/02-architecture.md) — convenciones de `defineAction`, naming, migrations
- [docs/implementation-plan-prelaunch.md](../../Documents/cromiks/docs/implementation-plan-prelaunch.md) — sección "Hallazgos durante PR4" (B-22, B-23)
- [supabase/migrations/20260526120000_fix_open_pack_ambiguous_column.sql](../../Documents/cromiks/supabase/migrations/20260526120000_fix_open_pack_ambiguous_column.sql) — versión previa del RPC
- [src/features/pack-opening/components/pack-opening-flow.tsx](../../Documents/cromiks/src/features/pack-opening/components/pack-opening-flow.tsx) — botón "Saltar animación"
