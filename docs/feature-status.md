# 📊 Feature status

Dashboard del estado de cada feature. Vista de snapshot — para "qué falta" estructurado, ver [`roadmap.md`](./roadmap.md); para detalle de cada feature, ver [`features/`](./features/).

**Snapshot date**: 26 mayo 2026
**Target launch**: Junio 2026

---

## Cómo leer

| Símbolo | Significado |
|---|---|
| ✅ | **Done** — implementado, testeado en localhost, funcional |
| 🟡 | **In progress** — empezado pero incompleto |
| 🚧 | **Pending** — definido en backlog, sin empezar |
| ⚠️ | **Blocked / con caveat** — funciona pero tiene un issue conocido (ej. asset placeholder) |
| ❌ | **Cancelled** — descartado |
| 🤔 | **Idea** — no priorizado, exploratorio |

---

## 🎯 Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Features core implementadas | 9 / 9 ✅ |
| Bugs conocidos sin resolver | 0 |
| Pendientes bloqueantes para launch | 4 (re-texturizado sobre, completar cromos catalog, dominio, nombre final) |
| Pendientes no-bloqueantes priorizados | 5 (/misiones expandida, custom fonts OG, avatar, OG perfil, paginación pineados) |
| Estado general | ✅ MVP completo, falta pulido pre-launch |

---

## 🗺 Tabla maestra

| Categoría | Done | In progress | Pending | Doc |
|---|---|---|---|---|
| **1. Auth & onboarding** | 5 | 0 | 1 | — |
| **2. Daily loop (home)** | 4 | 0 | 0 | — |
| **3. Pack opening 3D** | 8 | 0 | 5 | [link](./features/e1-pack-opening.md) |
| **4. Album & detail** | 8 | 0 | 4 | [link](./features/e1-album.md) |
| **5. Misiones** | 7 | 0 | 4 | [link](./features/e2-missions.md) |
| **6. Sharing** | 7 | 0 | 4 | [link](./features/e3-sharing.md) |
| **7. Profile** | 6 | 0 | 7 | [link](./features/profile.md) |
| **8. Gamification (badges)** | 4 | 0 | 1 | [link](./features/badges.md) |
| **9. Content (cromos, fotos)** | 1 | 1 | 2 | [seeding](./operations/seeding.md) |
| **10. Infrastructure & DevOps** | 3 | 0 | 4 | [migrations](./operations/migrations.md) |
| **11. Pre-launch & marketing** | 0 | 0 | 14 | — |

---

## 1. Auth & onboarding

| # | Feature | Status | Notas |
|---|---|---|---|
| 1.1 | Signup con email + OTP | ✅ | Vía Supabase Auth + Resend |
| 1.2 | Onboarding form (username + display name + idioma + país) | ✅ | `features/onboarding/` |
| 1.3 | Username único validado en vivo | ✅ | Regex `^[a-z0-9_]{3,20}$` + debounced check |
| 1.4 | Auth callback handler | ✅ | `src/app/auth/` |
| 1.5 | Guard de auth en `(app)` route group | ✅ | Layout del grupo |
| 1.6 | Password reset / re-login flow | 🚧 | OTP cubre la mayoría de los casos |

---

## 2. Daily loop (home)

| # | Feature | Status | Notas |
|---|---|---|---|
| 2.1 | Home con sobre diario + streak | ✅ | `features/home/components/home.tsx` |
| 2.2 | Daily pack claim (RPC `claim_daily_pack`) | ✅ | Idempotente — un sobre por día |
| 2.3 | Streak card (current + longest) | ✅ | Tabla `streaks` |
| 2.4 | Album progress card | ✅ | X / 205 con barra |

---

## 3. Pack opening 3D

| # | Feature | Status | Notas |
|---|---|---|---|
| 3.1 | Page `/open/[packId]` standalone | ✅ | Route group `(focus)` |
| 3.2 | Phase anticipation (sobre flotando) | ✅ | |
| 3.3 | Phase tear con complete espectacular | ✅ | Flash + 24 partículas + aura, ~1100ms |
| 3.4 | Phase stack (cards reveladas) | ✅ | Stagger + flip animation |
| 3.5 | Phase summary | ✅ | CTAs vuelta a home / álbum |
| 3.6 | Modelo GLTF del sobre | ⚠️ | Funciona pero placeholder IP Pokemon |
| 3.7 | Cards 3D híbridas (3D + HTML overlay) | ✅ | Workaround para incompatibilidad `drei <Text>` |
| 3.8 | Debug mode `?debug=true` | ✅ | Mock con 1 cromo de cada tier |
| 3.9 | Re-texturizado del sobre (sin IP) | 🟡 | Brief listo + textura Gemini compuesta, falta verificar en 3D |
| 3.10 | Sonido al abrir | 🚧 | Sin asset todavía |
| 3.11 | Haptic feedback (`navigator.vibrate`) | 🚧 | |
| 3.12 | Variantes del "complete" según rareza máxima | 🚧 | Legendary → más espectacular |
| 3.13 | Reset WebGL context si se pierde | 🚧 | Edge case raro pero existe |

