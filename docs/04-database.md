# 04 · Database schema

Schema de Supabase Postgres. Esto es una vista "from-memory" basada en queries usadas durante el desarrollo. Para el shape exacto siempre consultar `src/types/database.types.ts` (generado por `pnpm db:types`).

---

## Tablas principales

### `albums`
Meta-info del álbum (hoy hay uno: `eterno-diciembre`).
```sql
id text PRIMARY KEY      -- 'eterno-diciembre'
name text                -- 'Eterno Diciembre'
total_cards int          -- 205
-- ...otros campos
```

### `pages`
Las 10 páginas del álbum (cada una con ~20-22 cromos).
```sql
id uuid PRIMARY KEY
album_id text REFERENCES albums(id)
page_number int          -- 1..10
title text               -- e.g. "El debut"
subtitle text NULL
description text NULL
card_range_start int     -- e.g. 1
card_range_end int       -- e.g. 20
bonus_card_ids text[] NULL
is_active boolean NOT NULL DEFAULT false  -- gate del pool de la beta
```

> `is_active` (migration `20260530120100`): gate del pool de la soft-beta. `roll_cards` solo sortea cromos de páginas activas (o falla con `no_active_cards`); el álbum/home reflejan el mismo set vía `features/album/scope.ts`. Default `false` — se activa la página héroe recién cuando su contenido es 100% real. Si NINGUNA página está activa, el álbum no está gateado (muestra todo, legacy). Ver [`05-sql-functions.md`](./05-sql-functions.md).

### `cards`
Los 205 cromos del álbum.
```sql
id text PRIMARY KEY      -- slug: 'mbappe-caminando-solo' o 'placeholder-N'
album_id text REFERENCES albums(id)
page_id uuid REFERENCES pages(id)
card_number int          -- 1..205, único por álbum
name text                -- 'Mbappé caminando solo'
description text NULL
rarity card_rarity       -- enum
metadata jsonb           -- { position, club, number, placeholder?, ... }
content jsonb            -- { photo: { source }, audio?, ... }
legendary_brief jsonb NULL  -- Solo para legendaries: { brief, minute, match, stadium, ... }
```

### `user_cards`
Inventario de cada user.
```sql
user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
card_id text REFERENCES cards(id)
copies int               -- ≥ 1
is_pinned boolean        -- destacado en perfil
first_obtained_at timestamptz
last_obtained_at timestamptz
PRIMARY KEY (user_id, card_id)
```

### `packs`
Sobres pendientes / abiertos por user.
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES auth.users(id)
type pack_type           -- enum: 'daily' | 'mission' | 'referral' | ...
card_count int           -- típicamente 5 (daily), 4 (mission)
status text              -- 'pending' | 'opened' | 'expired'
rolled_card_ids text[]   -- llenado al abrir
available_at timestamptz
expires_at timestamptz NULL
opened_at timestamptz NULL
context jsonb            -- { source_mission_template?, ... }
```

### `streaks`
Una row por user, contiene su racha de daily packs.
```sql
user_id uuid PRIMARY KEY REFERENCES auth.users(id)
current_streak int
longest_streak int
last_claim_date date
total_claims int
```

### `user_coins`
Balance de monedas por user.
```sql
user_id uuid PRIMARY KEY REFERENCES auth.users(id)
balance int
lifetime_earned int
updated_at timestamptz
```

### `coin_transactions`
Histórico de cambios de balance (dismantle, claim, etc).
```sql
-- Schema exacto TBD, se referencia desde reset.ts
```

### `mission_templates`
Catálogo de tipos de misión asignables.
```sql
id text PRIMARY KEY      -- 'open_1_pack', 'collect_rare', ...
type mission_type        -- enum
title text
description text
config jsonb             -- { target_count, only_new?, min_rarity?, ... }
reward_pack_type pack_type NULL
reward_card_count int NULL
reward_coins int NULL
is_daily_pool boolean    -- elegible para sorteo diario
weight int               -- peso en el sorteo (default 100)
```

### `user_missions`
Instancias de misiones asignadas a users.
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES auth.users(id)
mission_template_id text REFERENCES mission_templates(id)
status mission_status    -- enum: 'active' | 'completed' | 'claimed' | 'expired'
progress int
target int               -- copiado del template al asignar
expires_at timestamptz   -- típicamente medianoche AR
completed_at timestamptz NULL   -- agregado en migration 140000
claimed_at timestamptz NULL
```

### `badges`
Catálogo de badges (15 desbloqueables definidas en seed).
```sql
id text PRIMARY KEY
name text
description text
category text            -- 'progress' | 'rarity' | 'engagement' | 'social'
rarity card_rarity       -- visual coding
icon_name text
unlock_condition jsonb   -- { type: 'card_count', threshold: 10 }
display_order int
```

### `user_badges`
Badges desbloqueadas por user. Schema confirmado (ver `database.types.ts`).
```sql
user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
badge_id    text NOT NULL REFERENCES badges(id)
unlocked_at timestamptz NOT NULL DEFAULT now()
is_pinned   boolean NOT NULL DEFAULT false   -- destacar en perfil (UI futura)
PRIMARY KEY (user_id, badge_id)
```

