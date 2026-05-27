# Feature · E1.2 Pack Opening 3D

Apertura cinematográfica del sobre. Es la experiencia central del producto — lo primero que el user experimenta cada día.

**Estado**: ✅ Cerrado y funcional. Refinamientos posibles pero no críticos.

---

## Flow del usuario

1. User está en `/home` y ve el sobre diario pendiente
2. Click → navega a `/open/[packId]`
3. Server: valida pack, llama RPC `open_pack`, recibe cromos rolleados
4. Cliente: muestra cinemática completa:
   - **Phase Anticipation** — sobre flotando, tap para abrir
   - **Phase Tear** — sobre se "rompe" con efectos espectaculares
   - **Phase Stack** — cromos revelados uno por uno
   - **Phase Summary** — resumen final con CTA volver al home
5. User vuelve a home o navega al álbum

---

## Archivos

```
src/features/pack-opening/
├── actions.ts              # openPack (RPC + post-procesamiento)
├── debug-data.ts           # Mock para ?debug=true
├── types.ts                # RevealedCard, OpenPackResult, Tier
└── components/
    ├── pack-opening-flow.tsx       # Orquesta las 4 phases
    ├── phase-anticipation.tsx
    ├── phase-tear.tsx              # ⭐ Phase más compleja (3D + complete espectacular)
    ├── phase-stack.tsx             # Cards 3D revelados con CardScene3D
    ├── phase-summary.tsx
    └── 3d/
        ├── sobre-scene.tsx          # Canvas R3F + Environment HDRI + lights
        ├── pack-model.tsx           # Modelo GLTF + responsive scale + shake + isCompleting
        ├── card-mesh.tsx            # Box + border tier + avatar placeholder (sin texto 3D)
        ├── card-scene.tsx           # Canvas + HTML overlay con tilt sync
        └── _deprecated_sobre-mesh.tsx  # ⚠️ Procedural viejo, no se usa
```

Page: `src/app/(focus)/open/[packId]/page.tsx`.

---

## Decisiones técnicas

### Modelo del sobre: GLTF real, no procedural
[DECISION] Usar modelo "Trading Card Pack" by goonmize1 (CC-BY-4.0) en lugar de un sobre procedural.

**Razón**: el procedural se veía low-poly y plano. El GLTF tiene geometría real del foil arrugado.

**Files**:
- `public/models/pack/scene.gltf`
- `public/models/pack/scene.bin`
- `public/models/pack/textures/body_baseColor.png` — ⚠️ rebrand pendiente (ver [`../assets/3d-pack.md`](../assets/3d-pack.md))
- `public/models/pack/textures/body_normal.png` — OK, sin IP
- `public/models/pack/license.txt`

**Rotación**: grupos anidados (`outer Z=π/2`, `inner X=π/2`) para resolver problema de Euler XYZ que rotaba mal el modelo.

**Scale responsive**:
- desktop: 2.2
- tablet: 1.7
- mobile: 1.15

### HDRI Environment
[DECISION] Usar `Environment preset="warehouse"` de drei.

**Razón**: el modelo tiene `metalness: 0.84` y `roughness: 0.15` (muy reflejante). Sin HDRI se ve oscuro y opaco. Con HDRI warehouse genera reflejos cálidos correctos.

### Cards 3D híbridas (3D box + HTML overlay)
[DECISION] No usar `drei <Text>`. En su lugar: box 3D con border + HTML overlay para el texto.

**Razón**: incompatibilidad con three r0.184.0. El componente `<Text>` falla.

**Trade-off**: el texto del cromo es HTML 2D superpuesto, no 3D. Para mantener cohesión visual, sincronizamos el tilt del cromo 3D con el `rotateX` / `rotateY` del HTML:

```tsx
// CardMesh3D usa rotación 0.2 + 0.3 rad
// HTML overlay aplica:
transform: `rotateX(${-y*11.5}deg) rotateY(${x*17}deg)`
```

