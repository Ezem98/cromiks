# Operations · Migrations

Cómo aplicar SQL al schema de Supabase, en qué orden, y cómo verificar que se aplicaron.

---

## Convención

A partir del **26 mayo 2026**, todos los cambios SQL se versionan en `supabase/migrations/`. Naming:

```
YYYYMMDDhhmmss_descripcion_en_snake_case.sql
```

Ejemplo: `20260526140000_add_mission_progress_triggers.sql`

---

## Migrations existentes (orden de aplicación)

| Archivo | Aporta | Orden | Idempotente |
|---|---|---|---|
| `20260526120000_fix_open_pack_ambiguous_column.sql` | Renombra output columns de `open_pack` con prefijo `out_` | 1 | ✅ (DROP + CREATE) |
| `20260526130000_add_claim_mission.sql` | RPC `claim_mission(user_mission_id)` | 2 | ✅ (`CREATE OR REPLACE`) |
| `20260526140000_add_mission_progress_triggers.sql` | `_advance_missions` + 3 triggers (open_pack, collect_rarity, pin_card) + cleanup templates | 3 | ✅ |
| `20260526150000_e3_sharing_trigger.sql` | Tabla `share_events` + trigger `share_card` + re-habilitar template | 4 | ✅ |
| `20260526160000_badges_unlock_triggers.sql` | `_check_and_unlock_badges` + 4 triggers (user_cards, streaks insert/update, share_events) + RLS + backfill | 5 | ✅ |
| `20260527100000_snapshot_existing_rpcs.sql` | Snapshot verbatim de `claim_daily_pack` / `dismantle_card` (vivían solo en Studio) | 6 | ✅ |
| `20260527120000_make_open_pack_idempotent.sql` | `open_pack` idempotente (abrir un pack ya abierto no duplica) | 7 | ✅ |
| `20260527130000_snapshot_pin_unpin_card.sql` | Snapshot verbatim de `pin_card` / `unpin_card` | 8 | ✅ |
| `20260529030000_fix_share_event_trigger_uses_platform.sql` | Fix: el trigger de share usa la columna `platform` | 9 | ✅ |
| `20260529125447_open_pack_explicit_was_replay.sql` | `open_pack` expone explícito `was_replay` | 10 | ✅ |
| `20260529140000_add_waitlist.sql` | Tabla `waitlist` (soft-beta) | 11 | ✅ |
| `20260530120000_snapshot_roll_cards.sql` | Snapshot verbatim de `roll_cards` (vivía solo en Studio) antes de tocarla | 12 | ✅ (DROP + CREATE) |
| `20260530120100_add_pages_is_active.sql` | Columna `pages.is_active boolean NOT NULL DEFAULT false` (gate del pool de la beta) | 13 | ✅ (`ADD COLUMN IF NOT EXISTS`) |
| `20260530120200_roll_cards_beta_weighted_draw.sql` | Reescribe `roll_cards`: filtro `is_active` + draw ponderado por cromo + guard `no_active_cards` | 14 | ✅ (`CREATE OR REPLACE`) |

✅ **Baseline (2026-06-05):** `supabase/migrations/00000000000000_baseline.sql` es ahora un dump
completo del schema de prod (tablas, enums, RLS, funciones, triggers + el `CREATE TRIGGER
on_auth_user_created` en `auth.users`, que `db dump` no captura). Las incrementales de la tabla de
arriba fueron **squasheadas** en él y archivadas en `supabase/_archived_migrations/` (ver su
README). Por eso `supabase start` / `supabase db reset` recrean la DB entera desde cero — el repo
ya es self-contained. **Pendiente al mergear el baseline a prod:** alinear el migration history con
`supabase migration repair` (NO ejecuta SQL; ver el README del archivo).

---

## Cómo aplicar una migration

### En desarrollo local (Supabase CLI + Docker)

El repo ya tiene `supabase/config.toml`, así que el stack local levanta solo:

```bash
pnpx supabase start      # levanta el stack y aplica TODAS las migrations (baseline incl.)
pnpx supabase db reset   # recrea la DB desde cero re-aplicando las migrations + seed.sql
```

Para una migration nueva, agregá el `.sql` a `supabase/migrations/` y corré `db reset`
(o `supabase migration up`). Requiere **Docker Desktop corriendo**.

### A prod

```bash
pnpx supabase db push    # aplica a prod las migrations que falten (según schema_migrations)
```

> Si preferís a mano: Supabase Studio → SQL Editor → pegar el `.sql` → Run. Pero
> registrar la migration en `schema_migrations` queda a tu cargo (mejor usar `db push`).

---

## Después de aplicar SIEMPRE

```bash
pnpm db:types
```

