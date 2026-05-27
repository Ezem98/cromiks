# 03 · Design System

## Filosofía visual

**Dark premium, sobrio, argentino sin caer en cliché.** Inspirado en packs físicos de coleccionables (Topps Chrome, Panini Adrenalyn) — sensación de edición limitada y archivo.

---

## Paleta de colores (CSS vars)

Todas viven en `src/app/globals.css`. Uso en Tailwind v4: `bg-(--color-surface-deep)`, `text-(--color-gold)`.

### Surface / superficie
| Variable | Hex | Uso |
|---|---|---|
| `--color-surface-deep` | `#0A0E14` | Background principal de toda la app |
| `--color-surface-base` | `#161B22` | Fondos de tarjetas, modales |
| `--color-surface-elevated` | (~ `#1F2530`) | Inputs, secondary surfaces |
| `--color-surface-raised` | (~ `#1A1F28`) | Cards más arriba en la jerarquía |

### Brand
| Variable | Hex | Uso |
|---|---|---|
| `--color-argentina-glow` | `#6BB9FF` | Celeste argentino. Acción primaria. CTA principal |
| `--color-gold` | `#D4A93C` | Dorado. Celebración, premium, legendaries, monedas |

### Texto
| Variable | Aprox | Uso |
|---|---|---|
| `--color-text-primary` | `#E6ECF2` | Texto principal |
| `--color-text-secondary` | `#A6B0BD` | Texto secundario, descripciones |
| `--color-text-muted` | (~ `#7E8896`) | Labels, metadata |
| `--color-text-ghost` | Más bajo | Tachados, disabled |

### Semánticos
| Variable | Hex | Uso |
|---|---|---|
| `--color-success` | (verde sobrio) | Estados ok |
| `--color-danger` | (rojo sobrio) | Errores, destructivos |

### Rarities (cromos)
| Variable | Hex | Tier |
|---|---|---|
| `--color-tier-common` | `#3a4555` (o similar gris) | common |
| `--color-tier-uncommon` | `#D4A93C` (dorado) | uncommon |
| `--color-tier-rare` | `#6BB9FF` (celeste) | rare |
| `--color-tier-epic` | `#B97FE3` (violeta) | epic |
| `--color-tier-legendary` | `#FFD96B` (dorado vibrante) | legendary |

Nota: las CSS vars de tier que arrancan con `--color-tier-*` se usan en bordes de cards en grid. Los efectos especiales (prism legendary, foil rare) son shaders custom dentro del componente `Cromo`.

---

## Tipografía

### Familias

| Variable | Familia | Uso |
|---|---|---|
| `text-display` | (TBD pre-launch, hoy system serif fallback) | Títulos principales, hero |
| `text-mono` | Mono system | Labels en uppercase, metadata, números |
| (default) | Sans system | Texto regular |

⚠️ **Custom fonts**: hoy se usan fonts del sistema. Pre-launch hay que cargar custom (Inter + serif display + mono). Ver [`../roadmap.md`](../roadmap.md).

### Estilos comunes

| Pattern | Cuándo |
|---|---|
| `text-mono text-[10px] uppercase tracking-[0.2em]` | Labels metadata (e.g. "EN ESTA PÁGINA") |
| `text-mono text-[11px] uppercase tracking-[0.15em]` | Section labels |
| `text-display text-2xl leading-none` | Numbers (counts, stats) |
| `text-display text-3xl sm:text-5xl leading-[0.9]` | Hero titles |

---

## Spacing / radius

| Token | Uso |
|---|---|
| `rounded-[10px]` | Botones, inputs |
| `rounded-[16px]` | Cards |
| `rounded-md` | Internal sub-cards |
| `rounded-full` | Pills, dots, avatares |

Gap stack típico de section: `space-y-4`, `space-y-5`, `space-y-8`.

---

## Componentes UI

### Button (`src/components/ui/button.tsx`)

**Variantes** (4 únicas, sin `secondary`):

