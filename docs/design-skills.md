# Skills de diseño instaladas — inventario y estrategia de uso

> Generado el 2026-06-03. Análisis de las 9 skills de diseño instaladas en el repo,
> cómo se superponen entre sí, dónde chocan con [DESIGN.md](../DESIGN.md), y un plan
> concreto para usarlas a favor de Cromiks.

## 1. Inventario: qué hay y dónde vive

| Skill | Ubicación | Fuente | Tipo |
|---|---|---|---|
| `impeccable` | `.agents/skills/` (canónica) + espejos en `.claude/skills/` y `.github/skills/` | impeccable (instalador propio, `/impeccable init` ya corrido) | **Framework completo** (23 comandos + scripts) |
| `emil-design-eng` | `.agents/skills/` | `emilkowalski/skill` | Filosofía / criterio |
| `design-taste-frontend` | `.agents/skills/` | `Leonxlnx/taste-skill` | Anti-slop (landings) |
| `high-end-visual-design` | `.agents/skills/` | `Leonxlnx/taste-skill` | Recetario "agencia premium" |
| `gpt-taste` | `.agents/skills/` | `Leonxlnx/taste-skill` | Recetario GSAP/motion |
| `redesign-existing-projects` | `.agents/skills/` | `Leonxlnx/taste-skill` | Checklist de auditoría |
| `brandkit` | `.agents/skills/` | `Leonxlnx/taste-skill` | Generación de imágenes (brand boards) |
| `imagegen-frontend-web` | `.agents/skills/` | `Leonxlnx/taste-skill` | Generación de imágenes (comps de secciones) |
| `ui-ux-pro-max` | `.claude/skills/` | (manual) | Base de datos buscable (CSV + Python) |

Notas de instalación:

- `skills-lock.json` trackea con hash las 7 de GitHub (`Leonxlnx/taste-skill` y `emilkowalski/skill`). **No cubre** `impeccable` ni `ui-ux-pro-max`.
- `impeccable` está triplicada (`.agents/`, `.claude/`, `.github/`) para servir a distintos harnesses (Claude Code, Copilot, Codex). La canónica es `.agents/` — sus scripts (`context.mjs`, `detect.mjs`, `live.mjs`) se invocan desde ahí.
- `/impeccable init` ya corrió: generó [PRODUCT.md](../PRODUCT.md) y DESIGN.md, y dejó estado en `.impeccable/` (config de live + **una critique del álbum con fecha de hoy**, score 29/40).
- `ui-ux-pro-max` ya se ejecutó al menos una vez (hay `__pycache__` de Python 3.14).

## 2. Ficha por skill

### 2.1 `impeccable` — el sistema operativo de diseño

La única skill **consciente del contexto del proyecto**: lee PRODUCT.md y DESIGN.md antes de tocar nada, distingue registro *brand* (landing, pack opening, detalle de cromo) vs *product* (álbum, UI de app), y persiste critiques con score en `.impeccable/critique/`.

Trae 23 comandos organizados por intención:

| Categoría | Comandos | Para qué |
|---|---|---|
| Build | `craft`, `shape`, `init`, `document`, `extract` | Diseñar y construir features nuevas |
| Evaluate | `critique` (heurísticas + score), `audit` (a11y/perf/responsive) | Diagnóstico |
| Refine | `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard` | Mejorar lo existente |
| Enhance | `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive` | Capas específicas |
| Fix | `clarify` (UX copy), `adapt` (responsive), `optimize` (perf) | Arreglos puntuales |
| Iterate | `live` | Variantes visuales en el browser, en vivo |

Además incluye un **detector de antipatterns real** (scripts Node, sin red): gradient text, eyebrows, side-stripes, contraste, etc. Corre sobre archivos locales o contra URL.

**Fortaleza:** es framework, no opinión suelta. **Riesgo:** casi ninguno; sus "absolute bans" están alineados con la regla central del proyecto (UI sobria, efectos solo en cromos).

### 2.2 `emil-design-eng` — criterio de micro-interacciones

Codifica la filosofía de Emil Kowalski (Vaul, Sonner, animations.dev): **cuándo NO animar** (acciones frecuentes o iniciadas por teclado: nunca), qué easing usar según el caso (enter/exit → `ease-out` con curvas custom), feedback físico (`:active { scale: 0.97 }`), `transform-origin` correcto en popovers, y un formato de review en tabla Before/After.

**Fortaleza:** es exactamente el criterio que separa "anda" de "se siente bien". **Riesgo:** ninguno; es complementaria a todo lo demás.

### 2.3 `design-taste-frontend` — anti-slop para landings

Disciplina de proceso: leer el brief antes de diseñar ("Design Read" en una línea), setear 3 diales (variance / motion / density), mapear brief → design system real (no inventar CSS si existe paquete oficial), y bans explícitos de los defaults de LLM (AI-purple, 3 cards iguales, Inter + slate-900).