RLS (definida en migration 160000):
- `SELECT`: público (las badges se muestran en `/u/[username]` sin auth)
- `UPDATE`: solo el dueño (`auth.uid() = user_id`), pensado para `is_pinned`
- `INSERT`: solo vía triggers SECURITY DEFINER, sin policy explícita

Triggers de auto-unlock: `_check_and_unlock_badges` + 4 triggers AFTER (user_cards INSERT, streaks INSERT/UPDATE, share_events INSERT). Ver `docs/features/badges.md`.

### `profiles`
Datos públicos del user (separados de auth para queryability).
```sql
id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
username text UNIQUE     -- ^[a-z0-9_]{3,20}$
display_name text NULL
language text            -- 'es' | 'en' | 'pt' | 'it'
country_code text NULL   -- ISO 2 letras
-- avatar_url text NULL  -- 🚧 pendiente
-- bio text NULL         -- 🚧 pendiente
```

### `share_events`
Tracking de shares + driver del trigger para misión `share_card`.
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
card_id text REFERENCES cards(id) ON DELETE CASCADE
channel text NULL        -- 'whatsapp' | 'twitter' | 'copy' | 'native' | 'instagram'
created_at timestamptz DEFAULT now()
```

RLS:
- `SELECT`: público (`true`)
- `INSERT`: solo el dueño (`auth.uid() = user_id`)

### `tips`
Tip jar (donations a fundación). Schema TBD pre-launch.

---

## Enums

```sql
card_rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

pack_type: 'daily' | 'mission' | 'referral' | (...otros)

mission_type: 'open_pack' | 'pin_card' | 'share_card' 
            | 'collect_rarity' | 'complete_page' | 'login_streak'

mission_status: 'active' | 'completed' | 'claimed' | 'expired'
```

---

## Relaciones clave

```
auth.users (Supabase native)
   ├── profiles (1:1)
   ├── user_cards (1:N)  → cards (N:1)
   ├── packs (1:N)
   ├── streaks (1:1)
   ├── user_coins (1:1)
   ├── user_missions (1:N)  → mission_templates (N:1)
   ├── user_badges (1:N)    → badges (N:1)
   └── share_events (1:N)   → cards (N:1)

albums
   └── pages (1:N)
       └── cards (1:N)
```

---

## RLS (Row Level Security)

Política general: cada user solo accede a sus propias rows. Excepciones públicas (en SELECT):
- `cards`, `pages`, `albums`, `mission_templates`, `badges` → todos pueden leer
- `profiles` → todos pueden leer (perfiles públicos)
- `share_events` → todos pueden leer, solo dueño puede insertar

⚠️ **Inserts en tablas de user data están bloqueados directamente**. La forma idiomática de modificar es **vía RPC functions** (`open_pack`, `claim_mission`, etc) que corren con `SECURITY DEFINER`.

---

## Triggers de Postgres

Implementados en migration `20260526140000` y `20260526150000`:

| Trigger | Tabla | Disparo | Acción |
|---|---|---|---|
| `trg_advance_open_pack` | `packs` UPDATE OF status | `pending → opened` | `_advance_missions(user, 'open_pack', 1)` |
| `trg_advance_collect_rarity` | `user_cards` INSERT | siempre | `_advance_missions(user, 'collect_rarity', 1, {rarity, is_new:true})` |
| `trg_advance_pin_card` | `user_cards` UPDATE OF is_pinned | `false → true` | `_advance_missions(user, 'pin_card', 1)` |
| `trg_advance_share_card` | `share_events` INSERT | siempre | `_advance_missions(user, 'share_card', 1, {channel})` |

Ver detalle en [`05-sql-functions.md`](./05-sql-functions.md).

---

## Migrations versionadas

A partir del 26 mayo 2026, todos los cambios SQL se versionan en `supabase/migrations/`.

| Archivo | Aporte |
|---|---|
| `20260526120000_fix_open_pack_ambiguous_column.sql` | Renombra output columns con prefijo `out_` para resolver "ambiguous column reference" |
| `20260526130000_add_claim_mission.sql` | RPC `claim_mission(user_mission_id)` |
| `20260526140000_add_mission_progress_triggers.sql` | `_advance_missions` + 3 triggers (open_pack, collect_rarity, pin_card) |
| `20260526150000_e3_sharing_trigger.sql` | Tabla `share_events` + trigger `share_card` |

⚠️ Estas son las migrations creadas **a partir de esta sesión**. El schema base (tablas, enums, RLS inicial) vive solo en Supabase Studio y todavía no está versionado. **Acción pendiente**: hacer un dump del schema actual y guardarlo como `00000000000000_initial_schema.sql` para reproducibilidad completa.

---

## Referencias

- [`05-sql-functions.md`](./05-sql-functions.md) — Detalle de RPCs y triggers
- [`operations/migrations.md`](./operations/migrations.md) — Cómo aplicar y orden
- [`operations/seeding.md`](./operations/seeding.md) — `pnpm seed`
