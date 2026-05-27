# Re-Texturizado del Sobre — Brief de Diseño

Este sobre se basa en el modelo GLTF "Trading Card Pack" by goonmize1 (CC-BY-4.0). La textura actual de `body_baseColor.png` contiene IP de Pokémon Trading Card Game (logo, personaje Blastoise) y **NO se puede usar en producción**.

Tu trabajo: reemplazar `body_baseColor.png` con una textura propia con identidad Cromiks/Argentina. El `body_normal.png` se mantiene como está (no contiene IP, es solo geometría del foil arrugado del envase).

---

## Archivo a reemplazar

| Path | Mantener / Editar |
|---|---|
| `public/models/pack/textures/body_baseColor.png` | **EDITAR** — color, logo, diseño |
| `public/models/pack/textures/body_normal.png` | **NO TOCAR** — geometría del foil |
| `public/models/pack/scene.gltf` | **NO TOCAR** — modelo |
| `public/models/pack/scene.bin` | **NO TOCAR** — geometría binaria |

**Output**: PNG con el mismo nombre (`body_baseColor.png`) y misma resolución que el original.

---

## Cómo trabajar

### 1. Abrir la textura actual

Abrí el archivo en Photoshop / Figma / Affinity / GIMP. Vas a ver el "unwrap" UV — una imagen plana donde cada zona corresponde a una cara distinta del sobre 3D cuando se aplica al modelo.

Vas a ver claramente:
- Una zona grande con el diseño del frente (logo Pokémon + Blastoise)
- Una zona del dorso del sobre
- Bordes y solapas

### 2. Identificar el UV layout

Antes de pintar, conviene ver dónde se aplica cada zona. Subí el modelo a [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/) y rotalo. Te vas a dar cuenta de qué cara del sobre corresponde a qué área del PNG.

**Tip**: pintá temporalmente cada zona de un color sólido distinto (rojo, verde, azul, amarillo, magenta) y testeá en gltf-viewer. Eso te muestra el mapping exacto.

### 3. Restricciones de diseño

- **Mantené la resolución original**: si es 2048×2048, dejá 2048×2048
- **Mantené el PNG**: no convertir a JPG ni WebP (rompe el modelo)
- **Mantené la composición general**: el área grande del frente debe seguir siendo el frente, no podés rotar 90° o invertir
- **Si exportás desde Photoshop**: PNG-24, sin transparencia, sin metadata

---

## Identidad Cromiks

### Paleta

| Variable | Hex | Uso |
|---|---|---|
| `--color-surface-deep` | `#0A0E14` | Background principal del sobre |
| `--color-argentina-glow` | `#6BB9FF` | Detalles, líneas, glow |
| `--color-gold` | `#D4A93C` | Logo, accents premium |
| `--color-text-primary` | `#E6ECF2` | Texto principal |
| `--color-tier-rare` | `#5BA3E0` | Acentos secundarios |

### Frente del sobre — propuesta

Adaptá según gusto, pero como guía:

```
┌─────────────────────────┐
│  ★ CROMIKS              │  ← Logo grande dorado o blanco
│                         │
│                         │
│   [Silueta/ilustración] │  ← Algún elemento icónico:
│                         │     - Silueta de un jugador alzando un trofeo
│                         │     - Sol de mayo argentino estilizado
│                         │     - "Eterno Diciembre" tipográfico grande
│                         │     - Espiral de cromos cayendo
│                         │
│                         │
│                         │
│   ETERNO DICIEMBRE      │  ← Subtítulo del álbum
│   11 CROMOS DENTRO      │  ← Info funcional
└─────────────────────────┘
```

**Vibes a evitar**:
- Banderas literales (cliché)
- Mucho texto encimado
- Tipografía Comic Sans / fuentes informales
- Colores fuertes saturados que no respeten la paleta dark

**Vibes a buscar**:
- Premium, sobrio, oscuro, con un acento dorado o azul que brille bajo el HDRI
- Sensación de "edición limitada" o "coleccionable de archivo"
- Similar en lujo a packs de Topps Chrome / Panini Adrenalyn

### Dorso del sobre

El dorso puede ser:
- Pattern repetitivo sutil (sol de mayo en grilla, cromos pequeños, etc.)
- O simplemente dark con el logo "C" dorado al centro chico
- Info opcional: "Coleccioná los 205 cromos" + ícono de Argentina

---

## Iluminación

El sobre se renderea en 3D con un **HDRI "warehouse"** que genera reflejos cálidos. Tené en cuenta:

- **Las áreas dark se verán bien** (absorben el reflejo)
- **Las áreas claras o saturadas pueden quemarse** bajo el HDRI
- **El metalness del material es 0.84** → toda la textura va a verse "foil-like" / metálica
- **Roughness 0.15** → muy brillante, casi como cromo o aluminio

**Implicancia práctica**: tu diseño se va a ver con un brillo metálico aplicado encima. Si querés que algo se vea "matte", subí su valor (lighter shade) para compensar. Si querés que algo brille mucho, dejalo dark con un acento dorado/azul.

---

## Workflow recomendado

1. **Duplicar** el `body_baseColor.png` original (backup)
2. **Crear un nuevo layer** en Photoshop encima del original con opacity 30%, así ves dónde está cada zona
3. **Pintar el frente** primero (la zona más grande visible)
4. **Pintar el dorso** después
5. **Exportar como PNG-24** sobrescribiendo `body_baseColor.png`
6. **Probar en localhost**: refrescá `/open/[packId]?debug=true` y verás los cambios. Si rompió algo, hay backup.

---

## Checklist antes de hacer commit

- [ ] El PNG mantiene la resolución original
- [ ] El PNG es PNG-24 (no JPG, no PNG-8)
- [ ] No hay metadata de copyright de otras marcas
- [ ] El frente se ve bien al render 3D (sin caras espejadas o invertidas)
- [ ] El dorso se ve bien al rotar el sobre 180°
- [ ] El sobre se ve coherente bajo el HDRI warehouse (no se quema)
- [ ] Actualizar `CREDITS.md` cambiando estado de "PENDIENTE re-texturizar"

---

## Si te trabás

- **No identifico qué zona del PNG es qué cara del sobre** → pintá zonas de colores planos y testeá en gltf-viewer.donmccurdy.com
- **Mi diseño se ve muy oscuro/brillante en 3D** → el HDRI altera la apariencia. Bajá metalness en el material del GLTF si es necesario (pero idealmente acomodate al material existente)
- **El PNG se ve cuadrado pero el modelo es alargado** → eso es normal, el UV unwrap "estira" áreas. Lo que importa es la proporción del frente, no del PNG total
