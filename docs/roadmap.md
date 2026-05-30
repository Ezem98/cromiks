# 🗺️ Roadmap

Estado actual del proyecto, pendientes, y orden sugerido de próximos sprints.

**Snapshot date**: 30 mayo 2026.

---

## ✅ Hecho (esta etapa)

| Feature | Estado | Doc |
|---|---|---|
| E1.2 Pack Opening 3D | ✅ Cinematográfica completa | [`features/e1-pack-opening.md`](./features/e1-pack-opening.md) |
| E1.3 Album view + nav con pageCompletion | ✅ Funcional | [`features/e1-album.md`](./features/e1-album.md) |
| E1.4 Card detail dialog | ✅ Pin/dismantle/share | [`features/e1-album.md`](./features/e1-album.md) |
| E2 Missions sprint 1 (claim) | ✅ RPC + UI | [`features/e2-missions.md`](./features/e2-missions.md) |
| E2 Missions sprint 2 (auto-progress) | ✅ 4 triggers SQL | [`features/e2-missions.md`](./features/e2-missions.md) |
| E3 Sharing (OG + página pública + sheet) | ✅ Funcional | [`features/e3-sharing.md`](./features/e3-sharing.md) |
| Perfil público `/u/[username]` | ✅ V1 con stats + pineados | [`features/profile.md`](./features/profile.md) |
| Badges system (auto-unlock + UI + toast) | ✅ Cerrado | [`features/badges.md`](./features/badges.md) |
| SQL versionado en `supabase/migrations/` | ✅ 14 migrations | [`operations/migrations.md`](./operations/migrations.md) |
| Bug fix álbum (inner join + huérfanos) | ✅ | [`features/e1-album.md`](./features/e1-album.md) |
| Bug fix `open_pack` ambiguous column | ✅ migration 120000 | [`05-sql-functions.md`](./05-sql-functions.md) |

### Sesión 30 mayo 2026 (PRs #25–#29, ya en main)

| Feature | Estado | Doc |
|---|---|---|
| Gate del pool de la beta (`pages.is_active` + `roll_cards` ponderado por cromo) | ✅ | [`05-sql-functions.md`](./05-sql-functions.md), [`04-database.md`](./04-database.md) |
| Álbum scopeado al set activo (T-04) | ✅ `features/album/scope.ts` | [`features/e1-album.md`](./features/e1-album.md) |
| Cromo con terminación tipo TCG (foil holográfico pointer-driven + tilt + glare + frame) | ✅ | [DESIGN.md §12.7](../DESIGN.md) |
| Holo en hover en la grilla del álbum (legendary/epic) | ✅ | [DESIGN.md §12.7](../DESIGN.md) |
| Pulido de UX (global-error branded, voseo, CTAs pack, a11y, créditos de fuentes) | ✅ PR #28 | — |
| Waitlist (tabla + landing) | ✅ migration 20260529140000 | — |
| Dominios comprados (cromiks.app live + cromiks.com) | ✅ | — |

---

## 🚀 Decisiones de la beta (30 mayo 2026)

- **Soft-beta a la waitlist primero**, no launch público abierto. Se invita una cohorte chica (10–15) para observar comportamiento antes de abrir.
- **Página héroe = `croacia`** (Gvardiol gambeta + Julián run): es el único set activo en el arranque (`pages.is_active`). El pool restringido evita mostrar cromos placeholder y hace la beta curada.
- **Gate de cohorte = unannounced-open**: DM del link, cero build de allowlist. Allowlist solo si aparece un random.
- **Dominios comprados**: cromiks.app (live en Railway) + cromiks.com; redirect `.com → .app` en curso. El nombre puede quedar "Cromiks" placeholder para la beta.
- **Expansión del pool** = `UPDATE pages SET is_active = true WHERE ...` (una línea, sin reseed) cuando el set héroe se complete — ver T-02 en [`TODOS.md`](../TODOS.md).

