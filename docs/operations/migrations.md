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

⚠️ **No hay migration `00000000000000_initial_schema.sql`**. El schema base (tablas, enums, RLS inicial) vive solo en Supabase Studio. Pendiente: hacer dump y guardarlo para reproducibilidad completa.

---

## Cómo aplicar una migration

### Opción 1: Supabase Studio (la que usamos hoy)

1. Abrí [Supabase Studio](https://supabase.com/dashboard/project/oaussuztahdxivemqbnd) → **SQL Editor**
2. New query
3. Pegá el contenido del archivo `.sql`
4. Run (`Ctrl+Enter`)
5. Esperá "Success. No rows returned" o el resultado esperado

### Opción 2: Supabase CLI (no implementado todavía)

🚧 Pendiente: configurar `supabase` CLI con `pnpm supabase db push` para aplicar la carpeta `migrations/` automáticamente.

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

1. Crear un branch en Supabase (feature opcional, pagada)
2. Aplicar la migration ahí
3. Probar
4. Si funciona → aplicar en main

Si no tenés branching, hacé backup del schema antes (Studio → Database → Backups).

---

## Pendientes operacionales

| | |
|---|---|
| 🚧 | Dump del schema inicial → `00000000000000_initial_schema.sql` |
| 🚧 | Configurar Supabase CLI (`pnpm supabase`) para apply automatizado |
| 🚧 | CI que valide que las migrations son idempotentes (`DROP IF EXISTS` + `CREATE`) |
| 🚧 | Script `pnpm db:status` que muestre qué migrations están aplicadas y cuáles faltan |

---

## Referencias

- [`../04-database.md`](../04-database.md) — Schema general
- [`../05-sql-functions.md`](../05-sql-functions.md) — Detalle de cada function/trigger
- [`./seeding.md`](./seeding.md) — Cómo popular la DB después de aplicar el schema