**Scope declarado:** landings, portfolios y redesigns. **No** app UI ni dashboards — o sea, **no el álbum**.

### 2.4 `high-end-visual-design` — recetario "agencia $150k"

Recetas concretas y muy opinionadas: double-bezel (card anidada con radios concéntricos), button-in-button con ícono en círculo, nav pill flotante con glass, scroll reveals con blur, fonts premium (banea Inter/Roboto).

**Fortaleza:** patterns puntuales de altísima factura, copiables sueltos. **Riesgo: es la que más choca con el design system** (ver §3). Pide eyebrow tags antes de cada heading (impeccable los banea como "AI grammar"), glass por default, y sus "vibes" (Ethereal Glass, Editorial Luxury) son genéricos-premium, no Cromiks.

### 2.5 `gpt-taste` — motion GSAP y bento estricto

GSAP ScrollTrigger en serio: pinning, scrubbing de texto, card stacking, scale-on-scroll. Más reglas duras: H1 máximo 2-3 líneas, bento sin huecos vía `grid-auto-flow: dense`, ban de meta-labels ("SECTION 01").

**Riesgo concreto:** exige `grid-flow-dense` en todo bento, y el bento narrativo del álbum **prohíbe `dense` a propósito** (el orden `card_number` ES la curaduría — díptico → tanda → Montiel). Aplicarla cruda al álbum rompería la decisión central de la PR #44. También empuja picsum.photos como placeholder cuando ya existe pipeline real de assets (R2 + `assets.cromiks.app`).

### 2.6 `redesign-existing-projects` — checklist de auditoría

La más "segura" de las taste skills: secuencia scan → diagnose → fix sin reescribir, con checklists largos por capa (tipografía, color, layout, estados, contenido, componentes). Detecta fingerprints de IA (gradiente violeta, 3 columnas iguales, "Oops!", Lorem Ipsum, datos redondos falsos).

**Fortaleza:** funciona como linter mental sobre código existente. **Riesgo:** bajo; algunas recetas (añadir grain/noise, fonts con "carácter") hay que filtrarlas por DESIGN.md.

### 2.7 `brandkit` — brand boards generados

Skill de **generación de imágenes**, no de código: boards de identidad estilo estudio serio (grilla 3×3, canvas charcoal, logo system, construcción geométrica, mockups de aplicación). Pregunta por la metáfora central de la marca antes de generar.

### 2.8 `imagegen-frontend-web` — comps visuales por sección

También imagegen: una imagen horizontal **por sección** de landing (nunca colapsa la página en una sola imagen), con variedad de composición forzada (no siempre texto-izquierda/imagen-derecha) y paleta consistente entre imágenes. Pensada para que después un dev (o un modelo) recree el comp en código.

### 2.9 `ui-ux-pro-max` — base de datos buscable

No es opinión: es data. 67 estilos, 96 paletas, 57 font pairings, 99 guidelines de UX y 25 tipos de chart en CSVs, con un buscador Python (`search.py --design-system`). Prioriza accesibilidad como crítica (contraste 4.5:1, touch targets 44px, focus rings, reduced-motion).

**Fortaleza:** checklists objetivos, sobre todo a11y. **Riesgo:** su generador de design systems no aplica acá (ya hay uno decidido); usar solo la parte de guidelines.

## 3. Dónde chocan entre sí (y con DESIGN.md)

La jerarquía tiene que ser explícita, porque varias skills se contradicen entre sí y con decisiones ya tomadas del proyecto:

**PRODUCT.md + DESIGN.md ganan siempre. Después impeccable. Las taste skills son consultivas, nunca normativas.**

Conflictos concretos detectados:

| Tema | Skill que lo pide | Quién lo prohíbe | Veredicto para Cromiks |
|---|---|---|---|
| Eyebrow tags sobre cada heading | `high-end-visual-design` (§4C) | `impeccable` (absolute ban: "AI grammar") | **No usar.** |
| `grid-auto-flow: dense` en bentos | `gpt-taste` (§4) | El bento del álbum lo prohíbe (orden narrativo = curaduría) | **No en el álbum.** Quizá en una landing futura. |
| Glassmorphism por default | `high-end-visual-design` (vibe "Ethereal Glass") | `impeccable` (ban) + DESIGN.md (UI sobria, efectos solo en cromos) | **No.** Foil/glow/prisma viven en los cromos. |
| Fonts: Satoshi, Clash Display, Cabinet Grotesk | `gpt-taste`, `high-end`, `redesign` | DESIGN.md: Anton / Geist / Geist Mono ya decididos | **Ignorar sugerencias de fonts.** |
| picsum.photos como placeholder | `gpt-taste`, `redesign` | Pipeline real de assets (R2) | **Nunca.** |
| Scroll reveal en todo elemento | `high-end` ("nada aparece estático") | `emil-design-eng` (frecuencia alta → no animar) + `impeccable` (reflex uniforme = tell) | **Caso por caso**, criterio de Emil. |