Bloqueantes restantes de la soft-beta: contenido real de `croacia` (~15 cromos + 2 YouTube + briefs) y re-texturizado del sobre 3D. Checklist completo en [`TODOS.md`](../TODOS.md).

---

## 🎯 Próximos pasos recomendados

Después del cierre de badges + el trabajo de la beta, los candidatos al próximo sprint son:

### 1. **Página `/misiones` expandida**

**Por qué**: hoy el widget del home solo muestra las activas + completed del día. Falta histórico + misiones permanentes futuras.

**Scope**:
- Query con misiones de TODOS los estados (active, completed, claimed, expired)
- Filtros: solo del día / histórico / pendientes de claim
- Reusar `MissionsCard` pero permitir más rows
- Nav en MobileNav para esta página

**Estimación**: media sesión.

### 3. **Pulido pre-launch**

(Cuando se cierren features de producto, prioridad pre-launch)

- Contenido real de `croacia` (bloqueante de la soft-beta)
- Re-texturizar el sobre (ver [`assets/3d-pack.md`](./assets/3d-pack.md)) — bloqueante de la soft-beta
- `/help` (FAQ)
- Tip jar Mercado Pago integrado
- Custom fonts (Inter + serif display + mono)
- Decidir nombre final ("Cromiks" es placeholder)
- Handles sociales
- Completar las otras 9 páginas (~185 cromos) + photo URLs reales (post-beta)

---

## 🚧 Backlog completo (por feature)

### Pack opening 3D
| | |
|---|---|
| 🚧 | Sonido al abrir |
| 🚧 | Haptic feedback en mobile (`navigator.vibrate`) |
| 🚧 | Variantes del "complete" según rareza máxima rolleada |
| 🚧 | Reset del WebGL context si se detecta context loss |
| ⚠️ | Re-texturizar el sobre (Pokemon IP) |

### Álbum
| | |
|---|---|
| 🚧 | Filtros (por tier, por completion, pineadas) |
| 🚧 | Loading skeleton |
| 🚧 | Ordering options |
| 🚧 | "Saltar a página con cromos owned" CTA |

### Misiones
| | |
|---|---|
| 🚧 | Trigger `complete_page` |
| 🚧 | Trigger `login_streak` |
| 🚧 | Página `/misiones` expandida |
| 🚧 | Misiones semanales / permanentes |

### Sharing
| | |
|---|---|
| 🚧 | Custom fonts en OG image |
| 🚧 | Endpoint `/api/og/profile/[username]` específico |
| 🚧 | Analytics dashboard de shares |
| 🚧 | Más targets: Instagram Stories, Telegram, Email |

### Perfil
| | |
|---|---|
| 🚧 | Avatar real (`avatar_url` + Supabase Storage) |
| 🚧 | Bio |
| 🚧 | OG image específica del perfil |
| 🚧 | Paginación si tiene >12 pineados |
| 🚧 | Sección "Badges" (depende del feature badges) |
| 🚧 | Followers / Following (si decidimos red social) |
| 🚧 | Settings page para editar profile |

### Operaciones
| | |
|---|---|
| 🚧 | Dump del schema inicial → `00000000000000_initial_schema.sql` |
| 🚧 | Configurar Supabase CLI |
| 🚧 | CI que valide migrations idempotentes |
| 🚧 | `pnpm db:status` para ver qué migrations están aplicadas |
| 🚧 | Completar ~50 cromos restantes en YAML |
| 🚧 | Photo URLs reales para cards (~150 en TODO) |
| 🚧 | Actualizar `seed.ts` para reflejar cambio de `new_5_cards` |