---

## 4. Álbum & detalle del cromo

| # | Feature | Status | Notas |
|---|---|---|---|
| 4.1 | Página `/album?page=N` | ✅ | Server component con search params |
| 4.2 | 10 páginas, 205 cromos | ✅ | |
| 4.3 | Grid responsive 4-7 cols | ✅ | Mobile-first |
| 4.4 | Slot owned vs missing (diseño distinto) | ✅ | |
| 4.5 | Nav prev/next + 10 dots con pageCompletion | ✅ | Dots muestran progreso parcial/lleno |
| 4.6 | Tooltip en dots ("P{n} · X/Y") | ✅ | |
| 4.7 | CardDetailDialog (E1.4) modal | ✅ | Cromo + info + acciones |
| 4.8 | Acciones: pin/unpin/dismantle/share | ✅ | Server actions con optimistic update |
| 4.9 | LegendaryBrief defensivo | ✅ | Solo si tier=legendary + brief válido |
| 4.10 | Filtros (por tier, completion, pineadas) | 🚧 | |
| 4.11 | Loading skeleton | 🚧 | |
| 4.12 | Ordering options | 🚧 | |
| 4.13 | "Saltar a página con cromos" CTA | 🚧 | UX improvement |

---

## 5. Misiones

| # | Feature | Status | Notas |
|---|---|---|---|
| 5.1 | Schema (`mission_templates`, `user_missions`) | ✅ | |
| 5.2 | Assign diario weighted random | ✅ | `assignDailyMissions` |
| 5.3 | UI MissionsCard con rows + progress | ✅ | `features/home/components/missions-card.tsx` |
| 5.4 | RPC `claim_mission` | ✅ | Migration 130000 |
| 5.5 | RewardBadges (coins + cromos) | ✅ | |
| 5.6 | Auto-progress via triggers SQL | ✅ | Migration 140000 + 150000 (share) |
| 5.7 | Filtros del config: `only_new`, `min_rarity` | ✅ | |
| 5.8 | Trigger `complete_page` | 🚧 | Necesita query "not exists" después de INSERT |
| 5.9 | Trigger `login_streak` | 🚧 | Sobre streaks.current_streak UPDATE |
| 5.10 | Página `/misiones` expandida (histórico) | 🚧 | Hoy solo widget en home |
| 5.11 | Misiones semanales / permanentes | 🚧 | Lógica de assign distinta |

---

## 6. Sharing

| # | Feature | Status | Notas |
|---|---|---|---|
| 6.1 | ShareSheet con WhatsApp/Twitter/Copy/Native | ✅ | `features/sharing/components/share-sheet.tsx` |
| 6.2 | Server action `recordShare` + tabla `share_events` | ✅ | Migration 150000 |
| 6.3 | Trigger `share_card` para auto-progress de misiones | ✅ | |
| 6.4 | OG image dinámica `/api/og/card/[cardId]` | ✅ | Satori + Resvg (next/og) |
| 6.5 | Página pública `/cromo/[cardId]?u=username` | ✅ | Standalone, sin shell |
| 6.6 | Atribución `@username` en OG y página | ✅ | Viene del feature de profile |
| 6.7 | Badge "¿lo tenés?" para viewer logueado | ✅ | "Lo tenés ×N" / "Aún no lo tenés" |
| 6.8 | Custom fonts en OG image | 🚧 | Hoy usa system fonts |
| 6.9 | Endpoint `/api/og/profile/[username]` específico | 🚧 | Hoy reusa cromo más pineado |
| 6.10 | Analytics dashboard de shares | 🚧 | Los datos están en `share_events` |
| 6.11 | Más targets: Instagram Stories, Telegram, Email | 🚧 | |

---

## 7. Profile

| # | Feature | Status | Notas |
|---|---|---|---|
| 7.1 | Página pública `/u/[username]` | ✅ | Server component standalone |
| 7.2 | Header con avatar placeholder, display_name, país | ✅ | Avatar = inicial |
| 7.3 | Stats grid (cromos / racha / sobres) | ✅ | 3 columnas |
| 7.4 | Grid de pineados (max 12) | ✅ | Click → `/cromo/[cardId]` |
| 7.5 | Botón compartir perfil (Web Share API + copy fallback) | ✅ | |
| 7.6 | CTAs contextuales según viewer (owner / logged / guest) | ✅ | |
| 7.7 | Avatar real (campo `avatar_url` + Supabase Storage) | 🚧 | Hoy placeholder |
| 7.8 | Bio (campo en `profiles`) | 🚧 | |
| 7.9 | OG image específica del perfil | 🚧 | Hoy reusa cromo pineado |
| 7.10 | Paginación si tiene >12 pineados | 🚧 | Hoy corta silencioso |
| 7.11 | Sección "Badges" | 🚧 | Depende de feature badges |
| 7.12 | Followers / Following | 🤔 | Solo si decidimos red social |
| 7.13 | Settings page para editar profile | 🚧 | |

---

