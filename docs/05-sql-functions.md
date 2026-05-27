# 05 · SQL Functions y Triggers

Todas las RPCs (`supabase.rpc(...)`) y triggers que tiene el proyecto. Cada una con su contrato, errores posibles, y la migration que la creó.

---

## Functions RPC (llamadas desde server actions)

### `claim_daily_pack()` (existía antes)
Llamada desde `features/home/actions.ts → claimDailyPack`. Genera el sobre diario si el user puede reclamarlo.

| Output | Tipo |
|---|---|
| `pack_id` | uuid |

| Errores | Significado |
|---|---|
| `already_claimed_today` | Ya reclamó hoy |
| `streak_not_initialized` | El user no tiene row en `streaks` |

---

### `open_pack(p_pack_id uuid)` (modificada — migration 120000)

Sortea cromos del álbum + asigna a `user_cards` + marca pack como opened + suma monedas por repetidas. Es el corazón del flow de apertura.

**Output columns** (con prefijo `out_` para evitar ambigüedad):
```
out_card_id text
card_name text
card_role text
out_card_number integer
card_tier card_rarity
image_url text
is_new boolean
copies_after integer
coin_reward integer
pack_type pack_type
coins_earned integer
coins_after integer
```

| Errores | Significado |
|---|---|
| `auth_required` | No hay user logueado |
| `pack_not_found` | El pack no existe o no es del user |
| `pack_not_pending` | Ya abierto / expirado |
| `pack_expired` | Pasó `expires_at` |

**Por qué `out_` prefix**: el `RETURNS TABLE(card_id text, ...)` declaraba output columns con el mismo nombre que columnas reales (`user_cards.card_id`, `cards.card_number`), causando "ambiguous column reference" en el body. Ver migration `20260526120000`.

Llamada desde `features/pack-opening/actions.ts → openPack`.

---

### `pin_card(p_card_id text)` y `unpin_card(p_card_id text)`

Toggle del flag `user_cards.is_pinned` para el cromo del user logueado.

**No retornan data útil** (solo OK / error). Errores: `not_owned`.

El `pin_card` dispara el trigger `trg_advance_pin_card` que avanza misiones de tipo `pin_card`.

Llamadas desde `features/album/actions.ts → pinCard, unpinCard`.

---

### `dismantle_card(p_card_id text, p_count int)`

Canjea N copias duplicadas por monedas.

**Output**:
```
coins_earned integer
copies_left integer
new_balance integer
```

| Errores | Significado |
|---|---|
| `not_owned` | El user no tiene la carta |
| `no_extra_copies` | Solo tiene 1 copia (la primaria se mantiene) |
| `not_dismantleable` | Tier no permite canjear (legendaries) |
| `insufficient_copies` | Pidió más copias de las que tiene como extras |

Coin rewards por tier (matchea `_coin_reward_for_rarity`):
- common = 1
- uncommon = 3
- rare = 8
- epic = 20
- legendary = 0 (no canjeable)

Llamada desde `features/album/actions.ts → dismantleCard`.

---

### `claim_mission(p_user_mission_id uuid)` (migration 130000)

Reclama el reward de una `user_mission` con status `completed`. Aplica `reward_coins` + crea `pack` si `reward_pack_type` está definido + marca como `claimed`.

**Output columns** (con prefijo `out_`):
```
out_coins_earned integer
out_pack_id uuid
out_cards_earned integer
out_new_balance integer
```

| Errores | Significado |
|---|---|
| `auth_required` | No hay user logueado |
| `mission_not_found` | La misión no existe o no es del user |
| `mission_not_completed` | Status ≠ completed (puede ser active, expired, claimed) |
| `template_not_found` | Data corrupta — el mission_template referenciado no existe |

Llamada desde `features/missions/actions.ts → claimMission`.

---

### `_advance_missions(p_user_id, p_type, p_increment, p_context)` (migration 140000)

⚠️ **Privada** (prefijo `_`). Llamada solo desde otros triggers, no desde el cliente.

Recorre todas las `user_missions` activas del user con el `type` dado, valida filtros de `config`, y avanza `progress`. Si llega al target, marca `completed` y setea `completed_at`.

