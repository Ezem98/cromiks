# Implementation plan · Cluster pack-opening (bajo-data + perf 3D + reveal)

**Sesión**: 31 mayo 2026
**Rama**: `feat/pack-opening-render-tier`
**Estado**: F1 + F2 completas (type-check + biome OK) · checkpoint de revisión · F3 + F4 pendientes

Refinamiento del cluster de pack-opening que quedó pendiente. Tres sub-metas:

1. **Modo bajo-data** — fallback 2D cuando el 3D es caro o no soportado
2. **Optimizar el 3D (R3F)** — bajar consumo de CPU/GPU en el path full
3. **Pulir el reveal** — más feedback visceral según rareza

---

## Premisa central (validada)

Las sub-metas 1 y 2 comparten un mismo concepto: *"¿qué tan pesado puedo renderizar?"*.
Hoy esa decisión está partida y solo mira `prefers-reduced-motion`. La unificamos en
**un solo hook `useRenderTier()`** que devuelve `'full' | 'lite'`. Los fallbacks 2D que
**ya existen** (gatados por reduced-motion) pasan a consumir el tier; no se escribe lógica
de fallback nueva.

Sin unificar, terminás con `reducedMotion` + `lowData` + `webglLost` sueltos pisándose.

---

## Estado del código antes de empezar

- **El path 2D ya existe**, solo gatado por `useReducedMotion()`:
  - `phase-anticipation.tsx` → `<Sobre>` CSS vs `SobreScene` 3D
  - `phase-tear.tsx` → `PhaseTearFallback` (`<Sobre>` + botón) vs `PhaseTear3D`
  - `phase-stack.tsx` `RevealedView` → `<Cromo>` CSS vs `CardScene3D`
- **No hay detección de device/red** en ningún lado (grep de `connection`, `saveData`,
  `effectiveType`, `deviceMemory`, probes WebGL → cero).
- **Context-loss es un callejón sin salida**: `sobre-scene.tsx` y `card-scene.tsx`
  tiran `throw` en `webglcontextlost` → cae al `Canvas3DErrorBoundary` que muestra
  *"recargá la página"* en vez de degradar al 2D que ya tenemos. (feature 3.13)
- **Perf**: `pack-model.tsx` hace `clonedScene.traverse()` **dentro del `useFrame`**
  (60×/seg) solo para setear `emissiveIntensity`. `dpr={[1,2]}` en ambos canvas.
  Los `castShadow`/`receiveShadow` son código muerto (ningún `<Canvas>` tiene `shadows`).

---

## F1 — `useRenderTier()` (la base)

**Archivo nuevo**: `src/lib/hooks/use-render-tier.ts`

API: `{ tier: 'full' | 'lite', reason, override, setOverride, degradeToLite }`

Señales que fuerzan `'lite'` (cualquiera):
- `prefers-reduced-motion: reduce`
- `prefers-reduced-data: reduce`
- `navigator.connection.saveData === true`
- `effectiveType ∈ { 'slow-2g', '2g', '3g' }`
- `navigator.deviceMemory ≤ 2` (umbral conservador y tuneable; no nukear el core)
- Probe de WebGL fallida → **floor duro**, no se puede pisar con override

Override y degradación:
- `localStorage['cromiks:render-tier']` (`'full'` / `'lite'` / ausente = auto) → toggle
  manual persistente. Pisa la detección auto (salvo el floor de no-WebGL).
- `degradeToLite()` → degradación **transitoria de sesión** (módulo en memoria, NO
  persiste). Para el context-loss: una hiccup de GPU no debe atrapar al user en lite
  para siempre.
- Sincronización entre instancias del hook (anticipation/tear/stack) vía evento custom
  `cromiks:render-tier-change` + `storage`.

SSR-safe igual que `useReducedMotion` (default neutro, recompute en mount). El 3D ya es
`dynamic({ ssr: false })`, así que no hay flash relevante.

`useReducedMotion` queda vivo (lo usa el álbum/holo); `useRenderTier` lo absorbe para el
binario full/lite.

> El toggle visible ("modo ligero" en UI/settings) NO es parte de F1/F2 — el hook deja
> `setOverride` listo para cuando se decida la superficie.

---

## F2 — migrar fallbacks + cerrar el context-loss

- `phase-anticipation.tsx`, `phase-tear.tsx`, `phase-stack.tsx`: reemplazar el gate
  `useReducedMotion()` por `useRenderTier()` → `tier === 'lite'`. Cero fallback nuevo.
- `sobre-scene.tsx` y `card-scene.tsx`: aceptar prop `onContextLost?: () => void`. En el
  handler de `webglcontextlost`: `e.preventDefault()` + `onContextLost?.()` en vez de
  `throw`. Las fases pasan `degradeToLite` → el flow re-renderiza al 2D en caliente.
  Cierra la 3.13 de verdad. El `ErrorBoundary` queda como red de último recurso para
  crashes de render reales.

**Checkpoint de revisión acá** antes de F3/F4.

---

## F3 — optimizar el path full (pendiente)

- `pack-model.tsx`: cachear los `MeshStandardMaterial` en un ref en el effect de
  `clonedScene`; iterar ese array en `useFrame` en vez de `traverse()`. Ganancia de CPU
  más clara.
- `dpr={[1, 1.5]}` en mobile (derivado de size/tier).
- Limpieza: sacar `castShadow`/`receiveShadow` muertos. (claridad, no perf)
- Opcional: HDRI más liviano o saltarlo en devices mid (en lite no se monta el canvas).

---

## F4 — reveal polish barato (pendiente)

- **Complete escalado por rareza máxima** (3.12): pasar `maxTier` (de `result.cards`) a
  `PhaseTear`; legendary → flash más grande/largo + más partículas.
- **Haptics** (3.11): `navigator.vibrate` en tear-complete y en cada reveal, guardado.
- **Sonido** (3.10): diferido (no hay asset). Dejar punto de enganche.

---

## Fuera de alcance

- Sonido al abrir (necesita asset)
- Toggle UI visible de "modo ligero"
- Rediseño grande del reveal