## 8. Gamification (badges)

| # | Feature | Status | Notas |
|---|---|---|---|
| 8.1 | Catálogo de 15 badges en seed | ✅ | Sembradas en `seed.ts` |
| 8.2 | Triggers SQL de unlock | ✅ | Migration 160000: `_check_and_unlock_badges` + 4 triggers (user_cards, streaks, share_events). `referral_count` diferido |
| 8.3 | Sección "Badges" en perfil | ✅ | `BadgesGrid` en `ProfileView` entre stats y pineados |
| 8.4 | Sheet "Todos los logros" con progress | ✅ | `BadgesSheet` agrupado por categoría |
| 8.5 | Notificación cuando se desbloquea (toast) | ✅ | `BadgeToastListener` en home con localStorage diff |
| 8.6 | Pinear badges en el perfil (UI para `is_pinned`) | 🚧 | Columna existe, falta UI |
| 8.7 | Badges con condition `referral_count` (2 badges) | 🚧 | Diferido — no hay sistema de referrals |

> Ver detalle completo en [`features/badges.md`](./features/badges.md).

---

## 9. Content

| # | Feature | Status | Notas |
|---|---|---|---|
| 9.1 | Catalog YAML `eterno-diciembre.yaml` | ✅ | ~155 cromos definidos |
| 9.2 | Placeholders generados para llegar a 205 | ✅ | `placeholder-N` IDs |
| 9.3 | Completar ~50 cromos restantes (descriptions, metadata) | 🟡 | Hay placeholders, falta data real |
| 9.4 | Photo URLs reales (HTTPS públicas) | 🚧 | Hoy `content.photo.source: TODO` en la mayoría |
| 9.5 | Audio assets para legendaries (futuro) | 🚧 | Idea original del producto |

---

## 10. Infrastructure & DevOps

| # | Feature | Status | Notas |
|---|---|---|---|
| 10.1 | SQL versionado en `supabase/migrations/` | ✅ | 4 migrations creadas |
| 10.2 | Tipos generados de Supabase (`pnpm db:types`) | ✅ | |
| 10.3 | Scripts seed + reset | ✅ | Idempotentes |
| 10.4 | Dump del schema inicial → `00000000000000_initial_schema.sql` | 🚧 | Hoy el base schema vive solo en Supabase Studio |
| 10.5 | Supabase CLI setup (`pnpm supabase db push`) | 🚧 | Hoy aplicamos manual en Studio |
| 10.6 | CI que valide migrations idempotentes | 🚧 | |
| 10.7 | `pnpm db:status` script | 🚧 | Mostrar qué migrations están aplicadas |

---

## 11. Pre-launch & marketing

Todo 🚧 — son los items críticos antes del launch público de junio 2026.

| # | Feature | Status |
|---|---|---|
| 11.1 | Nombre final del producto (hoy "Cromiks" es placeholder) | 🚧 |
| 11.2 | Dominio comprado | 🚧 |
| 11.3 | Handles sociales reservados | 🚧 |
| 11.4 | Landing marketing real (hoy es básica) | 🚧 |
| 11.5 | Página `/about` con créditos visibles | 🚧 |
| 11.6 | Página `/legal` (terms + privacy) | 🚧 |
| 11.7 | Página `/help` (FAQ) | 🚧 |
| 11.8 | Tip jar Mercado Pago integrado | 🚧 |
| 11.9 | Sentry (error monitoring) | 🚧 |
| 11.10 | PostHog (analytics + feature flags) — 5 eventos + `useFeatureFlag` (PR6) | ✅ |
| 11.11 | Better Uptime (uptime monitoring) | 🚧 |
| 11.12 | Custom fonts (Inter + serif display + mono) | 🚧 |
| 11.13 | Decidir fundación tip jar (Garrahan / Conin / Refugio Sin Cadenas) | 🚧 |
| 11.14 | Re-texturizar sobre final (sin IP) | 🟡 |

---

## 🤔 Ideas largo plazo (sin priorizar)

- **Trading entre amigos** — intercambiar repetidas
- **Más álbumes** — no solo Eterno Diciembre (Qatar 2030, Eurocopa, etc.)
- **Concursos / desafíos semanales** — coleccioná los 11 legendaries para ganar X
- **Watch party multiplayer** — abrir sobres en simultáneo con amigos
- **NFC tap** — emparejar con stickers físicos

---

## Próximo sprint recomendado

Mi voto fuerte (mismo argumento que en [`roadmap.md`](./roadmap.md)):

**Badges system** — las 15 badges ya están en la DB pero no hay lógica de unlock. Encaja naturalmente en el perfil que acaba de cerrarse. 1 sesión completa.

Después de badges, mi voto va a **completar los ~50 cromos del catalog** + **conseguir photo URLs reales** — es lo que más mueve la aguja del producto para pre-launch.

---

## Referencias

- [`README.md`](./README.md) — Índice maestro
- [`roadmap.md`](./roadmap.md) — Pendientes detallados + cronología
- [`features/`](./features/) — Detalle de cada feature