Esto regenera `src/types/database.types.ts` con el schema actual. Si no lo corrés:
- TypeScript no sabe de columnas / funciones nuevas
- Las server actions van a fallar con errores de tipo opacos

---

## Verificación post-aplicación

### Verificar functions
```sql
-- Lista todas las funciones públicas del schema
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

Deberían aparecer:
- `_advance_missions`
- `_coin_reward_for_rarity`
- `_on_pack_opened`
- `_on_share_event_inserted`
- `_on_user_card_inserted`
- `_on_user_card_pinned`
- `claim_daily_pack`
- `claim_mission`
- `dismantle_card`
- `open_pack`
- `pin_card`
- `roll_cards`
- `unpin_card`

### Verificar triggers
```sql
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND trigger_name LIKE 'trg_%'
ORDER BY trigger_name;
```

Deberían aparecer:
- `trg_advance_collect_rarity` on `user_cards` INSERT
- `trg_advance_open_pack` on `packs` UPDATE
- `trg_advance_pin_card` on `user_cards` UPDATE
- `trg_advance_share_card` on `share_events` INSERT

### Verificar que el output type de open_pack está bien
```sql
SELECT pg_get_function_result(oid)
FROM pg_proc
WHERE proname = 'open_pack' AND pronamespace = 'public'::regnamespace;
```

Debería incluir `out_card_id` y `out_card_number`.

---

## Errores comunes al aplicar

### "cannot change return type of existing function"

**Causa**: usaste `CREATE OR REPLACE FUNCTION` pero cambiaste el shape del `RETURNS TABLE`.

**Fix**: agregar `DROP FUNCTION IF EXISTS public.nombre(args);` antes del `CREATE`.

Pasó con la migration 120000 (renombrado de output columns). Ya está corregida.

### "permission denied for function X"

**Causa**: después de un `DROP FUNCTION` + `CREATE FUNCTION`, los GRANTs se resetean.

**Fix**: agregar al final de la migration:
```sql
GRANT EXECUTE ON FUNCTION public.nombre(args) TO authenticated;
```

### "type X does not exist"

**Causa**: el enum (`mission_type`, `pack_type`, etc.) no existe en este schema.

**Fix**: el enum tiene que estar creado antes. Si no existe, es porque el schema base no está aplicado. Hacer un dump del Supabase Studio inicial.

### "column reference X is ambiguous"

**Causa**: una output column de `RETURNS TABLE` colisiona con una columna real de las tablas que usás en el body.

**Fix**: renombrar la output column con prefijo `out_`. Ejemplo: `out_card_id text` en lugar de `card_id text`.

---

## Tip: testear una migration antes de aplicarla en prod

Con el stack local ya no hace falta branching pago: probá la migration contra una DB
idéntica a prod.

```bash
pnpx supabase db reset   # recrea la DB local desde el baseline + migrations
pnpm seed                # popula contra el local (ver env vars en e2e local, abajo)
```

Si aplica limpio y el seed corre, está lista para `db push`.

---

## Desarrollo local + e2e

El e2e (`pnpm test:e2e`) corre contra el **Supabase local**, no contra prod (T-16). Flujo:

```bash
pnpx supabase start      # 1. stack local (aplica el baseline)
# 2. exportar las env del stack a la sesión (o ponerlas en .env.local apuntando al local):
#    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY  ← de `supabase status`
pnpm seed                # 3. popula el álbum (catálogo deja francia con 31 cards published)
pnpm test:e2e            # 4. global-setup activa francia + crea el user; corre el smoke
```

En CI esto lo hace `.github/workflows/ci.yml` (job `e2e`) automáticamente:
`supabase/setup-cli` → `supabase start` → exporta env con `supabase status -o env
--override-name …` → `pnpm seed` → `pnpm test:e2e`. Sin secrets de Supabase de prod.

---

## Pendientes operacionales

| | |
|---|---|
| ✅ | ~~Dump del schema inicial~~ → `00000000000000_baseline.sql` (2026-06-05) |
| ✅ | ~~Configurar Supabase CLI~~ → `config.toml` + `supabase start`/`db push` |
| 🚧 | Alinear el migration history de prod con el baseline (`supabase migration repair`, ver `_archived_migrations/README.md`) |
| 🚧 | CI que valide que las migrations son idempotentes (`DROP IF EXISTS` + `CREATE`) |
| 🚧 | Script `pnpm db:status` que muestre qué migrations están aplicadas y cuáles faltan |

---

## Referencias

- [`../04-database.md`](../04-database.md) — Schema general
- [`../05-sql-functions.md`](../05-sql-functions.md) — Detalle de cada function/trigger
- [`./seeding.md`](./seeding.md) — Cómo popular la DB después de aplicar el schema
