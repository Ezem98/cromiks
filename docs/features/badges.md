# Feature · Badges system

Sistema de logros con auto-unlock automático vía triggers SQL. 15 badges en 4 categorías (progress, rarity, engagement, social). Se muestran en el perfil público y disparan toast cuando el user desbloquea una nueva.

**Estado**: ✅ Cerrado (26 mayo 2026).

---

## Scope

| # | Item | Estado |
|---|---|---|
| 1 | Catálogo de 15 badges sembrado | ✅ desde antes (`scripts/seed.ts`) |
| 2 | Tabla `user_badges` con FKs a profiles + badges | ✅ schema preexistente |
| 3 | Triggers SQL idempotentes de auto-unlock | ✅ migration 160000 |
| 4 | Backfill para users existentes | ✅ dentro de la migration |
| 5 | Query `getBadgesForUser` con progress hacia locked | ✅ |
| 6 | UI grid en perfil (`BadgesGrid`) | ✅ |
| 7 | UI sheet con todas las badges (`BadgesSheet`) | ✅ |
| 8 | Toast on unlock (`BadgeToastListener`) | ✅ |
| 9 | `referral_count` badges | 🚧 diferido — no hay feature de referrals |
| 10 | UI para pinear badges (`is_pinned`) | 🚧 futuro |

---

## Decisiones

**`[DECISION]` Auto-unlock, no claim manual.** Las badges son cosméticas — no entregan reward económico (a diferencia de misiones, que sí dan coins/cromos). Forzar un claim agregaría fricción sin payoff. El trigger inserta directamente en `user_badges` con `ON CONFLICT DO NOTHING`.

**`[DECISION]` Re-fetch + toast con localStorage, no realtime.** La subscription realtime de Supabase suma complejidad por un caso raro (badge desbloqueado durante una sesión activa). En su lugar, el `BadgeToastListener` corre en el home: compara el set de badges con `localStorage.cromiks_seen_badges` y dispara `toast.success()` por cada nueva. En el primer load NO dispara toast (silencioso para users con badges previas al feature).

**`[DECISION]` `all_legendaries` dinámico contra el catálogo.** El nombre del badge ("Los 11 momentos") sugiere 11 legendarias, pero el catálogo de Eterno Diciembre tiene **12**. En vez de hardcodear el número, el trigger compara `count(legendaries owned) >= count(legendaries in album)`. Si en el futuro se agregan o sacan legendarias, el unlock se ajusta solo.

**`[DECISION]` `referral_count` diferido.** Las 2 badges (`first_referral`, `referrals_10`) quedan en el catálogo con `is_active=true` pero ningún trigger las desbloquea — no existe sistema de referrals. La UI las muestra con label "Próximamente". El día que se implemente referrals, basta con agregar un trigger nuevo sin tocar nada más.

---

## Arquitectura

### Backend (SQL)

Una migration nueva: [`supabase/migrations/20260526160000_badges_unlock_triggers.sql`](../../supabase/migrations/20260526160000_badges_unlock_triggers.sql).

```text
_check_and_unlock_badges(user_id, condition_type, context)
  ├── case 'card_count'       → count distinct user_cards × album_id
  ├── case 'rarity_obtained'  → exists user_cards × rarity (con shortcut via context)
  ├── case 'all_legendaries'  → count owned >= count en catálogo
  ├── case 'streak'           → greatest(current_streak, longest_streak)
  ├── case 'share_count'      → count share_events
  └── case 'referral_count'   → no-op (diferido)
```

Cuatro triggers AFTER que llaman al helper:

| Trigger | Evento | Condition types disparadas |
|---|---|---|
| `trg_check_badges_on_user_card` | `user_cards` AFTER INSERT | `card_count`, `rarity_obtained`, `all_legendaries` (si la rarity es legendary) |
| `trg_check_badges_on_streak_insert` | `streaks` AFTER INSERT | `streak` |
| `trg_check_badges_on_streak_update` | `streaks` AFTER UPDATE OF current_streak, longest_streak | `streak` |
| `trg_check_badges_on_share_event` | `share_events` AFTER INSERT | `share_count` |

Todas las funciones son `SECURITY DEFINER` con `SET search_path TO 'public'` — mismo patrón que las del feature de misiones (migration 140000).

**Backfill**: al final de la migration, un `DO $$ ... $$` recorre `profiles` y dispara los 5 checks por user. Idempotente porque el INSERT interno lleva `ON CONFLICT DO NOTHING`.

### Frontend

