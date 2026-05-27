# Feature · E2 Missions (engagement loop)

Misiones diarias con auto-progress + claim de rewards. Loop principal de retention.

**Estado**: ✅ Sprint 1 (claim) + Sprint 2 (triggers de progress) cerrados.

---

## Flow del usuario

1. User llega al home (`/`)
2. Si no tiene misiones del día → `assignDailyMissions` le asigna 3 random del pool (weighted)
3. User ve 3 cards de misión con progress visible + reward
4. Al hacer una acción (abrir sobre, pinear, compartir), **trigger SQL auto-incrementa progress**
5. Cuando `progress >= target` → status pasa a `completed`, aparece botón "Reclamar"
6. User clickea Reclamar → RPC aplica reward (monedas / pack) + status pasa a `claimed`
7. Toast: `+N monedas · +1 sobre con N cromos`

---

## Archivos

### Feature
```
src/features/missions/
├── queries.ts              # getMissionsForUser (con join inner a templates)
└── actions.ts              # claimMission
```

### Home (consumidor)
```
src/features/home/
├── queries.ts              # getHomeData (cuenta cromos del álbum, etc)
├── actions.ts              # assignDailyMissions (sorteo weighted)
└── components/
    ├── home.tsx            # Server component, usa getMissionsForUser
    └── missions-card.tsx   # UI con MissionRow + RewardBadges + botón Reclamar
```

### SQL
```
supabase/migrations/
├── 20260526130000_add_claim_mission.sql              # RPC claim_mission
└── 20260526140000_add_mission_progress_triggers.sql  # _advance_missions + 3 triggers
```

---

## Sprint 1 — Claim de rewards

### RPC `claim_mission(p_user_mission_id uuid)`

Aplica el reward de una `user_mission` con status `completed`:
1. Valida ownership + status
2. Si `reward_coins > 0` → suma a `user_coins`
3. Si `reward_pack_type` definido → crea un `pack` pendiente con `reward_card_count`
4. Marca `user_missions.status = 'claimed'`, `claimed_at = now()`

**Output**:
```
out_coins_earned integer
out_pack_id uuid        -- null si no había reward_pack_type
out_cards_earned integer
out_new_balance integer
```

**Errores**: `auth_required`, `mission_not_found`, `mission_not_completed`, `template_not_found`.

### Server action `claimMission(userMissionId)`

```ts
// features/missions/actions.ts
const result = await claimMission(missionId)
if (result.ok) {
  // result.data = { coinsEarned, packId, cardsEarned, newBalance }
}
```

Mapea errores SQL a códigos legibles. Hace `revalidatePath('/')`.

### UI — `MissionsCard`

| Estado de mission | Visual |
|---|---|
| `active` | Circle vacío, sin botón |
| `completed` | Check filled celeste, botón "Reclamar" visible |
| `claimed` | Tachado (transitorio antes de hide local) |

**Optimistic hide**: después de claim, agregamos el `mission.id` a un `Set` local (`claimedLocally`). Eso oculta la row antes de que llegue el revalidate. Si falla, no se hide (toast de error y queda visible).

**RewardBadges**:
- `+N` con icono Coin (si `reward_coins > 0`)
- `+N cromos` con icono Gift (si `reward_pack_type` definido)

---

## Sprint 2 — Auto-progress (triggers)

### Función central `_advance_missions(user_id, type, increment, context)`

```sql
-- Recorre user_missions activas del user con type dado
-- Valida filtros del config (only_new, min_rarity)
-- Si pasa filtros: incrementa progress
-- Si progress >= target: marca completed + completed_at
```

**Filtros soportados** (del `config` del template):

| Filtro | Tipo | Comportamiento |
|---|---|---|
| `only_new` | bool | Solo avanza si `context.is_new = true` |
| `min_rarity` | string | Solo avanza si `context.rarity >= min_rarity` |

Orden de rarity: `common < uncommon < rare < epic < legendary`.

### Triggers