**Filtros soportados** (vía `mt.config` del template):
- `only_new` (bool) — solo avanza si `p_context.is_new = true`
- `min_rarity` (string) — solo avanza si `p_context.rarity >= min_rarity` (orden: common < uncommon < rare < epic < legendary)

**Sin filtros** → avanza siempre que matchee el `type`.

---

## Triggers

Todos creados en migrations `20260526140000` y `20260526150000`. Activos en Postgres.

### `trg_advance_open_pack`
```sql
AFTER UPDATE OF status ON packs
FOR EACH ROW
WHEN (OLD.status = 'pending' AND NEW.status = 'opened')
EXECUTE FUNCTION _on_pack_opened();
```
→ Llama `_advance_missions(user, 'open_pack', 1, {})` cuando un sobre se abre.

**Avanza**:
- `open_1_pack`, `open_3_packs` (sin filtro `only_new`)

**NO avanza**: misiones con `only_new = true`. Esas las maneja el trigger de `user_cards INSERT`.

---

### `trg_advance_collect_rarity`
```sql
AFTER INSERT ON user_cards
FOR EACH ROW
EXECUTE FUNCTION _on_user_card_inserted();
```
→ Fetchea la `rarity` de la card, llama `_advance_missions(user, 'collect_rarity', 1, {rarity, is_new: true})`.

**Avanza**:
- `collect_rare` (`min_rarity: rare`, `only_new: true`)
- `new_5_cards` (reconfigurada en migration 140000 a `type: collect_rarity`, sin `min_rarity`, `only_new: true`)

---

### `trg_advance_pin_card`
```sql
AFTER UPDATE OF is_pinned ON user_cards
FOR EACH ROW
WHEN (OLD.is_pinned IS DISTINCT FROM true AND NEW.is_pinned IS true)
EXECUTE FUNCTION _on_user_card_pinned();
```
→ Solo cuando `is_pinned` pasa de false (o null) a true. Llama `_advance_missions(user, 'pin_card', 1, {})`.

**Avanza**:
- `pin_card`

---

### `trg_advance_share_card` (migration 150000)
```sql
AFTER INSERT ON share_events
FOR EACH ROW
EXECUTE FUNCTION _on_share_event_inserted();
```
→ Llama `_advance_missions(user, 'share_card', 1, {channel})`.

**Avanza**:
- `share_card` (re-habilitada en pool diario en esta migration)

---

## Triggers pendientes (no implementados)

| Mission type | Por qué pendiente | Notas |
|---|---|---|
| `complete_page` | Lógica más compleja | Necesita query con `not exists` después de cada `user_cards INSERT` para detectar si la página entera está owned |
| `login_streak` | TBD | Trigger sobre `streaks.current_streak` UPDATE |

Ver [`features/e2-missions.md`](./features/e2-missions.md) para roadmap.

---

## Helper functions (existentes desde antes)

### `_coin_reward_for_rarity(rarity card_rarity) → int`
Mapping de tier → monedas al canjear/repetir.

### `roll_cards(album_id text, count int) → text[]`
Sortea N cromos del álbum con weighted random por rarity. Usado dentro de `open_pack`.

---

## GRANTs

Convenciones:
- Functions llamables por user logueado: `GRANT EXECUTE ON FUNCTION ... TO authenticated`
- Functions internas (`_advance_missions`, `_on_*`): igual `authenticated` por seguridad pero solo se invocan desde triggers
- ⚠️ Después de `DROP FUNCTION` + `CREATE FUNCTION`, los grants se resetean. Hay que re-aplicarlos.

---

## Pattern de error en SQL functions

Usamos `RAISE EXCEPTION 'codigo_legible' USING errcode = 'P0001'` para errores controlados. En TS los mapeamos con `error.message.includes('codigo_legible')`.

Ejemplo:
```sql
if v_mission.status != 'completed' then
  raise exception 'mission_not_completed' using errcode = 'P0001';
end if;
```

```ts
if (error.message.includes('mission_not_completed')) {
  return { ok: false, error: 'mission_not_completed' }
}
```

---

## Referencias

- [`04-database.md`](./04-database.md) — Tablas y schema
- [`operations/migrations.md`](./operations/migrations.md) — Orden y aplicación de migrations
- [`features/e2-missions.md`](./features/e2-missions.md) — Cómo las misiones consumen estos triggers