```text
src/features/badges/
├── queries.ts                          # getBadgesForUser + getBadgeCountForUser
└── components/
    ├── badge-icon.tsx                  # Icono con mapping icon_name → lucide, variante por rarity
    ├── badges-grid.tsx                 # Grid resumen (max 6) embebido en perfil + botón "Ver todos"
    ├── badges-sheet.tsx                # Sheet bottom con TODAS las badges agrupadas por categoría
    └── badge-toast-listener.tsx        # Client component que dispara toasts via localStorage diff
```

### Integraciones

| Archivo | Cambio |
|---|---|
| `src/app/u/[username]/page.tsx` | Fetch de `getBadgesForUser(profile.id)` en paralelo con `getCurrentUserProfile`, pasa como prop a `ProfileView` |
| `src/features/profile/components/profile-view.tsx` | Nuevo prop `badges`. Renderiza `<BadgesGrid>` entre Stats y Pineados |
| `src/features/home/components/home.tsx` | Fetch de badges del user logueado, monta `<BadgeToastListener>` para notificar nuevos unlocks |

---

## Schema de `user_badges`

Ya existía (no requirió ALTER):

```sql
user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
badge_id    text NOT NULL REFERENCES badges(id)
unlocked_at timestamptz NOT NULL DEFAULT now()
is_pinned   boolean NOT NULL DEFAULT false
PRIMARY KEY (user_id, badge_id)
```

**RLS** (definida en migration 160000):

- `SELECT`: `USING (true)` — público, para mostrar en perfiles
- `UPDATE`: `auth.uid() = user_id` — solo el dueño puede tocar `is_pinned`
- `INSERT`: sin policy — solo triggers `SECURITY DEFINER`
- `DELETE`: sin policy — no se "destransfieren" logros

---

## Catálogo (resumen)

Las 15 badges sembradas (ver `scripts/seed.ts` líneas 384-560):

| Categoría | Badges | Condition type |
|---|---|---|
| **Progress** | first_card, cards_10, cards_50, cards_100, cards_full | `card_count` |
| **Rarity** | first_rare, first_epic, first_legendary | `rarity_obtained` |
| | all_legendaries | `all_legendaries` |
| **Engagement** | streak_7, streak_30, streak_100 | `streak` |
| **Social** | first_share | `share_count` |
| | first_referral, referrals_10 | `referral_count` (🚧 diferido) |

---

## Cómo agregar una nueva badge

1. Definirla en `scripts/seed.ts` con un `unlock_condition` válido. Si el `type` ya existe (`card_count`, `streak`, etc.), el trigger la levanta automáticamente sin tocar SQL.
2. Si el `type` es nuevo (ej. `coins_spent`):
   - Agregar nuevo branch al `case` en `_check_and_unlock_badges`
   - Agregar trigger en la tabla relevante que llame al helper
   - Agregar el case correspondiente al switch de progress en `queries.ts`
3. Correr `pnpm db:seed` para upsertear el catálogo.
4. La nueva badge aparece automáticamente en `BadgesGrid` y `BadgesSheet` (no hay hardcoding).

---

## Riesgos conocidos / cosas a mirar

- **Performance del trigger en `user_cards`**: cada INSERT dispara 2-3 checks (card_count siempre, rarity_obtained siempre, all_legendaries solo si rarity=legendary). Cada check recorre las badges activas del type — con 15 badges total e índices implícitos por FK, el overhead es bajo (~5-10ms). Si el catálogo crece a >100 badges habría que medirlo.
- **`localStorage` y multi-device**: el toast listener usa localStorage por device. Si el user desbloquea una badge en desktop, va a recibir el toast en mobile la próxima vez que abra el home ahí. Es el comportamiento esperado.
- **`badges.is_active = false`**: el trigger filtra por activas, así que desactivar una badge en el catálogo la "saca de juego" sin tocar las que ya estaban desbloqueadas. Útil para deprecar.
- **`all_legendaries` en álbumes futuros**: el check está hardcodeado a `album_id = 'eterno-diciembre'`. Cuando se sume otro álbum, parametrizar o duplicar la badge por álbum.

---

## Referencias

- Migration: [`supabase/migrations/20260526160000_badges_unlock_triggers.sql`](../../supabase/migrations/20260526160000_badges_unlock_triggers.sql)
- Catálogo: [`scripts/seed.ts`](../../scripts/seed.ts) líneas 384-560
- Schema: [`04-database.md → user_badges`](../04-database.md)
- Patrón de triggers (referencia previa): [`features/e2-missions.md`](./e2-missions.md)
