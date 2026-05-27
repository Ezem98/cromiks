# Operations · Seeding y data

Cómo popular la DB con cromos, páginas, missions templates, y badges.

---

## Scripts disponibles

```bash
pnpm seed         # Popula desde catalog/eterno-diciembre.yaml. Idempotente.
pnpm seed:reset   # ⚠️ DESTRUCTIVO. Borra todo y resemea.
```

Ambos viven en `scripts/`:
- `scripts/seed.ts` — el seed real
- `scripts/reset.ts` — wipe destructivo

Ambos usan **admin client** (`SUPABASE_SECRET_KEY` env var) para bypassear RLS.

---

## `pnpm seed` (idempotente)

Hace upserts (no destructivo). Podés correrlo cuantas veces quieras sin duplicar.

### Pasos del seed

1. **Lee `catalog/eterno-diciembre.yaml`** — definición del álbum + páginas + cromos
2. **Seed pages** — 10 páginas del álbum
3. **Seed cards**:
   - Carga los cromos definidos en el YAML (~155)
   - Genera **placeholders** (`id: 'placeholder-N'`) para llegar a 205 exactos
   - Distribuye rarities según `rarity_distribution` del YAML
4. **Seed mission_templates** — 6 templates definidos en el script
5. **Seed badges** — 15 badges definidas en el script (categorías: progress, rarity, engagement, social)

### Output esperado

```
━━━ Cromiks seed ━━━

[catalog] cargando /path/to/eterno-diciembre.yaml
[catalog] 10 páginas, 155 cromos definidos
[pages] sembrando…
✓ 10 páginas sembradas
[cards] sembrando…
[placeholders] faltan: 30 common, 15 uncommon, 5 rare
[cards] 155 desde YAML + 50 placeholders = 205 total
✓ 205 cromos sembrados
✓ distribución correcta: 205 cromos en total
[missions] sembrando templates…
✓ 6 mission templates sembradas
[badges] sembrando…
✓ 15 badges sembrados

✓ seed completo
```

### Idempotencia

Los upserts usan `onConflict: 'id'`. Si una row ya existe con ese ID, se actualizan los campos (no se duplica).

⚠️ **Excepción**: los placeholders se generan con IDs `placeholder-N` predecibles. Si cambia el orden de generación entre runs, podrían "moverse" de página. En la práctica esto no pasa porque el algoritmo es deterministic.

---

## `pnpm seed:reset` (destructivo)

⚠️ Borra TODO. NO borra usuarios de `auth.users` (eso lo hacés a mano en Studio si querés).

### Orden de truncado

Respeta FK dependencies:

```ts
const TABLES_IN_ORDER = [
  'coin_transactions',
  'tips',
  'share_events',
  'user_badges',
  'user_missions',
  'user_coins',
  'streaks',
  'user_cards',
  'packs',
  'badges',
  'mission_templates',
  'cards',
  'pages',
]
```

Confirma con `yes` antes de ejecutar.

### Después de reset, correr seed

```bash
pnpm seed:reset
pnpm seed
```

---

## Catalog YAML

`catalog/eterno-diciembre.yaml` — fuente de verdad de los cromos.

### Estructura

```yaml
meta:
  album_id: eterno-diciembre
  album_name: Eterno Diciembre
  total_cards: 205

rarity_distribution:
  common: 130
  uncommon: 40
  rare: 20
  epic: 14
  legendary: 11    # Los 11 momentos del Mundial

pages:
  - id: el-debut             # uuid o slug
    name: "El debut"
    description: "..."
    order: 1
    card_range: [1, 20]
    bonus_card_id: null

  # ... 9 más

cards:
  - id: mbappe-caminando-solo    # slug
    name: "Mbappé caminando solo"
    page: el-debut                # ref a page.id
    rarity: legendary
    card_number: 160
    description: "Texto del cromo..."
    content:
      photo:
        source: https://...        # o "TODO"
    metadata:
      position: "Forward"
      club: "Paris Saint-Germain"
      number: 10
      legendary_brief: "Texto del momento histórico..."
```

### Convención de IDs

- Slugs en `kebab-case` (e.g. `mbappe-caminando-solo`)
- Placeholders: `placeholder-N` donde N es el `card_number`
- Páginas: pueden ser slug o uuid (el seed usa lo que esté en el YAML)

### Cards reales vs placeholders

Hoy:
- ~155 cromos definidos en YAML
- ~50 placeholders generados por el seed

⚠️ **Acción pendiente**: completar los ~50 cromos restantes en el YAML. Cada placeholder tiene `metadata: { placeholder: true }` lo que los hace identificables.

### Photo URLs

La mayoría de las cards tienen `content.photo.source: TODO`. El seed las trata igual pero el cromo se renderiza con un fallback (gradient).

⚠️ **Acción pendiente**: conseguir URLs reales (públicas, HTTPS) para fotos de jugadores.

---

## Mission templates (hardcoded en seed)

| ID | Type | Target | Reward | Daily pool |
|---|---|---|---|---|
| `open_1_pack` | open_pack | 1 | 5 coins + 4 cromos | ✅ |
| `open_3_packs` | open_pack | 3 | 10 coins + 4 cromos | ✅ |
| `collect_rare` | collect_rarity | 1 (min=rare, only_new) | 15 coins + 4 cromos | ✅ |
| `share_card` | share_card | 1 | 5 coins + 4 cromos | ✅ |
| `pin_card` | pin_card | 1 | 5 coins + 4 cromos | ✅ |
| `new_5_cards` | collect_rarity (reconfigurada en migration 140000) | 5 (only_new) | 15 coins + 4 cromos | ✅ |

⚠️ **Si vuelve a correrse `pnpm seed`**, el template `new_5_cards` se va a revertir a `type: open_pack` (definido en seed.ts). Acción: actualizar seed.ts para reflejar el cambio de la migration 140000.

---

## Badges (hardcoded en seed)

15 badges en 4 categorías:

| Categoría | Badges |
|---|---|
| `progress` | `first_card`, `cards_10`, `cards_50`, `cards_100`, `cards_full` |
| `rarity` | `first_rare`, `first_epic`, `first_legendary`, `all_legendaries` |
| `engagement` | `streak_7`, `streak_30`, `streak_100` |
| `social` | `first_share`, `first_referral`, `referrals_10` |

Cada badge tiene `unlock_condition` jsonb con type + threshold (e.g. `{ type: 'card_count', threshold: 10 }`).

⚠️ **Lógica de unlock NO implementada todavía** — los badges existen en la DB pero no hay triggers que los desbloqueen. Ver [`../roadmap.md`](../roadmap.md).

---

## Pendientes

| | |
|---|---|
| 🚧 | Completar los ~50 cromos restantes en YAML |
| 🚧 | Conseguir photo URLs reales (HTTPS públicas) |
| 🚧 | Actualizar `seed.ts` para que `new_5_cards` tenga el shape correcto post-migration 140000 |
| 🚧 | Seed parametrizado por env (dev vs staging vs prod) |

---

## Referencias

- [`../04-database.md`](../04-database.md) — Schema de las tablas que se seedean
- [`./migrations.md`](./migrations.md) — Aplicar migrations antes de seedear
- [`../assets/3d-pack.md`](../assets/3d-pack.md) — Assets visuales que no están en el catalog