### Pre-launch
| | |
|---|---|
| 🚧 | Decidir nombre final (Cromiks es placeholder) |
| ✅ | Dominio comprado — cromiks.app (live) + cromiks.com; redirect `.com → .app` en curso |
| 🚧 | Handles sociales |
| ✅ | Landing marketing real (falta assets reales de las legendarias) |
| ✅ | `/about` con créditos visibles (fuentes Anton/Geist/Geist Mono corregidas, PR #28) |
| ✅ | `/legal` (terms + privacy) — revisar con profesional antes del launch comercial |
| 🚧 | `/help` (FAQ) |
| 🚧 | Tip jar Mercado Pago |
| 🚧 | Sentry (error monitoring) |
| ✅ | PostHog (analytics + feature flags) |
| 🟡 | Better Stack — `/api/health` + uptime (PR8: código listo, falta config monitor; logs diferidos) |
| 🚧 | Custom fonts (Inter + serif + mono) |
| 🚧 | Decidir fundación tip jar (Garrahan / Conin / Refugio Sin Cadenas) |
| 🚧 | Apple Developer (push notifications eventual) |
| 🟡 | Re-texturizar sobre final (bloqueante de la soft-beta) |

---

## 🎲 Ideas largo plazo (opcional)

- **Trading entre amigos** — intercambiar repetidas
- **Album expansion** — más álbumes (no solo Eterno Diciembre)
- **Concursos / desafíos semanales** — pegá los 11 legendaries para ganar X
- **Multiplayer** — abrir sobres en simultáneo con amigos via watch party
- **NFC tap** — emparejar con stickers físicos para "abrir" un sobre

Ninguna de estas está priorizada — son ideación futura.

---

## 📅 Cronología de la sesión (referencia)

Sesión del 26 mayo 2026:

1. **E1.3 Album view** — implementado from scratch
2. **Bug SQL** — fix de "ambiguous column" en `open_pack` (migration 120000)
3. **E1.4 Card detail** — dialog con pin/dismantle/share placeholder
4. **E2 Sprint 1** — `claim_mission` SQL + queries + actions + UI (migration 130000)
5. **C + D paralelo**:
   - C: triggers de progress (migration 140000)
   - D: brief de rebrand del sobre, workflow con Gemini
6. **Generación textura sobre** — Gemini con prompt 2:3 vertical + composición Photopea
7. **Bug álbum** — inner join para huérfanos + pageCompletion en nav
8. **E3 Sharing** — OG image + página pública + share sheet (migration 150000)
9. **E3 polish** — "¿lo tenés?" en página pública
10. **Perfil público** — `/u/[username]` con stats + pineados
11. **Documentación** — folder `docs/` creado con 16 archivos
12. **Bug fix Satori OG image** — `<div>` con multi-children requiere `display: flex` explícito + pre-build de strings interpolados (ver [`features/e3-sharing.md`](./features/e3-sharing.md))
13. **Fix Button variants** — `variant="secondary"` no existía en el componente. Reemplazado por `"ghost"` en 3 archivos: `card-detail-dialog.tsx`, `share-sheet.tsx`, `profile-view.tsx`
14. **Feature status dashboard** — agregado [`feature-status.md`](./feature-status.md)

Sesión del 30 mayo 2026 (PRs #25–#29):

1. **Curated beta pool** (#25) — `pages.is_active` + `roll_cards` reescrita (draw ponderado por cromo, fix del bug de sobres incompletos, guard `no_active_cards`) + momento legendario "Volvé a verlo"
2. **Álbum respeta `is_active`** (#26) — T-04: scope activo en `getAlbumData`/`getHomeData`
3. **Cromo holo finish** (#27) — foil holográfico pointer-driven + tilt + glare + frame TCG
4. **UX polish** (#28) — global-error branded, dedupe `/home` → `/`, voseo, créditos de fuentes, ShareSheet, CTAs del pack, a11y
5. **Foil por rareza + holo en grilla** (#29) — colores de foil por tier + `.cromo-slot-holo` + barrido suave
6. **Decisiones de la beta** — soft-beta a waitlist, `croacia` como página héroe, gate unannounced-open, dominios comprados

---

## Referencias

- [`README.md`](./README.md) — Índice maestro
- [`00-product-vision.md`](./00-product-vision.md) — Visión y target launch
- [`features/`](./features/) — Detalle de cada feature