El patrón general: las taste skills de `Leonxlnx` están escritas para **greenfield de landings premium 2025** (Awwwards, glass, GSAP). Cromiks es **app UI dark sobria donde la magia vive en los cromos** — el override de registro de PRODUCT.md (brand para landing / pack opening / detalle de cromo) marca exactamente dónde sí pueden hablar fuerte.

## 4. Plan de uso concreto

### 4.1 Backlog inmediato: el critique de hoy ya es un plan

`.impeccable/critique/2026-06-03...album.md` (29/40, 0 P0, 2 P1) deja el mapeo hecho, cada issue con su comando:

| Prioridad | Issue | Comando |
|---|---|---|
| P1 | Filter bar = 9 controles arriba del primer cromo | `/impeccable distill` |
| P1 | Álbum vacío se lee como deuda; sin puente a abrir sobres (crítico para la beta: primera impresión) | `/impeccable onboard` |
| P2 | `error.tsx` en español neutro (rompe voseo de DESIGN.md §3.2) | `/impeccable clarify` |
| P2 | Filtros en `useState` local, se pierden al refresh | `/impeccable harden` |
| P3 | Estrella "pin" triplicada inline | `/impeccable polish` |

El P1 de onboarding es el que más pega en el plan de beta (junio = soft beta magic-first): el primer usuario abre el álbum y ve una pared de fantasmas.

### 4.2 Mapeo skill → trabajo pendiente real

| Trabajo pendiente | Skill(s) | Cómo |
|---|---|---|
| **PR2: detalle/reveal del cromo (T-08)** | `emil-design-eng` + `/impeccable animate` | El framework de frecuencia es perfecto acá: abrir sobres es raro → delight permitido a fondo; easing custom para el reveal; `transform-origin` correcto en el dialog. |
| **Onboarding del álbum vacío** | `/impeccable onboard` | Ya diagnosticado; diseñar el spotlight "tu primer cromo" + camino a sobres. |
| **Landing pública pre-beta** | `design-taste-frontend` + `redesign-existing-projects` | Es el scope exacto de ambas. Acá el registro es *brand*: pueden hablar más fuerte. La critique ya detectó hydration mismatch en `/`. |
| **Exploración visual de la landing** | `imagegen-frontend-web` | Generar comps por sección ANTES de codear; iterar barato en imagen, no en JSX. |
| **Identidad de marca (logo, brand board)** | `brandkit` | Cromiks no tiene brand kit formal; un board con la metáfora central (el cromo como objeto de deseo) serviría para redes/press de la beta. |
| **Pasada a11y pre-beta** | `ui-ux-pro-max` (guidelines) + `/impeccable audit` | Los dots de paginación de ~10px (target mínimo 44px) ya están señalados; correr el checklist crítico completo. |
| **Iteración visual fina** | `/impeccable live` | Variantes en el browser en vivo. Requiere dev server corriendo + `/setup-browser-cookies` para pasar el auth wall del álbum. |
| **Motion de alto vuelo (post-beta)** | `gpt-taste` | Si algún día hay una landing con scroll-storytelling (pinning, scrubbing), es la referencia GSAP. No antes. |

### 4.3 Workflow sugerido por feature

```
shape (plan UX)  →  craft (build)  →  critique (score)  →  comando específico del backlog  →  audit + polish  →  merge
```

Con `emil-design-eng` como criterio transversal en cualquier cosa que se mueva, y el detector de impeccable (`detect.mjs`) sobre los archivos tocados antes de cada PR.

### 4.4 Qué NO hacer

- No aplicar `high-end-visual-design` ni `gpt-taste` crudas sobre el álbum: sus defaults (glass, eyebrows, dense, reveals universales) rompen decisiones deliberadas del proyecto.
- No dejar que ninguna skill renegocie tokens, fonts ni la regla "efectos solo en cromos". Eso ya está decidido en DESIGN.md.
- No usar placeholders de picsum: el pipeline de assets es real.

## 5. Mantenimiento

- **Triple copia de impeccable**: si se actualiza, actualizar las tres (`.agents/`, `.claude/`, `.github/`) — hoy están en sync.
- **`skills-lock.json`**: cubre solo las 7 de GitHub; `impeccable` se actualiza por su propio mecanismo (`context.mjs` avisa con `UPDATE_AVAILABLE`) y `ui-ux-pro-max` es manual.
- **`ui-ux-pro-max`** necesita Python (ya corrió con 3.14 en esta máquina).
