# 📚 Cromiks · Documentación interna

Punto de entrada para retomar el desarrollo de Cromiks. Cada archivo es autosuficiente — leyendo los relevantes podés reconstruir el contexto sin depender del chat largo donde se desarrolló.

---

## 🎯 Cómo usar esta documentación

### Para una nueva sesión con un AI assistant
Si abrís un nuevo chat para seguir desarrollando, pegale el **índice de archivos abajo** y mencionale qué feature querés tocar. El assistant lee solo los `.md` relevantes y empieza con contexto cargado.

### Para vos (revisión humana)
Empezá por [`00-product-vision.md`](./00-product-vision.md) si necesitás recordar el "por qué", o saltá directo a una feature si sabés qué tocar.

---

## 📁 Índice

### Fundación
| Archivo | Contenido |
|---|---|
| [`00-product-vision.md`](./00-product-vision.md) | Qué es Cromiks, target, decisiones de producto, valores |
| [`01-tech-stack.md`](./01-tech-stack.md) | Stack, dependencias, env vars, comandos |
| [`02-architecture.md`](./02-architecture.md) | Estructura de carpetas, conventions, patterns de Next.js |
| [`03-design-system.md`](./03-design-system.md) | Tokens, colors, typography, Button variants |

### Datos
| Archivo | Contenido |
|---|---|
| [`04-database.md`](./04-database.md) | Schema de tablas, enums, RLS, relaciones |
| [`05-sql-functions.md`](./05-sql-functions.md) | RPCs, triggers, migrations versionadas |

### Features (por épica)
| Archivo | Épica | Estado |
|---|---|---|
| [`features/e1-pack-opening.md`](./features/e1-pack-opening.md) | E1.2 — Apertura cinematográfica del sobre | ✅ Cerrado |
| [`features/e1-album.md`](./features/e1-album.md) | E1.3 + E1.4 — Vista del álbum + detalle del cromo | ✅ Cerrado |
| [`features/e2-missions.md`](./features/e2-missions.md) | E2 — Misiones diarias + claim + auto-progress | ✅ Sprint 1 + 2 cerrados |
| [`features/e3-sharing.md`](./features/e3-sharing.md) | E3 — Sharing con OG image dinámica | ✅ Cerrado |
| [`features/profile.md`](./features/profile.md) | Perfil público `/u/[username]` | ✅ V1 cerrado |
| [`features/badges.md`](./features/badges.md) | Sistema de logros con auto-unlock + UI | ✅ Cerrado |

### Operaciones
| Archivo | Contenido |
|---|---|
| [`operations/migrations.md`](./operations/migrations.md) | Lista cronológica de migrations + cómo aplicar |
| [`operations/seeding.md`](./operations/seeding.md) | `seed.ts`, catalog YAML, reset |

### Assets
| Archivo | Contenido |
|---|---|
| [`assets/3d-pack.md`](./assets/3d-pack.md) | Modelo GLTF del sobre, rebrand, créditos |

### Roadmap
| Archivo | Contenido |
|---|---|
| [`feature-status.md`](./feature-status.md) | 📊 Dashboard de estado de cada feature (done / pending / in progress) |
| [`roadmap.md`](./roadmap.md) | Pendientes detallados + cronología de la sesión |
| [`bugs.md`](./bugs.md) | 🐛 Bugs detectados por auditoría (críticos / medios / menores) |
| [`improvements.md`](./improvements.md) | ✨ Mejoras de código + UX/UI priorizadas |
| [`feature-ideas.md`](./feature-ideas.md) | 💡 Ideas de features nuevas exploratorias |
| [`tech-proposals.md`](./tech-proposals.md) | 🧪 Librerías/servicios a sumar al stack + compatibilidad |

---

## 🚦 Estado actual del proyecto (snapshot)

**Última sesión documentada**: 26 mayo 2026

| Área | Estado |
|---|---|
| Onboarding (signup + username) | ✅ Funcional |
| Home (sobre diario + streak + misiones) | ✅ Funcional |
| Apertura de sobre 3D | ✅ Cinematográfica completa |
| Álbum (10 páginas, 205 cromos) | ✅ Con nav + pageCompletion |
| Detalle del cromo | ✅ Modal con pin/dismantle/share |
| Misiones | ✅ Auto-progress + claim |
| Sharing | ✅ OG image + página pública + sheet |
| Perfil público `/u/[username]` | ✅ V1 con stats + pineados |
| Badges (auto-unlock + UI en perfil + toast) | ✅ Cerrado |
| **Pendientes grandes** | Custom fonts OG, avatar real, landing prelaunch |

Ver detalle en [`roadmap.md`](./roadmap.md).

---

## 🗂 Convenciones de los docs

- **Tablas para info estructurada**: estado, archivos, decisiones.
- **Code blocks con lenguaje**: `sql`, `tsx`, `ts`, `bash`.
- **Referencias cruzadas**: link relativo entre archivos (`./features/e1-album.md`).
- **Estado de TODOs marcado con emoji**: ✅ hecho · ⚠️ con caveat · 🚧 pendiente · ❌ descartado.
- **Decisiones explícitas**: bloques `[DECISION]` con razón resumida.

---

## 🤖 Prompt sugerido para nuevas sesiones

Si querés arrancar una sesión limpia con un AI assistant, pegale algo así:

> Trabajo en **Cromiks**, un álbum digital del Mundial 2022 (Argentina campeón). Tenés la documentación completa en `docs/`. Empezá leyendo `docs/README.md` para entender la estructura, después leé los archivos relevantes según la tarea. Mi stack: Next.js 16 + React 19 + Supabase + Tailwind v4 + Three.js. Tarea de hoy: **[describí la tarea]**.

El assistant va a navegar la docs y arrancar con contexto cargado.
