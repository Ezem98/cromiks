# DESIGN.md

> **Cromiks** · Brand book v1.0 · 24 de mayo de 2026
> 
> Este archivo es la fuente de verdad del design system. Es leído por Stitch (vía MCP), Claude Code, Cursor y cualquier herramienta que respete el estándar DESIGN.md. Toda referencia visual del producto debe alinearse con lo definido acá.

---

## 1. Brand identity

### 1.1 Name
- **Working name**: Cromiks (placeholder)
- **Status**: el naming final está en revisión; los tokens y el sistema son agnósticos al nombre.
- **Anti-pattern**: no usar el nombre como prefijo de componentes (`CromiksButton` ❌ → `Button` ✅).

### 1.2 Tagline
> El álbum eterno.

### 1.3 Pitch
Cromiks es el primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el momento original. El primer álbum es Argentina campeón mundial 2022: 205 cromos en 10 páginas narrativas, 11 Legendarias con video y relato.

### 1.4 Category
"Álbum digital." Sin metáforas. No es plataforma, no es experiencia inmersiva, no es Web3 collectibles. Es un álbum.

### 1.5 Audience
Personas 22–40, argentinas o latinoamericanas con conexión emocional al fútbol, urbanas, smartphone-first. Mix de millennials y gen Z que crecieron entre Panini físico y Pokémon Go. Para muchas, Qatar 2022 fue su primer Mundial ganado conscientemente. No compite con FIFA Mobile — compite con Spotify Wrapped.

### 1.6 Differentiator
Video al hover/tap en cromos Rare+ que devuelve el momento original, sumado a curaduría argentina obsesiva. Cada uno de los 205 cromos fue elegido a mano, no es una base de datos genérica.

### 1.7 Anti-references
- No NFT / crypto / blockchain en estética ni discurso.
- No gambling / casino (cero ruletas, los pity systems están pero invisibles).
- No hardcore gaming (cero leaderboards globales agresivos, cero PvP).
- No museo / Wikipedia solemne.
- No asume conocimiento profundo de fútbol del usuario.

---

## 2. Brand essence

### 2.1 Mission
Convertir el coleccionable más simple del fútbol —la figurita— en una máquina del tiempo que te devuelva el asombro del momento original.

### 2.2 Vision
Que cada Mundial, cada Copa, cada momento épico del fútbol tenga su álbum eterno. Empezamos por el más sagrado para nosotros: Argentina Qatar 2022.

### 2.3 Values

**Craft obsesivo** · Cada cromo es un objeto único. Cada animación, sonido y palabra está elegido con dedicación. No hay templates rellenados con datos: hay decisiones.

**Homenaje sin solemnidad** · No somos museo ni Wikipedia. Somos asombro genuino, alegría compartida, orgullo activo. El emoji del corazón está permitido cuando viene del alma.

**Argentino sin neutralizar** · Hablamos como hablamos. Vos, "andá pa' allá bobo", "pegoteá el álbum". No nos pasamos a español neutro para vender más.

**Curaduría sobre cantidad** · 205 cromos elegidos uno por uno. Cada uno tiene razón de estar. Si dudamos, lo sacamos.

**Free, no porque sí** · Esto es regalo, no producto. La sustentabilidad va por el tip jar hacia fundación. Los Mundiales no se venden.

### 2.4 Emotional north star
Tres emociones core en orden:
1. **Asombro** — al sacar una Rare+, al ver el video por primera vez
2. **Nostalgia activa** — "lo viví y lo estoy reviviendo", nunca melancolía pasiva
3. **Orgullo** — este es MI álbum, lo armé yo, soy parte de algo

---

## 3. Voice & tone

### 3.1 Voice principles
- **Voseo argentino pleno**: vos, tenés, viste. Sin excepciones.
- **Argentinismos a propósito**: usar slang futbolero argento sin parodia ni autoparodia.
- **Segunda persona**: la marca te habla a vos directamente. *"Esta es tu Legendaria"*.
- **Frases cortas con ritmo de cancha**: cadencia rápida, masculina, deportiva. Punto seguido más que coma.
- **Emoción no escondida**: cuando hay celebración, se nota. Cuando hay error, se asume con humor.
- **Tercera persona solo en comunicación institucional/legal**: "Cromiks es un homenaje no comercial..."