| Trigger | Origen | Avanza |
|---|---|---|
| `trg_advance_open_pack` | `packs.status: pending → opened` | Misiones `open_pack` SIN `only_new` |
| `trg_advance_collect_rarity` | `user_cards INSERT` | Misiones `collect_rarity` (con filtros de rarity) |
| `trg_advance_pin_card` | `user_cards.is_pinned: false → true` | Misiones `pin_card` |
| `trg_advance_share_card` | `share_events INSERT` (E3) | Misiones `share_card` |

### Por qué `open_pack` se separa de `user_cards INSERT`

Hay misiones tipo:
- "Abrí 3 sobres" → cuenta sobres, **una vez por sobre**
- "Sumá 5 cromos nuevos" → cuenta cromos nuevos, **una vez por cromo**

Si la misma misión avanzara por ambos, daríamos doble incremento. La separación:
- `trg_advance_open_pack` → `_advance_missions(user, 'open_pack', 1, {})` (sin `is_new` flag)
- `trg_advance_collect_rarity` → `_advance_missions(user, 'collect_rarity', 1, {rarity, is_new: true})`

Misiones tipo `open_pack` se incrementan cuando se abre un sobre.
Misiones tipo `collect_rarity` se incrementan por cada cromo nuevo (filtra por rarity si aplica).

⚠️ **Cleanup en migration 140000**: la mission template `new_5_cards` estaba mal tipada como `open_pack` (con `only_new: true`). Se la cambió a `collect_rarity` (sin `min_rarity`, con `only_new: true`) — semánticamente correcto.

---

## Mission templates (definidos en `scripts/seed.ts`)

| ID | Type | Target | Reward (coins + pack) | Pool diario |
|---|---|---|---|---|
| `open_1_pack` | open_pack | 1 sobre | 5 + 4 cromos | ✅ |
| `open_3_packs` | open_pack | 3 sobres | 10 + 4 cromos | ✅ |
| `collect_rare` | collect_rarity | 1 (min_rarity=rare, only_new) | 15 + 4 cromos | ✅ |
| `share_card` | share_card | 1 share | 5 + 4 cromos | ✅ (re-habilitada en E3) |
| `pin_card` | pin_card | 1 pin | 5 + 4 cromos | ✅ |
| `new_5_cards` | collect_rarity (era open_pack) | 5 (only_new) | 15 + 4 cromos | ✅ |

⚠️ Durante E2 (migration 140000), `share_card` se sacó del pool temporalmente porque el feature no existía. En migration 150000 (E3 sharing) se volvió a habilitar.

---

## Assign daily missions

`features/home/actions.ts → assignDailyMissions()`:

1. Verifica si user ya tiene 3 misiones activas hoy
2. Si tiene >=3 → no hace nada (idempotente)
3. Si tiene <3 → calcula slots a llenar, sortea N templates con **weighted random sin reemplazo**
4. Inserta en `user_missions` con `expires_at` = próxima medianoche AR (03:00 UTC)
5. Status: `active`, progress: 0, target: copiado del template

Usa **admin client** (`createAdminClient()`) para bypassear RLS en el insert.

---

## Bug histórico

### "Misiones se quedan en active forever"
**Causa**: la DB no tenía triggers que avanzaran `progress` cuando ocurrían eventos. Las misiones se asignaban pero nunca llegaban a `completed`. El feature de claim era inalcanzable.

**Fix**: migration `20260526140000` creó `_advance_missions` + 3 triggers. Después la 150000 agregó el de `share_card`.

---

## Pendientes (próximos sprints)

| | |
|---|---|
| 🚧 | Trigger para `complete_page` — necesita query `not exists` después de cada `user_cards INSERT` para detectar si la página entera está owned |
| 🚧 | Trigger para `login_streak` — sobre `streaks.current_streak` UPDATE |
| 🚧 | Página `/misiones` expandida con histórico de claimed/expired |
| 🚧 | Misiones semanales / permanentes (`is_daily_pool: false`, otra lógica de assign) |

---

## Referencias

- [`../05-sql-functions.md`](../05-sql-functions.md) — `claim_mission`, `_advance_missions`, triggers
- [`../operations/migrations.md`](../operations/migrations.md) — Cómo aplicar
- [`./e3-sharing.md`](./e3-sharing.md) — Trigger `share_card`