| Variante | Apariencia | Cuándo usar |
|---|---|---|
| `primary` | Bg argentina-glow, text deep | Acción principal del contexto |
| `ghost` | Transparente con border `white/10` | Acciones secundarias, side actions |
| `gold` | Bg gold, text deep, font-semibold | Celebración, premium, legendary actions |
| `danger` | Outline rojo, transparente | Destructivos, irreversibles |

**Tamaños**: `sm` (h-9), `md` (h-11, default), `lg` (h-14), `full` (lg + w-full), `icon` (size-9).

⚠️ **NO existe `variant="secondary"`** — usar `ghost`. Bug histórico cometido en E3, ya corregido.

### Dialog (`src/components/ui/dialog.tsx`)

Modal central con overlay. Basado en Radix UI Dialog. Uso típico:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="bg-(--color-surface-deep) border-white/[0.08]">
    <DialogTitle className="sr-only">...</DialogTitle>
    <DialogDescription className="sr-only">...</DialogDescription>
    {/* content */}
  </DialogContent>
</Dialog>
```

⚠️ DialogTitle es **requerido por accesibilidad** (Radix lo enforce). Si no querés mostrarlo visualmente, usá `className="sr-only"`.

### Sheet (`src/components/ui/sheet.tsx`)

Drawer lateral o desde abajo (`side="bottom"`). Uso típico: ShareSheet del feature `sharing`.

### Otros primitivos
- `Input`: text input estándar
- `OtpInput`: 6 digits para email OTP en login
- `DropdownMenu`: menús contextuales
- `Tooltip`: tooltips on hover
- `Sonner`: toasts

---

## Componentes domain

### `Cromo` (`src/components/domain/cromo.tsx`)

⭐ El componente central del producto. Renderiza un cromo con su tier-specific anatomy:

| Tier | Anatomy |
|---|---|
| `common` | Marco neutro, foto estática |
| `uncommon` | Marco dorado + shimmer pass 3s |
| `rare` | Foil prismático + scanlines + glow celeste |
| `epic` | Glow violeta + sparkles ambientes |
| `legendary` | Prism rotating border + glow gold + ambient |

**Props**:
```ts
type CromoProps = {
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  name: string
  playerRole?: string
  number?: string | number
  imageUrl?: string
  seed: string                     // Para CromoPlaceholder cuando no hay imageUrl
  state?: 'idle' | 'new' | 'repeated'
  size?: 'sm' | 'md' | 'lg'
}
```

**Sizes**: `sm` (160×213), `md` (240×320), `lg` (320×427).

### `CromoPlaceholder`
SVG abstracto determinístico (por `seed`). Se usa cuando el cromo no tiene `imageUrl` (la mayoría de los placeholders del catalog YAML).

### `Sobre` (2D)
Componente visual 2D del sobre — se usa en home/listing. NO confundir con la versión 3D que está en `features/pack-opening/components/3d/`.

---

## Animaciones

### Reglas generales
- **Motion (ex Framer Motion)** para layouts y stagger
- **R3F useFrame + react-spring** para 3D
- **Tailwind transitions** para hover/focus simple
- ⚠️ Respetar `prefers-reduced-motion` siempre (hook `useReducedMotion` disponible)

### Patterns frecuentes

**Stagger fade-in** (e.g. grid de cromos):
```tsx
<motion.div
  variants={{
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
  }}
  initial="hidden"
  animate="visible"
>
  {items.map(...)}
</motion.div>
```

**Hover scale en clickables**:
```tsx
className="hover:scale-[1.03] hover:z-10 transition-all duration-200"
```

---

## Responsive

Mobile-first. Breakpoints estándar Tailwind:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px

**Grid del álbum**: 4 cols mobile → 5 sm → 6 md → 7 lg.

---

## Iconografía

- **Lucide** para todos los íconos (`lucide-react`)
- Tamaños default `size-4` (16px), `size-5` (20px), `size-3` (12px)
- Para íconos custom (e.g. PinIcon, sun argentino), SVG inline

---

## Referencias

- [`02-architecture.md`](./02-architecture.md) — Cómo se organizan los components
- [`00-product-vision.md`](./00-product-vision.md) — Por qué la paleta es así
- [`features/e1-pack-opening.md`](./features/e1-pack-opening.md) — Las animaciones más complejas del proyecto