### 3.2 Tone matrix

| Contexto | Tono | Ejemplo |
|---|---|---|
| Bienvenida primer login | Presente, alegre | "Llegaste. Ahora abrí tu primer sobre — adentro hay un asombro." |
| Apertura de Legendaria | Reverente, emocional | "El gol del 1000. Está acá. Es tuyo. Vas a poder volver a verlo cuando quieras." |
| Misión completada | Celebratorio, simple | "Tres de tres, máquina. Sobre desbloqueado." |
| Error técnico 5xx | Asumido, con humor | "Se nos rompió el caño. Estamos arreglándolo. Volvé en un rato y te mandamos un sobre extra de regalo." |
| Streak por romperse | Recordatorio, cómplice | "Te quedan 90 minutos para abrir el sobre de hoy. No dejes que se te corte la racha." |
| Comunicación legal | Formal, sobrio | "Cromiks es un homenaje no comercial al fútbol argentino. El contenido pertenece a sus dueños. Los donativos van íntegros a fundación." |

### 3.3 Yes / no quick reference

| ✅ Sí | ❌ No |
|---|---|
| Andá pa' allá bobo | Vete de aquí, tonto |
| Tenés una Legendaria nueva | Has obtenido una nueva carta legendaria |
| Pegoteá tu álbum | Completa tu colección |
| Se nos rompió el caño | Ha ocurrido un error inesperado |
| ¿La tenés a la de Messi? | ¿Posees la carta de Messi? |
| Abrí el sobre | Toca para abrir |
| Ya viene | Aguarde un momento |
| Sumaste 3 figus | Has añadido 3 cromos a tu colección |

### 3.4 Forbidden language
- Español neutro genérico ("haz click", "tu cuenta", "posees").
- Anglicismos innecesarios ("loguearse", "claim", "drop").
- Lenguaje corporativo ("disfruta una experiencia única").
- Hype vacío ("the most epic", "revolutionary").
- Cualquier referencia a NFT, blockchain, web3, crypto, earn.

---

## 4. Color system

Producto **dark-only**. Sin light mode alternativo. La paleta de rareza (Common a Legendary) se aplica solo a cromos y nunca a UI general.

### 4.1 Surfaces

| Token | Hex | Uso |
|---|---|---|
| `--surface-deep` | `#0A0E14` | Background base de la app, fondo de página |
| `--surface-base` | `#0F141C` | Cards de bajo contraste, sidebar |
| `--surface-raised` | `#161D28` | Cards, modales, dropdowns |
| `--surface-elevated` | `#1E2734` | Hover states, surfaces de mayor jerarquía |
| `--surface-overlay` | `rgba(20, 28, 42, 0.85)` | Modal backdrops, tooltips |

### 4.2 Borders

| Token | Valor | Uso |
|---|---|---|
| `--border-subtle` | `rgba(255, 255, 255, 0.06)` | Default, separadores invisibles |
| `--border-default` | `rgba(255, 255, 255, 0.10)` | Bordes activos, hovers |
| `--border-strong` | `rgba(255, 255, 255, 0.18)` | Énfasis, focus states |

### 4.3 Text

| Token | Hex | Uso |
|---|---|---|
| `--text-primary` | `#F0F4F8` | Body text, titulares |
| `--text-secondary` | `#B0BAC8` | Subtítulos, info secundaria |
| `--text-muted` | `#6B7585` | Captions, metadata |
| `--text-ghost` | `#3A4250` | Placeholder, disabled |

