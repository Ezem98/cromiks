# Assets · Modelo 3D del sobre

Modelo GLTF del sobre + texturas + rebrand pendiente.

---

## Files

```
public/models/pack/
├── scene.gltf                  # Modelo
├── scene.bin                   # Binary geometry
├── license.txt                 # Atribución CC-BY-4.0
├── REBRAND_BRIEF.md            # ⚠️ Brief para re-texturizar
└── textures/
    ├── body_baseColor.png      # ⚠️ Tiene IP de Pokemon (placeholder dev-only)
    └── body_normal.png         # OK, sin IP
```

---

## Origen del modelo

- **Nombre**: "Trading Card Pack" by **goonmize1**
- **Licencia**: CC-BY-4.0
- **Source**: Sketchfab
- **Atribución**: en `CREDITS.md` del root

### Por qué este modelo
[DECISION] En lugar de un sobre procedural (cubo + planos), usar GLTF real con foil arrugado.

**Razón**: el procedural se veía low-poly. El GLTF tiene geometría real (incluyendo el efecto "arrugado" del foil) que combinado con el HDRI warehouse da una sensación premium.

---

## Status de la textura

### `body_baseColor.png` — ⚠️ PLACEHOLDER

**Problema**: contiene IP de Pokémon Trading Card Game (logo + Blastoise). **NO se puede usar en producción**.

**Estado actual**: dev-only en localhost. Marcado en CREDITS.md.

**Acción pendiente**: re-texturizar antes del launch.

### `body_normal.png` — ✅ OK

No contiene IP. Define la geometría del foil arrugado. **No tocar**.

---

## Rebrand workflow (en curso)

### Brief detallado

Ver `public/models/pack/REBRAND_BRIEF.md` creado durante esta sesión.

### Approach elegido

[DECISION] **Workflow híbrido**: AI genera elementos (logo, sol, layout), composición manual en Photoshop/Photopea.

**Por qué no full-AI**: las AIs (DALL-E, Midjourney, Gemini) no entienden UV layouts. Si generan el PNG entero, queda con costuras, texto cortado, perspectiva incorrecta.

**Por qué no full-manual**: iteración lenta, más caro.

### Estado durante la sesión

1. ✅ Brief redactado (`REBRAND_BRIEF.md`)
2. ✅ Primera generación Gemini — cuadrada, no servía (frente del pack es vertical)
3. ✅ Prompt regenerado con aspect 2:3 vertical
4. ✅ Imagen Gemini vertical recibida — diseño OK
5. ✅ Composición en Photopea: voltear horizontal + escalar + borrar watermark
6. ⚠️ **Pending**: probar el resultado renderizado en 3D y refinar si hace falta

### Diseño elegido del frente

```
┌─────────────────────────┐
│  CROMIKS                │  ← mono dorado pequeño
│ ┌                     ┐ │  ← ornamentos art deco
│                         │
│      [sol argentino]    │  ← centro grande dorado
│                         │
│      ETERNO DICIEMBRE   │  ← serif blanco grande
│      11 cromos          │  ← mono dorado pequeño
│ └                     ┘ │  ← ornamentos art deco
└─────────────────────────┘
```

### Por qué texto espejado

⚠️ **Detalle crítico**: el modelo tiene UV mapping que voltea horizontalmente la textura al aplicarla.

- Pegar imagen tal cual → en 3D aparece espejada (texto al revés)
- **Solución**: voltear la imagen horizontalmente antes de aplicarla. El UV la voltea de vuelta → texto legible

Este es un detalle específico del modelo de goonmize1.

---

## Materiales (PBR)

El modelo tiene material PBR con:
- **metalness**: 0.84 (muy metálico)
- **roughness**: 0.15 (muy brillante)

Implicancias para la textura:
| Quiero... | Pintar... |
|---|---|
| Brillante / reflectante | Dark + acento dorado o celeste |
| Matte / sólido | Lighter shade |
| Profundidad | Usar el normal map existente |

---

## HDRI Environment

El modelo se renderea con `<Environment preset="warehouse" />` de drei. Genera reflejos cálidos típicos de warehouse (luces tungsten amarillentas).

Si cambiás el preset (e.g. `"city"`, `"studio"`), el material se va a ver distinto.

---

## Rotación / orientación

El GLTF viene con axes invertidos. Solución en `pack-model.tsx`:

```tsx
<group rotation-z={Math.PI / 2}>        {/* outer */}
  <group rotation-x={Math.PI / 2}>      {/* inner */}
    <primitive object={scene} />
  </group>
</group>
```

---

## Scale responsive

```ts
const scale = isMobile ? 1.15 : isTablet ? 1.7 : 2.2
```

Mobile más chico para que entre toda la escena (HDRI + glow ambiente).

---

## Otros assets futuros (no tenemos)

| Asset | Status |
|---|---|
| Sonido al abrir sobre | 🚧 |
| Música ambiente | 🚧 |
| Sol argentino SVG limpio (no AI) | 🚧 |
| Avatares de usuarios | 🚧 |
| Fotos reales de ~150 cromos con `photo.source: TODO` | 🚧 |

---

## Referencias

- [`../features/e1-pack-opening.md`](../features/e1-pack-opening.md) — Uso en el flow 3D
- `public/models/pack/REBRAND_BRIEF.md` — Brief detallado de diseño
- `CREDITS.md` del root
