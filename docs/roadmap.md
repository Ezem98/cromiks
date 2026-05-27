# 🗺️ Roadmap

Estado actual del proyecto, pendientes, y orden sugerido de próximos sprints.

**Snapshot date**: 26 mayo 2026.

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
| SQL versionado en `supabase/migrations/` | ✅ 4 migrations | [`operations/migrations.md`](./operations/migrations.md) |
| Bug fix álbum (inner join + huérfanos) | ✅ | [`features/e1-album.md`](./features/e1-album.md) |
| Bug fix `open_pack` ambiguous column | ✅ migration 120000 | [`05-sql-functions.md`](./05-sql-functions.md) |

---

## 🎯 Próximos pasos recomendados

Mi voto fuerte para el siguiente sprint:

### 1. **Badges system** ⭐ (recomendado)

**Por qué**: las 15 badges ya están definidas en `seed.ts` pero no hay lógica de unlock. Sin badges, el sistema de progresión visible está flojo. Encaja naturalmente dentro del perfil.

**Scope**:
- Migration con triggers que insertan en `user_badges` cuando se cumple condition
  - `card_count`: trigger en `user_cards` INSERT que cuenta total y compara con threshold
  - `rarity_obtained`: similar pero filtrado por rarity
  - `all_legendaries`: trigger especial que verifica si tiene las 11
  - `streak`: trigger en `streaks` UPDATE OF current_streak
  - `share_count`: trigger en `share_events` INSERT
  - `referral_count`: TBD (no hay sistema de referrals todavía)
- Server action `claimBadge` (si decidimos que se reclaman manualmente) o auto-claim
- Sección "Badges" en `ProfileView` con grid de desbloqueadas + locked
- Sheet/dialog "Todas las badges" mostrando progress hacia las locked

**Estimación**: 1 sesión completa.

### 2. **Página `/misiones` expandida**

**Por qué**: hoy el widget del home solo muestra las activas + completed del día. Falta histórico + misiones permanentes futuras.

**Scope**:
- Query con misiones de TODOS los estados (active, completed, claimed, expired)
- Filtros: solo del día / histórico / pendientes de claim
- Reusar `MissionsCard` pero permitir más rows
- Nav en MobileNav para esta página

**Estimación**: media sesión.

### 3. **Pulido pre-launch**

- Landing real (hoy es básica)
- Páginas `/about` (con créditos), `/legal`, `/help`
- Tip jar Mercado Pago integrado
- Sentry + PostHog + Better Uptime
- Custom fonts (Inter + serif display + mono)
- Re-texturizar sobre (ver [`assets/3d-pack.md`](./assets/3d-pack.md))
- Decidir nombre final ("Cromiks" es placeholder)
- Comprar dominio + handles sociales
- Completar ~50 cromos placeholder en YAML
- Conseguir photo URLs reales

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
| 🚧 | Comprar dominio |
| 🚧 | Handles sociales |
| 🚧 | Landing marketing real |
| 🚧 | `/about` con créditos visibles |
| 🚧 | `/legal` (terms + privacy) |
| 🚧 | `/help` (FAQ) |
| 🚧 | Tip jar Mercado Pago |
| 🚧 | Sentry (error monitoring) |
| 🚧 | PostHog (analytics + feature flags) |
| 🚧 | Better Uptime |
| 🚧 | Custom fonts (Inter + serif + mono) |
| 🚧 | Decidir fundación tip jar (Garrahan / Conin / Refugio Sin Cadenas) |
| 🚧 | Apple Developer (push notifications eventual) |
| 🚧 | Re-texturizar sobre final |

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

---

## Referencias

- [`README.md`](./README.md) — Índice maestro
- [`00-product-vision.md`](./00-product-vision.md) — Visión y target launch
- [`features/`](./features/) — Detalle de cada feature
