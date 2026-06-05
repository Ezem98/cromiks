# Migraciones archivadas (squash → baseline)

Estas 18 migraciones incrementales fueron **consolidadas** en
`../migrations/00000000000000_baseline.sql` el **2026-06-05**.

## Por qué

El repo no tenía un baseline: el schema base (tablas, RPCs, `tg_handle_new_user`,
RLS) se creó fuera de migraciones (dashboard de Supabase) y solo estos parches
incrementales estaban versionados. Resultado: `supabase start` / `db reset` desde
cero **fallaba** (las incrementales parchean un schema que no existe) → el repo no
podía recrear su propia DB (bloqueaba el e2e local de T-16 y disaster-recovery).

## Qué es el baseline

Un `supabase db dump` del schema de prod (`oaussuztahdxivemqbnd`, estado **posterior**
a estas 18) + el `CREATE TRIGGER on_auth_user_created` en `auth.users` agregado a mano
(porque `db dump` no captura el schema `auth`, que es managed). Representa exactamente
el estado actual de prod.

## Por qué se archivan en vez de borrarse

No se ejecutan (el CLI solo corre `supabase/migrations/*.sql`). Se conservan acá como
referencia del *por qué* de cada cambio (los mensajes de commit del squash y de cada
migración original siguen en git). Correrlas DESPUÉS del baseline rompería cosas: varias
hacen `DROP FUNCTION` + recrean versiones **intermedias** de `open_pack`/`roll_cards`
que el baseline ya tiene en su forma final.

## ⚠️ Paso pendiente en PROD al mergear

Prod ya tiene estas 18 en su `supabase_migrations.schema_migrations`. Tras mergear el
baseline hay que **alinear el historial** para que un `supabase db push` futuro no se
confunda. `supabase migration repair` **NO ejecuta SQL** — solo actualiza el bookkeeping:

```bash
# marcar las 18 viejas como revertidas (ya no están en el repo)
supabase migration repair --status reverted 20260526120000 20260526130000 \
  20260526140000 20260526150000 20260526160000 20260527100000 20260527120000 \
  20260527130000 20260529030000 20260529125447 20260529140000 20260530120000 \
  20260530120100 20260530120200 20260531120000 20260601120000 20260602183702 \
  20260604222239
# marcar el baseline como aplicado (prod YA tiene ese schema, no re-ejecutar)
supabase migration repair --status applied 00000000000000
```

Verificar con `supabase migration list` que local y remoto quedan alineados.