**Contrast ratios** (sobre `--surface-deep` #0A0E14):
- `--text-primary` (#F0F4F8): 17.7:1 ✓ (AAA)
- `--text-secondary` (#B0BAC8): 10.3:1 ✓ (AAA)
- `--text-muted` (#6B7585): 5.4:1 ✓ (AA Large)
- `--text-ghost` (#3A4250): 2.5:1 — only decorative, never primary content

### 4.4 Brand

| Token | Hex | Uso |
|---|---|---|
| `--argentina-glow` | `#6BB9FF` | Color icónico de la marca. Accents, links, info, focus rings |
| `--argentina-glow-soft` | `rgba(107, 185, 255, 0.15)` | Glows ambient, fills suaves |
| `--gold` | `#D4A93C` | Premium accents, badges Legendary, eyebrow text |
| `--gold-soft` | `rgba(212, 169, 60, 0.18)` | Fills suaves de gold |
| `--celeste-deep` | `#29537A` | Deep accents, links secundarios |

### 4.5 Rarity tiers

Estos colores se usan EXCLUSIVAMENTE en cromos, no en UI general.

| Token | Hex | Tier |
|---|---|---|
| `--tier-common` | `#6B7585` | Common — neutro gris |
| `--tier-uncommon` | `#C9A659` | Uncommon — dorado mate |
| `--tier-rare` | `#5BA3E0` | Rare — celeste brillante |
| `--tier-epic` | `#B97FE3` | Epic — violeta |
| `--tier-legendary-1` | `#FF6B9D` | Legendary — pink (prism) |
| `--tier-legendary-2` | `#6BB9FF` | Legendary — blue (prism) |
| `--tier-legendary-3` | `#FFD96B` | Legendary — yellow (prism) |
| `--tier-legendary-4` | `#B97FE3` | Legendary — violet (prism) |

**Legendary prism gradient** (CSS):
```css
background: conic-gradient(
  from 0deg at 50% 50%,
  #FF6B9D, #6BB9FF, #FFD96B, #B97FE3, #FF6B9D
);
animation: prism-rotate 12s linear infinite;
```

### 4.6 Semantic

| Token | Hex | Uso |
|---|---|---|
| `--success` | `#5DC58A` | Confirmaciones, completados |
| `--warning` | `#FFB454` | Alertas, advertencias no críticas |
| `--danger` | `#FF6B6B` | Errores, acciones destructivas |
| `--info` | `#6BB9FF` | Igual que `--argentina-glow` — info contextual |

### 4.7 Text on colored backgrounds

Cuando se coloca texto sobre un fill de color, usar el mismo tono pero más oscuro:
- Sobre `--argentina-glow` fill → texto `var(--surface-deep)` (#0A0E14)
- Sobre `--gold` fill → texto `var(--surface-deep)`
- Sobre `--success` fill → texto `#062E1A`
- Sobre `--danger` fill → texto `#4D0808`

Nunca usar texto negro puro sobre fills de color.

---

## 5. Typography

### 5.1 Families

**Display: Anton**
- Source: Google Fonts (`https://fonts.googleapis.com/css2?family=Anton&display=swap`)
- License: SIL OFL
- Use: títulos, hero, números grandes, eyebrows decorativas
- Variable: `--font-display: 'Anton', 'Arial Narrow', sans-serif`
- Characteristics: condensed sans-serif bold, peso deportivo editorial. Único peso disponible (regular).

**Body: Geist**
- Source: Google Fonts (`https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap`)
- License: SIL OFL
- Use: body text, UI labels, paragraphs, buttons
- Variable: `--font-body: 'Geist', system-ui, -apple-system, sans-serif`
- Characteristics: variable font de Vercel, geometric humanist. Técnica pero cálida. Evita la genericidad de Inter.

**Mono: Geist Mono**
- Source: Google Fonts (`https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap`)
- License: SIL OFL
- Use: tokens, código, IDs, números técnicos, captions con vibe técnico
- Variable: `--font-mono: 'Geist Mono', 'SF Mono', Menlo, monospace`

**Anti-pattern**: nunca usar Inter, Roboto, Arial, system fonts genéricas. Ni mid-tech grotesks (Space Grotesk, IBM Plex, etc.) que son AI-genéricas.

### 5.2 Scale

| Token | Size | Weight | Family | Use |
|---|---|---|---|---|
| `display-xl` | 64px / 4rem | regular | Anton | Hero titles, year markers |
| `display-l` | 48px / 3rem | regular | Anton | Section titles |
| `display-m` | 36px / 2.25rem | regular | Anton | Card titles, page headers |
| `h1` | 28px / 1.75rem | 600 | Geist | Page H1 |
| `h2` | 22px / 1.375rem | 600 | Geist | Section H2 |
| `h3` | 18px / 1.125rem | 500 | Geist | Subsection H3 |
| `body-l` | 17px / 1.0625rem | 400 | Geist | Lead paragraphs |
| `body` | 15px / 0.9375rem | 400 | Geist | Default body text |
| `body-s` | 13px / 0.8125rem | 400 | Geist | Captions, metadata |
| `caption` | 11px / 0.6875rem | 500 | Geist Mono | Eyebrows, badges, technical labels |

**Line height defaults**:
- Display (Anton): 0.9–1.0 (tight)
- Body (Geist): 1.5–1.7 (generous)
- Code/mono: 1.4–1.5

**Letter spacing defaults**:
- Display: 0.01em–0.04em
- Caption / eyebrow: 0.05em–0.15em (uppercase)
- Body: -0.01em (slightly tighter for screen readability)

### 5.3 Typographic rules
- **Sentence case** en la mayoría de los contextos.
- **UPPERCASE** solo en eyebrows con letter-spacing 0.1em+ y caption mono.
- **No mid-sentence bolding**. Bold se reserva para headings y labels.
- **Display Anton** nunca para body (es display-only).
- **Números grandes**: siempre Anton, tabular-nums activado.

---

## 6. Spacing

Escala 4-based.

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4px | Gaps mínimos, padding de pills |
| `--space-2` | 8px | Gaps internos, padding pequeño |
| `--space-3` | 12px | Component internal spacing |
| `--space-4` | 16px | Default padding de cards |
| `--space-5` | 24px | Section internal spacing |
| `--space-6` | 32px | Block separation |
| `--space-7` | 48px | Section separation |
| `--space-8` | 64px | Page-level separation |
| `--space-9` | 96px | Hero-level spacing |

**Rule**: usar rem para rhythm vertical, px para gaps internos de componentes.

---

## 7. Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Tags, pills pequeñas, inputs |
| `--radius-md` | 10px | Buttons, default componentes |
| `--radius-lg` | 16px | Cards, modales |
| `--radius-xl` | 24px | Hero containers, callouts grandes |
| `--radius-full` | 9999px | Pills, badges, avatars |

**Rule**: never mix radius values within the same component. Buttons usan `--radius-md`, cards usan `--radius-lg`, no mezclar.

---

## 8. Motion

### 8.1 Durations

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 100ms | Feedback inmediato (button press) |
| `--duration-quick` | 200ms | UI transitions, hovers |
| `--duration-moderate` | 350ms | Page transitions, modals open |
| `--duration-cinematic` | 700ms | Reveals, celebraciones |
| `--duration-epic` | 1200ms+ | Legendary card reveal, sobre opening |

### 8.2 Easings

| Token | Curve | Use |
|---|---|---|
| `--ease-ui` | `cubic-bezier(0.4, 0, 0.2, 1)` | UI estándar: hovers, transiciones de estado |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Celebraciones: streak, misión cumplida |
| `--ease-drama` | `cubic-bezier(0.7, 0, 0.3, 1)` | Drama: apertura de Legendaria, reveals |

### 8.3 Motion principles

1. **Stagger 50–80ms** entre elementos en cascada.
2. **Reduced motion** siempre respetado vía `@media (prefers-reduced-motion: reduce)`. Fallback a fades simples.
3. **Una animación por contexto**: si entra un toast, no se mueve el resto.
4. **Sin loops decorativos**: las animaciones loop solo viven en cromos Rare+. UI no parpadea por parpadear.
5. **Las celebraciones requieren amplitud**: un streak de 30 días merece partículas; un like no.

---

## 9. Iconography

**Pendiente de definición en V2.**

Direcciones iniciales:
- **Estilo**: outline 1.5px, esquinas redondeadas.
- **Tone**: deportivo limpio, no infantil ni excesivamente técnico.
- **Set base**: Tabler Icons (outline) o Lucide como starter set. Custom icons solo para Cromiks-specific (sobre, cromo, álbum, misión, streak, Legendary star).
- **Sizing**: 16px inline, 20px standalone, 24px decorative max.

---

## 10. Sound design

**Pendiente de definición en V2.**

Direcciones iniciales:
- **UI feedback**: sutil, 80–120ms, baja intensidad. Solo para acciones importantes (claim, share).
- **Apertura de sobre**: escalando dramática, 4–7 segundos, percusión + sintetizado.
- **Rarity reveal**: distinto por tier. Common = mute, Uncommon = chime suave, Rare = riff corto, Epic = orchestral hit, Legendary = ambient + relato del comentarista.
- **Sound único por Legendaria**: cada uno de los 11 cromos legendarios tiene su loop ambient propio.

---

## 11. Components

### 11.1 Buttons

Cuatro variantes cubren el 95% del producto.

**Button.primary** — acción más importante del contexto
```css
background: var(--argentina-glow);
color: var(--surface-deep);
font-family: var(--font-body);
font-size: 14px;
font-weight: 500;
padding: 12px 24px;
border-radius: var(--radius-md);
transition: all var(--duration-quick) var(--ease-ui);

&:hover {
  background: #8FCCFF;
  transform: translateY(-1px);
}
```

**Button.ghost** — acciones secundarias
```css
background: transparent;
color: var(--text-primary);
border: 1px solid var(--border-default);
padding: 12px 24px;

&:hover {
  background: var(--surface-raised);
  border-color: var(--border-strong);
}
```

**Button.gold** — celebración, premium, Legendary actions
```css
background: var(--gold);
color: var(--surface-deep);
font-weight: 600;

&:hover {
  background: #E5BA4E;
}
```

**Button.danger** — destructivos, irreversibles
```css
background: transparent;
color: var(--danger);
border: 1px solid var(--danger);

&:hover {
  background: rgba(255, 107, 107, 0.1);
}
```

### 11.2 Card (cromo)

Pendiente de definición fina por tier. Anatomía base:
- Aspect ratio 3:4
- Border-radius: var(--radius-lg)
- Border 1px tier-specific
- Padding internal: 12px
- Player name: Anton 18px white
- Role: Geist Mono 9px white-70 uppercase

Tratamiento por tier — ver sección 12.

### 11.3 Otros componentes pendientes V2

- Modal
- Input (text, password, OTP)
- Toast / notification
- Badge / pill
- Sobre (antes de apertura)
- Sobre (durante apertura)
- Album page (grid de cromos)
- Avatar / user chip

---

## 12. Tier anatomy de cromos

### 12.1 Common (113 cromos · 55%)
- Border: 1px solid `var(--tier-common)`
- Fill: linear-gradient `#2A323F → #1A1F28`
- Content: foto estática del jugador
- Interactions: none
- Sound: none
- Tilt: none

### 12.2 Uncommon (55 cromos · 27%)
- Border: 1px solid `var(--tier-uncommon)`
- Fill: linear-gradient `#3D3220 → #1F1A12`
- Content: foto estática
- Effect: shimmer animation (3s loop) — linear-gradient 45deg passing through
- Tilt: 12° max on hover
- Sound: subtle chime on reveal
- Soft glow on hover: `box-shadow: 0 0 16px var(--gold-soft)`

### 12.3 Rare (14 cromos · 7%)
- Border: 1px solid `var(--tier-rare)`
- Fill: linear-gradient con scanlines
- Content: foto + video al tap (3–5s loop, mute)
- Effect: foil prismático (repeating-linear-gradient 120deg)
- Tilt: 20° max on hover
- Sound: short riff on reveal
- Glow: `box-shadow: 0 0 20px rgba(91, 163, 224, 0.2)`

### 12.4 Epic (12 cromos · 6%)
- Border: 1px solid `var(--tier-epic)`
- Fill: radial-gradient `#6B4E9E → #2A1A4A`
- Content: foto + video + partículas ambientes
- Effect: parallax 3D real (3 layers: bg / mid / foreground)
- Tilt: 25° max on hover
- Sound: orchestral hit on reveal
- Glow: `box-shadow: 0 0 24px rgba(185, 127, 227, 0.25)`

### 12.5 Legendary (11 cromos · 5%)
- Border: 1px solid `rgba(255, 217, 107, 0.6)`
- Fill: conic-gradient prism rotating
- Content: video + relato del comentarista + ambient loop único
- Effect: full immersive — refracción holográfica, partículas, glow rotation
- Tilt: unlimited, follows mouse
- Sound: sonido único por cromo
- Glow: `box-shadow: 0 0 30px rgba(255, 217, 107, 0.2), inset 0 0 30px rgba(0, 0, 0, 0.4)`
- **Diseño individual por cromo**: cada uno de los 11 Legendaries tiene tratamiento custom.

### 12.6 Las 11 Legendarias
1. Messi gol del 1000 (Australia)
2. Atajada Dibu Australia
3. "Andá pa' allá bobo"
4. Penal Lautaro vs Países Bajos
5. Gol Julián contraataque
6. Gambeta a Gvardiol
7. Gol Di María Final
8. Atajada Dibu a Kolo Muani
9. Penal Montiel
10. Messi besando copa
11. Levantada de copa

---

## 13. Application principles

### 13.1 Layout
- Mobile-first.
- Single-column en mobile, two-column en tablet+, three-column máximo en desktop.
- Generosity over density: la jerarquía visual gana al ahorro de scroll.
- Asimetría sutil donde aporte: hero offset, álbum cards staggered.

### 13.2 Imagery
- Fotografía de jugadores: alto contraste, vibrantes, momento de acción cuando posible.
- Color grading: warm shadows, cool highlights — coherente con la paleta nocturna.
- Backgrounds del cromo: nunca foto pura, siempre con overlay de gradient para legibilidad del texto sobre el cromo.

### 13.3 Accessibility (WCAG 2.1 AA target)
- Contrast ratios mínimos cumplidos en todos los tokens de texto.
- `prefers-reduced-motion` respetado.
- Focus visible en todos los interactivos (`outline: 2px solid var(--argentina-glow); outline-offset: 2px`).
- Skip-to-content link al inicio de cada página.
- Alt text obligatorio en cromos: nombre del jugador + descripción del momento.
- Videos con captions cuando hay audio narrativo.

### 13.4 Performance budgets
- LCP < 1.8s
- INP < 100ms
- CLS < 0.05
- JS initial bundle < 150KB gzipped
- Lazy load de toda animación cinematográfica (GSAP, R3F, Lottie) — no en bundle inicial.

---

## 14. File output references

- `brand-book.html` — versión visual de este documento, lista para hostear en `/docs/`
- `tokens.css` — pendiente, exportable desde este DESIGN.md
- `tokens.json` — pendiente, para integración con Tailwind / Figma Tokens / Stitch
- `tailwind.config.ts` — pendiente, derivado de tokens

---

## 15. Versioning

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-05-24 | Versión inicial — brand essence, voice, color, type, motion, tier anatomy. Componentes y sound design pendientes para V2. |

---

## 16. Maintained by

Documento vivo. Cambios requieren versionado semántico:
- **Patch (x.x.+1)**: ajuste de tokens, nuevas excepciones de voice & tone
- **Minor (x.+1.0)**: nueva sección, nuevos componentes
- **Major (+1.0.0)**: cambio de identidad de marca, renaming, nuevo design language

Cualquier cambio se commitea con mensaje `design: ...` siguiendo conventional commits.