Eso hace que el texto se incline con la card en lugar de "flotar".

### Tear no es rasgado real
[DECISION] No simular rasgado físico del sobre.

**Razón**: complejo y de poco valor visual. Mejor invertir en feedback visceral con luz, partículas y movimiento.

**Implementación del "complete" espectacular** en `PhaseTear`:
1. `t=0ms`: `isCompleting=true` → sobre scale × 3.5, spin Y libre, position Z hacia adelante, emissive 1.5
2. `t=0-400ms`: Flash dorado radial expansion (white → gold → transparent) cubre fullscreen
3. `t=0ms`: 24 partículas doradas explotan 360° con jitter
4. `t=400-900ms`: flash hold + CompleteAura (sutil radial dorado/azul)
5. `t=900-1100ms`: fade out
6. `t=1100ms`: `onComplete()` → navega a `Phase Stack`

### No GSAP
[DECISION] Motion + useFrame + react-spring/three.

**Razón**: bundle más liviano, las animaciones que necesitamos están todas cubiertas.

---

## Animaciones por phase

### Phase Anticipation
- Sobre flotando con `useFrame` (small Y oscillation)
- Tap → transición a Tear

### Phase Tear ⭐
- Shake del sobre
- Build-up del glow emissive
- Trigger del "complete espectacular" (ver arriba)
- Total duration: ~1100ms desde click hasta navegar a Stack

### Phase Stack
- Cards aparecen una por una con stagger
- Cada card hace flip/reveal con animation
- Tilt en hover (3D + HTML overlay synced)
- Click → expande el cromo

### Phase Summary
- Lista de cromos rolleados con estado new/repeated
- Monedas ganadas si tuvo repetidas
- CTA: "Volver al home" o "Ir al álbum"

---

## Modo debug (`?debug=true`)

En `localhost:3000/open/[packId]?debug=true`:
- Skip total del RPC `open_pack`
- Usa `debugMockResult` con 1 cromo de cada tier (perfecto para ver todas las animaciones)
- Solo activo en `NODE_ENV=development`

Útil para iterar sobre el visual sin gastar packs reales.

---

## Errores comunes y fixes

### "column reference card_id is ambiguous"
**Síntoma**: el flow real falla en `openPack`.

**Causa**: el `RETURNS TABLE` declaraba output columns con nombres iguales a columnas reales.

**Fix**: migration `20260526120000_fix_open_pack_ambiguous_column.sql` renombra a `out_card_id`, `out_card_number`. Ver [`../05-sql-functions.md`](../05-sql-functions.md).

### Context lost en R3F (cards 3D rotas)
Si Next hot-reload demasiado o se navega muy rápido, R3F puede perder el WebGL context. Síntoma: cards aparecen sin texturas o como wireframes.

**Fix**: refresh hard de la página. En producción no debería pasar.

---

## Performance

- **Modelo GLTF cargado una vez** vía `useGLTF` de drei
- **HDRI cargado una vez** vía `Environment preset`
- Card 3D meshes son procedural (no GLTF) → cero carga extra
- Total: ~2-3MB initial download para la escena 3D completa

---

## Refinamientos posibles (no críticos)

| | |
|---|---|
| 🚧 | Sonido al abrir (sin asset todavía) |
| 🚧 | Haptic feedback en mobile (`navigator.vibrate`) |
| 🚧 | Variantes del "complete" según rareza máxima rolleada (legendary → más espectacular) |
| 🚧 | Reset del WebGL context si se detecta context loss |
| ⚠️ | Re-texturizar el sobre — ver [`../assets/3d-pack.md`](../assets/3d-pack.md) |

---

## Referencias

- [`../assets/3d-pack.md`](../assets/3d-pack.md) — Modelo GLTF, rebrand
- [`../05-sql-functions.md`](../05-sql-functions.md) — `open_pack` RPC
- [`./e1-album.md`](./e1-album.md) — Flow siguiente (después de abrir, ir al álbum)
