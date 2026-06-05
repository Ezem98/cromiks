# 📋 TODOS

Deferred work captured during reviews. Each item has enough context to pick up cold.

---

## ▶️ Próximos pasos del bento de francia (orden recomendado, 2026-06-03)

Tras PR #44 (bento base) + PR #45 (design-review fixes + curación de layouts):

Critique del álbum (re-run 2026-06-04: **29 → 31/40**). Cerrado: T-08 (detalle apaisado,
PR #52), T-10 (filtros colapsables, PR #51 — ⚠️ regresó, restaurado), T-11 (foto HD 147,
PR #47), T-12 (spotlight, PR #50), T-13 + U-09 + U-12 (Tanda 1), U-17 (eager/priority 1ra
fila, PR #53), **T-14 (smoke determinístico)**, leyenda/ayuda, búsqueda + filtros-URL.

**Pendientes del critique (no bloquean la beta), orden acordado con el dueño:**
1. ~~**Leyenda/ayuda**~~ — ✅ HECHO (2026-06-04, rama `feat/album-legend-help`):
   dot de tier en cada chip de filtro (leyenda color→nombre, §4.5-OK), helper de
   "Destacar" → perfil público, y canje con copy claro ("Canjear 1 repetida por N
   monedas", sin el ● críptico ni prometer un sink que no existe).
2. ~~**Búsqueda + filtros en URL**~~ — ✅ HECHO (2026-06-04, rama
   `feat/album-search-url-filters`): buscador por nombre/número (siempre visible) +
   filtros persistidos en la querystring (`q`/`own`/`pinned`/`tiers`) vía
   `history.replaceState` (sin re-fetch) + los page-links cargan los filtros. De paso
   **se restauró el colapso mobile de T-10**, que había regresado (el commit de Tanda 1
   pisó el de PR #51 — ver T-10 abajo). Lib pura `filters-url.ts` + tests.
3. ~~**T-15** · reveal del sobre apaisado~~ — ✅ HECHO (2026-06-04, rama
   `feat/reveal-apaisado`): el summary 2×2 + el fallback lite muestran los cromos
   en su ratio (el reveal 3D, procedural, queda igual). **Critique del álbum: backlog
   CERRADO.** Ver abajo.

---

## T-01 · Legendary still-image rights (pre-beta risk)

**What:** Decide and implement a rights-safe source for the *still image* on each legendary cromo.

**Why:** The catalog marks all 11 legendaries' photos as `type: video_capture` (frame-grabs of broadcaster footage). The PR8 beta plan dodges *clip* rights by embedding the official YouTube highlight ("Ver el momento"), but the still frame printed on the cromo itself is the same owned footage. This carries the same IP exposure as the Pokemon pack texture the product treats as a hard launch gate. Surfaced by the /plan-eng-review outside voice (2026-05-30).

**Pros:** Removes a launch-blocking IP risk hiding in plain sight; keeps the "zero third-party IP" product value honest.
**Cons:** Real content/legal work; may force a stylized/illustrated treatment instead of photoreal stills.

**Context:** Options to evaluate — licensed stills (Getty/AP), self-produced illustration of the moment, or a deliberately stylized non-photographic legendary treatment. The clip embed stays regardless. Affects the curated beta page since it must contain legendaries (see beta plan step 3).

**Depends on:** La página héroe de la beta es **francia (la final)** → las legendarias cuyos stills importan son 141 (Di María), 147 (atajada del Dibu), 156 (Montiel) y 165 (beso a la copa). (croacia fue candidata vieja, descartada como página de beta.)

**Estado (2026-05-31):** Se consideró resolverlo con ilustración de firma para los héroes (cero IP en los stills) pero el usuario **descartó la ilustración: el álbum va foto real en los 205**. Por lo tanto T-01 **sigue ABIERTO** — los stills de legendarios van por la postura foto + crédito + takedown del pipeline de imágenes (design doc `~/.gstack/projects/Ezem98-cromiks/emachado-feat-pack-opening-render-tier-design-*.md`), que es la máxima exposición legal del álbum. Si la postura takedown no alcanza para los momentos más litigados, este TODO es dónde reconsiderarlo.

---

## T-02 · Beta lifespan / page-2 expansion lever

**What:** Instrument curated-page completion time; keep page 2 ready to activate mid-beta.

**Why:** A ~15-20 card one-page pool with a 4-card daily pack completes in roughly 1-2 weeks, after which every pack is pure duplicates and the daily loop goes flat. For a soft beta meant to observe behavior over time, the experience could die before enough watching happens. Surfaced by the /plan-eng-review outside voice (2026-05-30).

**Pros:** Turns a structural limitation into a planned lever; `pages.is_active` makes expansion a one-line `UPDATE pages SET is_active=true`.
**Cons:** Requires a completion-time metric and a second page's content ready to go.

**Context:** Directly enabled by the `pages.is_active` mechanism chosen in the PR8 plan. Watch median time-to-complete the curated page across the cohort; if it's days, flip page 2 on. No code change needed to expand, only content + the flag flip.

**Depends on:** PR8 beta (`pages.is_active` + per-card weighted draw) shipped.

---

## T-03 · Full legendary treatment (post-beta depth upgrade)

**What:** Build out the complete DESIGN.md 12.5 legendary treatment per hero cromo, beyond the beta's reverent-minimal slice.

**Why:** The beta ships a deliberate subset (prism border + cinematic entrance + click-gated clip facade + `LegendaryBrief` text) to prove the "magic is real" in one month. DESIGN.md 12.5 specifies far more: holographic refraction, ambient particles, glow-rotation, unlimited mouse-tilt, unique ambient audio + comentarista relato, and bespoke-per-cromo design. That depth is what makes a legendary feel legendary on the 100th view. Surfaced by /plan-design-review (2026-05-30).

**Pros:** Delivers the full emotional ceiling of the product's signature feature; differentiator vs a static album.
**Cons:** Heavy (R3F/audio/per-cromo custom work); gated on content + rights (T-01); against the beta perf budget if done naively.

**Context:** Beta validates the wedge with motion+clip. This is the layered upgrade once the cohort confirms the magic lands and the still-image/audio rights (T-01) are resolved. Do it per-cromo, hero first. Keep the 13.4 perf budget (lazy-load all cinematic animation).

**Depends on:** T-01 (legendary rights) + beta learnings (did the magic land?).

---

## T-04 · El álbum no refleja la restricción de página activa (beta UX) — ✅ HECHA

**Resuelto:** `getAlbumData` (`queries.ts`) scopea al set activo vía `resolveActivePageIds` — solo muestra las páginas `is_active` y el contador "X / N" va sobre lo obtenible (no sobre 205). La beta queda en **francia** (page 8): el álbum muestra francia y el contador sobre sus 30. Contexto original abajo.

**What:** En la beta, el álbum mostraba las 10 páginas y 205 slots como obtenibles, pero solo la página activa (francia, ~30 cromos) se puede sortear (`pages.is_active`). El contador "X / 205" se topaba y las otras páginas no se completaban nunca.

**Why:** `getAlbumData` (`src/features/album/queries.ts`) trae las 10 páginas y `totalCards: 205` hardcodeado, sin filtrar por `is_active` — solo `roll_cards` respeta la restricción. Un beta-tester ve 9 páginas que no puede llenar y un progreso que nunca llega a 205 → confuso, parece roto. Encontrado verificando el flujo e2e (2026-05-30).

**Pros:** Sin esto la beta se siente incompleta aunque funcione mecánicamente.
**Cons:** Toca el álbum (queries + UI del nav/contador), no es trivial.

**Context:** Opciones — (a) mostrar solo la(s) página(s) activa(s); (b) marcar las inactivas como "Próximamente"/locked; (c) que el target de completion sea el set activo (~15), no 205. Recomendado: (b) + contador sobre el set activo. Punto de cambio: filtrar/anotar `getAlbumData` por `is_active` (join a `pages`).

**Depends on:** pack-pool (ya en main). Hacer ANTES de invitar la cohorte.

**Priority:** P1

---

## T-05 · CI de validación del catálogo (crédito obligatorio)

**What:** GitHub Action que parsea `catalog/*.yaml` y falla el PR si algún asset con `status: published` no tiene `credit` + `author` + `license`.

**Why:** La postura legal del álbum (scrape-anything con crédito + takedown, decidida 2026-05-31 con asesoría legal) depende de que NINGUNA foto se publique sin atribución. La CLI ya valida al escribir, pero una edición a mano del YAML que se saltee la CLI puede publicar sin crédito y nadie lo atrapa. Surgido en /plan-eng-review (2026-05-31).

**Pros:** Enforced a nivel CI el invariante "published ⇒ tiene crédito"; red de seguridad contra ediciones manuales.
**Cons:** No bloquea la beta (la CLI ya cubre el caso normal); scope extra de workflow.

**Context:** Punto de cambio: `.github/workflows/`. El validador puede reusar el parse del catálogo. Va de la mano del schema nuevo del bloque `photo` (`source_url`/`asset`/`credit`/`author`/`license`/`legal_posture`/`status`). Ver design doc `~/.gstack/projects/Ezem98-cromiks/emachado-feat-pack-opening-render-tier-design-*.md`.

**Depends on:** Pipeline de imágenes (schema nuevo + `card_assets`) shipped.

**Priority:** P3 (post-beta)

---

## T-06 · `parse_focal` borrado en `chore/react-doctor-cleanup` (posible baja no intencional)

**What:** Revisar el diff de la rama `chore/react-doctor-cleanup`: borró `parse_focal` + el crop focal de `scripts/assets/imaging.py` (~70 líneas) y cobertura de `test_imaging.py`. Confirmar si fue intencional y o revertirlo o abandonar la rama.

**Why:** Una rama de cleanup de lint TS borrando lógica Python de cropping huele a baja accidental. `parse_focal` vive en `origin/main` (`imaging.py:120`) y es la base del pipeline de ratios (T-07/feature bento). Si esa rama se mergea, rompe silenciosamente el crop focal de TODAS las fotos. Surgido en /plan-eng-review (2026-06-03).

**Pros:** Evita una regresión silenciosa del pipeline. **Cons:** Ninguno real, es chequeo.

**Context:** No bloquea el feature bento (se implementa desde `origin/main`, donde focal está). Comparar `git show chore/react-doctor-cleanup:scripts/assets/imaging.py` vs `origin/main`. **Priority:** P1 si esa rama está por mergearse, sino P3.

---

## T-07 · `generatePlaceholders` muerto + `rarity_distribution` desfasado (limpieza seed)

**What:** El catálogo ya define los 205 `card_number` sin huecos → `generatePlaceholders` (`scripts/seed.ts:175`) genera 0 placeholders, y `rarity_distribution` del YAML está desfasado (uncommon 57≠55, rare 17≠14, epic 7≠12). Borrar/simplificar la lógica muerta y reconciliar o eliminar `rarity_distribution`.

**Why:** Código muerto que confunde a quien lea el seed (indujo un razonamiento equivocado en el design doc del bento). No rompe nada. Surgido en /plan-eng-review (2026-06-03).

**Pros:** Limpia una fuente de confusión; el seed dice la verdad. **Cons:** Toca seed.ts sin valor de feature; mejor no mezclarlo con un PR de feature.

**Context:** Ver [[cromiks-catalog-saturates-205]]. Hacer en un PR de limpieza aparte. **Priority:** P3.

---

## T-08 · detalle del cromo con ratios apaisados — ✅ HECHA (2026-06-04, rama `fix/album-detail-ratio`)

**Resuelto (solo-detalle):** el modal de detalle muestra el cromo en su ratio BASE
(portrait 3:4 / landscape 3:2 / pano 2:1), no recortado a 3:4. Cambios:
- **Fuente única del layout** en `src/lib/cards/photo-layout.ts` (`PhotoLayout`,
  `PHOTO_LAYOUT_RATIO`, `parsePhotoLayout`). `bento-layout.ts` reexporta el ratio
  desde ahí (sin duplicar números). El layout sale de `content.photo.layout`, que el
  seed ya guarda en `cards.content` → `queries.ts` lo proyecta a `AlbumCardSlot.layout`
  (free, el `content` ya se traía).
- **`<Cromo>`** toma `ratio` (ancho fijo por `size`, alto = ancho/ratio; portrait
  reproduce EXACTO los tamaños viejos), `diptych` + `gutter` (overlay del gutter de
  álbum físico). Dimensiones en `cromo-dimensions.ts` (puro, testeado). Nameplate baja
  padding en cromos anchos (`wide`) para no comerse la foto.
- **`card-detail-dialog.tsx`** recibe `pageNumber`, resuelve el ratio de `card.layout`
  y el díptico de `getBentoCell` (su identidad de grilla).

**Decisiones (resueltas con el dueño 2026-06-04):**
1. Fuente del layout → **(b)** `content.photo.layout` (PR1 ya mergeado; la objeción
   "toca el read-path" quedó obsoleta).
2. Ratio del detalle → **base del cromo**, no el override de grilla (139 detalle = 3:2,
   no banda 21:9). Verificado por test.
3. Díptico 136 → **conserva el gutter** en el detalle.
4. Reveal → **descopeado** (solo-detalle). Ver T-15.

**Verificación:** e2e `tests/e2e/album-detail-ratio.spec.ts` (mide el bounding box del
`.cromo` por layout — determinístico, NO depende del backend como el smoke) + 8 unit
tests (`photo-layout.test.ts`, `cromo-dimensions.test.ts`) + type-check + lint. Capturas
de portrait/landscape/pano/díptico OK en vivo (el díptico muestra el gutter).

<details><summary>Contexto original (resuelto)</summary>

**What:** Adaptar `src/components/domain/cromo.tsx` (`sizeMap` 3:4 fijo → ratios variables: frame/nameplate/número apaisados) y `src/features/pack-opening/components/3d/card-mesh.tsx` (pasar w/h apaisado al `planeGeometry`) para que los cromos anchos se vean en su ratio en el detalle y en el reveal del sobre.

**Why:** PR1 (bento en la grilla) shippea sin esto; mientras tanto un cromo ancho se ve recortado a 3:4 en el modal de detalle (`<Cromo>` con object-cover) y en el reveal 3D. Degradación aceptada para la ventana de PR1 (decisión /plan-eng-review 2026-06-03), no rota. Fast-follow.

**Pros:** Cierra la experiencia del ancho en todas las superficies. **Cons:** Toca 3D (R3F) + el componente del cromo; menor que PR1.

**Context:** `<Cromo>` se usa solo en `card-detail-dialog.tsx`. El reveal NO usa `<Cromo>` (usa `card-mesh`). `card-mesh` ya parametriza `planeGeometry args={[w,h]}` → recibe otro w/h. **Depends on:** PR1 del bento. **Priority:** P2 (fast-follow post-PR1).

**Feedback del dueño (2026-06-03, viendo PR #44 en vivo):** "cuando clickeás/tapeás un cromo para verlo en detalle la vista sigue siendo siempre portrait, no respeta si es horizontal" — fue lo PRIMERO que notó. **P1 post-merge** (PR #45), antes de invitar testers.

### Discovery map (para agarrar en frío)
- **Detalle:** `src/components/domain/cromo.tsx` — `sizeMap` 3:4 fijo (sm 160×213, md 240×320, lg 320×427); frame/bisel, nameplate (`pt-7 pb-4`) y badge de número asumen portrait. Foil/glare/holo YA es ratio-agnóstico (`background-size: %`). Se usa SOLO en `card-detail-dialog.tsx` (pasa `size="md"` fijo).
- **Reveal:** `src/features/pack-opening/components/3d/card-mesh.tsx` — ya parametriza `planeGeometry args={[w,h]}` por props; recibe otro w/h. Ojo `phase-stack.tsx` / `phase-summary.tsx` (stack + resumen, asumen vertical).
- **Layout source:** vive en 2 lados que no se hablan — catálogo `content.photo.layout` (pipeline Python) y const frontend `src/features/album/bento-layout.ts` (keyed por page+cardNumber, solo francia). Presets: portrait 3:4 / landscape 3:2 / pano 2:1 (`LAYOUT_RATIO`).

### Decisiones abiertas (resolver con el dueño ANTES de implementar)
1. **De dónde sale el `layout` de un cromo cualquiera** para detalle/reveal:
   (a) lookup desde `bento-layout.ts` por (page, cardNumber), default portrait — el reveal tiene que saber la página; (b) proyectar `layout` en `queries.ts`/rolled cards — una fuente para todas las superficies pero toca el read-path que evitamos en PR1.
2. **Ratio del detalle:** ¿base del cromo (139 = landscape 3:2) o el override del bento (139 se muestra banda 21:9 en grilla)? Instinto: base; las bandas 21:9 son solo diagramación de grilla.
3. **El díptico (136) en el detalle:** ¿mantiene el gutter de álbum físico (identidad) o landscape normal? 1 caso especial.
4. **Reveal apaisado:** cómo cae una landscape/pano en el stack 3D + en el summary que hoy asume vertical, sin romper la animación.

### Tests
vitest + playwright (sin RTL): render del cromo en cada ratio + reveal de un ancho.

</details>

---

## T-15 · Reveal del sobre apaisado (descopeado de T-08) — ✅ HECHA (2026-06-04, rama `feat/reveal-apaisado`)

**Resuelto (scope: las superficies que muestran la foto):** el **summary 2×2** (`phase-summary.tsx`, se ve en CADA apertura) y el **fallback lite** (`phase-stack.tsx`) muestran los cromos en su ratio (no recortados a 3:4). Plumbing: `getCardLayoutMap` (nuevo, `src/lib/cards/`, reusa `parsePhotoLayout` de T-08) se llama **en paralelo** al image-map en `actions.ts` (sin round-trip en serie, sin migración SQL) → `RevealedCard.layout` → `<Cromo ratio={...}>`. El summary usa `place-items-center` para que los ratios mixtos queden prolijos. **Decisión del dueño:** el **reveal 3D queda igual** — es procedural (no muestra la foto), apaisar su caja sería cosmético; texturizar el 3D con la foto real quedó como idea aparte (más grande, fuera de P3). Verificado: e2e `reveal-summary-ratio.spec.ts` (debug mode, mide el ratio del `.cromo` en el summary) + captura en vivo (Dibu landscape entre portraits) + type-check + lint + 48 unit. Contexto original abajo.

<details><summary>Contexto original (resuelto)</summary>

**What:** Que el reveal del sobre muestre los cromos anchos en su ratio. Dos partes:
(a) la geometría del card-mesh 3D + el stack (240×320 fijo en `phase-stack.tsx`) + el
summary (`phase-summary.tsx`), que hoy asumen portrait; (b) plumbear el `layout` al
`RevealedCard` para que el fallback **lite** (que usa `<Cromo>`, ya ratio-ready tras
T-08) renderee apaisado.

**Why:** En T-08 (2026-06-04) el dueño descopeó el reveal a "solo detalle". El reveal 3D
es **procedural** — NO muestra la foto (caja + borde de tier + avatar + texto HTML), así
que respetar el ratio ahí es geometría cosmética. La foto en su ratio solo se vería en el
fallback lite (raro: solo en devices de baja capacidad / context-loss de WebGL).

**Context / por qué no se hizo en T-08:** el `layout` vive en `cards.content`, no en
`card_assets` (lo que ya trae el open_pack vía `getCardImageMap`). Plumbearlo al
`RevealedCard` exige **un round-trip extra en el hot-path de CADA apertura** (query a
`cards`) o agregar la columna al SELECT del RPC `open_pack`. Lo segundo es lo correcto
(cero round-trip) y va con esta tarea, no taxando el open_pack por un fallback raro.
`<Cromo>` ya acepta `ratio` desde T-08, así que el lite es ~3 líneas una vez que el dato
llega. Punto de cambio: `open_pack` (SQL, agregar `content->'photo'->>'layout'`) o
`actions.ts` (fetch defensivo) → `types.ts` (RevealedCard.layout) → `phase-stack.tsx`
(lite pasa `ratio`) + geometría 3D si se quiere (a). **Priority:** P3 (post-beta; el 3D
sin foto no molesta hoy).

</details>

---

## T-09 · "Se arma con 2 mitades" de verdad (post-beta, con pity)

**What:** La mecánica de coleccionable real: dos cromos sorteables (ej. 136a/136b) que con ambos forman una foto continua, con media-foto+silueta si tenés uno solo. En la beta se shippeó como **díptico solo-presentación** (un cromo ancho, sin mecánica) por el riesgo de pool chico.

**Why:** En un pool de ~31 con reemplazo, la probabilidad de juntar las dos mitades específicas es baja → el flagship se ve mitad-armado para casi todos (outside voice, /plan-eng-review 2026-06-03). Para hacerlo bien hace falta un **pity/garantía** (ej. la segunda mitad cae garantizada tras N sobres si ya tenés la primera) + manejar el reveal apaisado + OG/share por-mitad + el conteo (sube a 206, ver design doc original).

**Pros:** El gancho de coleccionable analógico real ("me falta la otra mitad"). **Cons:** Toca `roll_cards`/`open_pack` (engine), completion, OG, reveal; pool grande lo hace viable (post-beta con más páginas activas).

**Context:** Design doc original (`~/.gstack/projects/Ezem98-cromiks/emachado-main-design-20260602-213047.md`, secciones originales) tiene el modelo de dos filas detallado. Reconsiderar cuando el pool sea más grande y haya un pity diseñado. **Depends on:** beta learnings + pool expandido (T-02). **Priority:** P3 (post-beta).

---

## T-10 · Filter chips colapsables en mobile — ✅ HECHA (PR #51) · ⚠️ REGRESÓ · ✅ RESTAURADA (2026-06-04, rama `feat/album-search-url-filters`)

**Resuelto + regresión:** toggle "Filtrar" (solo mobile, `sm:hidden`) con badge de conteo; posesión + destacadas + rarezas colapsan adentro, el buscador queda siempre visible. Se shippeó en PR #51 (commit `b2bd37d`) pero **regresó**: el commit de Tanda 1 / T-13 (`7f81cc9`), cortado de un main pre-T-10, pisó `album-filter-bar.tsx` al mergear después (y también borró esta nota del doc — por eso quedó el "What" viejo abajo). Detectado al arrancar búsqueda+filtros-URL (git: `b2bd37d` no estaba en la lineage del archivo). **Restaurado** junto con el buscador. Lección: rama cortada de main viejo que toca el mismo archivo que una hermana ya mergeada → clobber silencioso; ver [[git-commit-hook-slash]] vecino. Contexto original abajo.

**What:** En mobile (375px) los chips del filtro del álbum (`album-filter-bar.tsx`) ocupan ~3 filas (Todas / Las que tengo / Las que me faltan / Destacadas / Común / Poco común / Rara / Épica / Legendaria) ANTES del primer cromo — el díptico hero de francia queda medio empujado bajo el fold. Colapsar: una fila scrolleable horizontal, o un botón "Filtrar" que expande.

**Why:** La audiencia es smartphone-first (DESIGN.md §1.5) y la apertura de francia (el plantel campeón a todo el ancho) es el primer impacto del bento — hoy se pierde detrás de una pared de botones. Encontrado en /design-review del bento (2026-06-03, F-005); pre-existente, fuera del diff de PR #44.

**Pros:** La página abre con el hero, no con UI utilitaria; menos scroll para llegar al contenido. **Cons:** Toca un componente compartido (filter bar) que usan todas las páginas del álbum; pide su propio mini-QA.

**Context:** Punto de cambio: `src/features/album/components/album-filter-bar.tsx`. Capturas en `~/.gstack/projects/Ezem98-cromiks/designs/design-audit-20260603/screenshots/m1-top.png`. **Priority:** P2 (antes de invitar la cohorte mobile-first idealmente).

**Re-confirmado en vivo (/impeccable critique álbum, 2026-06-03):** medido 238px / ~28% del fold mobile (5 filas wrapped, 9 controles). Fix recomendado: colapsar tras un botón/sheet "Filtrar" (default cerrado, badge con conteo de filtros activos); dejar posesión como único control siempre visible, tiers + Destacadas adentro. Capturas en `.impeccable/critique/shots/album-mobile-top.png`.

---

## T-11 · Curación de layouts del bento de francia — ✅ HECHA (2026-06-03, commit 0b530c6)

**Resuelto:** pasada foto-por-foto con el dueño. Cambios aplicados (yaml + re-crop R2 + const + tests + seed, todo en `feat/album-bento-francia`): 137/138→landscape, 143/144/164→portrait, 147→landscape (foto IG actual, sin foto nueva), 150/153→landscape, 139/148/155→bandas 21:9, 160→landscape; la tanda pasó de strip uniforme a CRESCENDO. Suite verde, verificado en vivo (19/19 imgs).

**Remanente — ✅ HECHO (2026-06-04, PR #47):** llegó la foto HD icónica (goal.com 1920×1080, Dibu estirando la pierna). 147 → PANO full-row con esa foto. De paso se corrigió la jerarquía de bandas: full-row es SOLO momentos argentinos (139/147/156); 148 y 155 (penales franceses) bajaron de banda; el alargue 143-146 pasó a flurry de 4 celdas chicas. Nada pendiente del 147.

<details><summary>Contexto original (resuelto)</summary>

**What:** Revisar FOTO POR FOTO los 30 cromos de francia y corregir el layout asignado en PR #44: hay fotos que deberían ir horizontales (simple o doble) y quedaron portrait, y otras que se hicieron anchas y deberían volver a portrait. Cada corrección toca DOS lugares acoplados: `catalog/eterno-diciembre.yaml` (`content.photo.layout` → re-crop con `--force` + `pnpm seed`) y `src/features/album/bento-layout.ts` (el placement: las filas deben volver a sumar 4 con armonía de alturas — `bento-layout.test.ts` explota si no, intencionalmente).

**Why:** Los layouts de PR1 se asignaron por TIPO de momento (gol → ancho) sin ver cada foto real; la pasada del dueño (2026-06-03) encontró mismatches en ambas direcciones. El layout correcto es una decisión por-foto, no por-categoría.

**Caso específico — 147 (atajada del Dibu), corrige una nota equivocada del PR:** NO hace falta una foto de 2400px. El piso real del pano con tolerancia 1.12 es **≥1429px de ancho**; y la foto IG actual (1080) **probablemente ya pasa como `landscape`** (crop 1080×720 ≥ piso 1071 — verificar con `--dry-run`). Opciones: (a) re-tagear 147 a landscape hoy con la foto actual (la celda puede quedar pano —recorta 25% de alto, la atajada es horizontal, puede funcionar— o pasarse a landscape full-row), (b) curar cualquier fuente ≥1429px si se quiere mantener el crop pano nativo. Hoy 147 sigue sirviendo el WebP portrait viejo dentro de la celda pano (recortadísimo).

**Pros:** El bento queda curado de verdad (por ojo, no por heurística); 147 deja de verse roto. **Cons:** Re-crops + re-pack del placement; toca el const y el catálogo en sincronía.

**Cómo encararlo:** sesión asistida — el agente baja y MUESTRA cada foto de francia (puede leer imágenes), el dueño decide portrait/landscape/pano por cada una, y al final se re-empaqueta el placement una sola vez, se corre `cli.py --only <ids> --force` + `pnpm seed` + suite. Capturas de referencia del estado actual en `~/.gstack/projects/Ezem98-cromiks/designs/design-audit-20260603/`.

**Depends on:** PR #44 mergeado (o sobre la misma rama antes del merge). **Priority:** P1 — es curación visible del contenido de la beta.

</details>

---

## T-12 · Álbum vacío se lee como deuda — valle de apertura del hero-slot (primer uso de la beta) — ✅ HECHA (2026-06-04, PR #50)

**Resuelto:** `AlbumSpotlight` (`src/features/album/components/album-spotlight.tsx`) arriba de la grilla. Variante "tu mejor cromo" (mayor rareza, desempata por más reciente) con `<Cromo>` real + copy celebratoria + barra de progreso + CTA al sobre; variante primer-uso (0 owned) con siluetas de anticipación + CTA. Se auto-retira al 50% del set activo (sin flag de dismiss). Va arriba de la filter bar (empuja la pared de filtros en mobile, gana terreno para T-10). No toca el bento. Verificado en vivo (8/30 → variante mejor-cromo, desktop + mobile) + type-check + lint + 21 tests. Contexto original abajo.

**What:** Para un usuario con poco llenado, la página francia abre con el primer cell = el díptico 136 (el XI campeón) que casi nadie tiene temprano → un vacío grande de puntos fantasma punteados como PRIMER impacto cada sesión. Diseñar el primer uso: spotlight celebratorio de los cromos que SÍ tenés + camino visible a abrir sobres + una invitación cálida en el díptico vacío en estados low-fill (sin tocar el bento de PR #44, que es fuerte).

**Why:** El norte emocional del producto es asombro → nostalgia activa → orgullo (PRODUCT.md / DESIGN.md §2.4). El álbum es la sala de trofeos; abrir cada sesión contra un vacío invierte el peak-end (lo primero y lo último que ves es "lo que te falta", no "lo que lograste"). Encontrado en `/impeccable critique álbum` en vivo (2026-06-03), juzgado a dos niveles de llenado: a 63% es orgullo claro, a 27% el opening es un valle. El fantasma en sí está bien hecho (siluetas low-opacity, pip de tier de foreshadowing) — el problema es que el slot HERO esté vacío, no el tratamiento del fantasma.

**Pros:** Hace orgullo el peak-end del primer uso de toda la beta de junio; ataca el red flag #1 del "coleccionista nostálgico" (daily login). **Cons:** Toca la composición de la apertura del álbum (no el bento per se); pide decidir entre seedear una carta de alto impacto arriba vs liderar con owned en low-fill vs invitación cálida en el díptico vacío.

**Context:** Punto de cambio probable: `album-view.tsx` (orden/empty del hero) + posible coordinación con el primer sobre (qué cae). Relacionado con U-02 (empty states humanizados) y U-05 (onboarding visual) en [`docs/improvements.md`](docs/improvements.md), pero más específico. Pregunta abierta del critique: ¿el tratamiento "foto real atenuada detrás del vidrio" del diálogo de legendaria faltante podría llevarse a los slots fantasma de la grilla? (deuda → tease). Snapshot: `.impeccable/critique/2026-06-04T02-41-00Z__src-app-app-album-page-tsx.md`. Plan acordado: hacerlo DESPUÉS de la Tanda 1 (T-13 + U-09 + U-12).

**Depends on:** nada técnico; idealmente antes de invitar la cohorte (es su primera impresión).

**Priority:** P1

---

## T-13 · Color de tier se fuga al chrome del álbum (viola §4.5) — ✅ HECHA (2026-06-04)

**Resuelto:** `album-filter-bar.tsx` usa un único `chipActive` (argentina-glow) para posesión, destacadas y tier; se borró `tierActiveClasses`. Verificado en vivo (los 3 chips activos rinden `rgb(107,185,255)`), type-check + lint + 21 tests verdes. Decisión registrada en [DESIGN.md §4.5](DESIGN.md). Contexto original abajo.

**What:** Los chips de filtro activos de `album-filter-bar.tsx` usan color de tier (chip "Legendaria" gold, "Rara" celeste, "Destacadas" gold). Pasarlos al tratamiento neutro único (`--argentina-glow`, como ya hacen los chips de posesión). Si hace falta identidad de tier, un puntito de color adentro del chip — nunca el chip entero.

**Why:** DESIGN.md §4.5 (principio 1 del design system) es explícito: el color de tier vive **exclusivamente en los cromos**, nunca en UI general. La fuga diluye el lenguaje de rareza (gold debería significar "cromo Legendary", no "filtro prendido") y genera un doble-activo visual (chip "Todas" azul + chip de tier gold prendidos a la vez = dos sistemas de "seleccionado" en conflicto). Detectado en vivo en `/impeccable critique álbum` (2026-06-03); el detector in-page también lo marcó (`ai-color-palette` sobre el violeta épico).

**Pros:** Honra el principio 1 del design system; hace el register más confiado. **Cons:** Toca un componente compartido por todas las páginas del álbum (pide su mini-QA, igual que T-10).

**Context:** Punto de cambio: `src/features/album/components/album-filter-bar.tsx`. **Decisión del dueño (2026-06-03): el filtro está mal, no la regla** — §4.5 manda. Ver también U-26 en [`docs/improvements.md`](docs/improvements.md) (mismo finding, este TODO es el home con contexto). Capturas: `.impeccable/critique/shots/album-filter-legendary.png`, `album-filter-empty.png`. Plan acordado: Tanda 1 (junto con U-09 contraste + U-12 touch targets).

**Priority:** P2

---

## T-14 · Smoke E2E flaky (depende del estado vivo del backend) — ✅ HECHA (2026-06-04, rama `test/smoke-deterministic`)

**Resuelto (opción a + c):** `global-setup` siembra un pack daily PENDING (admin insert, bypassa RLS) → el home muestra "Abrir sobre" (modo `hasPending`), así el smoke abre ESE pack en vez de reclamar uno en runtime. Saca la dependencia de `claim_daily_pack` (rate-limit Upstash + disponibilidad diaria + cold-start del home) que flakeaba. `open_pack` sigue rolando las cartas al abrir → la cobertura del golden path real (B-22/B-23 idempotencia) se mantiene; solo el CLAIM se pre-hace en setup. Además (c): se warmea `/album` en global-setup y se subió el timeout del primer botón del home a 25s (cold-compile CI). Verificado: 2 corridas full verdes local (golden path + debug UI), type-check + lint. **Tradeoff:** el claim runtime ya no se ejercita en e2e (es lógica simple; lo valioso es la idempotencia del open). Contexto original abajo.

<details><summary>Contexto original (resuelto)</summary>

**What:** Hacer el smoke golden-path (`tests/e2e/smoke.spec.ts`: home → reclamar sobre → abrir → álbum) determinístico, para que no flakee en PRs que no tocan ese flow.

**Why:** El test crea un usuario fresh (global-setup vía generateLink) y **reclama un sobre diario REAL** contra Supabase + el pool `pages.is_active` + Upstash. Es no-determinístico: un render lento del home (>10s en cold-start CI), un daily-pack no reclamable, o un blip de Supabase tumban el test sin importar el diff. Confirmado: falló en PR #49 (solo-docs, no toca home ni el contador del álbum) buscando el botón "Reclamar sobre diario" (línea 24) y el contador "X / N" (línea 51); al re-correr con los MISMOS docs pasó limpio (2026-06-04). Los retries de Playwright no ayudan porque el estado del backend persiste entre intentos (si el user quedó sin pack reclamable, sigue sin pack).

**Pros:** CI confiable; deja de asustar/bloquear en PRs no relacionados. **Cons:** Trabajo de test infra; mockear el backend reduce la cobertura "real" del golden path (que es justamente lo que valida B-22/B-23, la idempotencia del open_pack).

**Context:** Opciones — (a) seedear un pack pending determinístico en `global-setup` en vez de depender de `claim_daily_pack` en runtime; (b) tolerar el caso "ya reclamado" (si el user ya tiene pack pending, saltar el claim y abrir el pending); (c) subir timeouts del home (cold-start CI a veces > 10s); (d) aislar el flow del estado del pool activo. Recomendado: (a) + (c) — mantiene la cobertura del open_pack real pero saca la dependencia del claim runtime. Punto de cambio: `tests/e2e/smoke.spec.ts` + `tests/e2e/global-setup.*`. Ver [[cromiks-local-visual-qa-quirks]] (el daemon e2e y la sesión fresca por generateLink).

**Priority:** P2 (molesta pero no bloquea; el rerun lo resuelve mientras tanto).

</details>

---

## T-16 · El E2E corre contra prod — aislar a Supabase local — ✅ HECHA (2026-06-05)

**Resuelto (Supabase local en CI, NO staging dedicado — decisión del dueño):** el e2e ya no toca
prod. Salió en **2 PRs**:

- **PR1 `chore/db-baseline`** (commit `9905700`): el repo no podía recrear su DB (solo parches
  incrementales). Se generó `supabase/migrations/00000000000000_baseline.sql` (dump del schema de
  prod + el trigger `on_auth_user_created` que `db dump` no captura), se archivaron las 18
  incrementales en `_archived_migrations/`, y se agregó `config.toml` (analytics/storage off).
  Ver [[cromiks-migrations-not-self-contained]].
- **PR2 `chore/e2e-local`**: el job `e2e` de `ci.yml` ahora hace `supabase start` (aplica el
  baseline) → `supabase status -o env --override-name …` (exporta URL+keys del stack local, sin
  secrets de prod) → `pnpm seed` → `pnpm test:e2e`. `global-setup.ts` activa la página francia
  (`pages.is_active`, que el seed no setea). Doc en `migrations.md`.

**Verificado local (Docker):** `supabase start` aplica el baseline exit 0; el seed corre
(205 cromos, 31 published); **los 11 e2e pasan contra `127.0.0.1:54321`** (incl. el smoke golden
path), no contra prod. **Pendiente al mergear PR1:** `supabase migration repair` en prod (ver
`_archived_migrations/README.md`). Contexto original abajo.

<details><summary>Contexto original (resuelto)</summary>

**What:** El `tests/e2e/global-setup.ts` corre contra la **DB de prod** (`oaussuztahdxivemqbnd`, confirmado por el dueño 2026-06-04): crea/borra el user `PLAYWRIGHT_TEST_USER_EMAIL` y siembra packs ahí, en cada PR (CI) y en cada corrida local. Apuntar el E2E a un proyecto Supabase de **staging** (env aparte para CI) y dejar prod solo para usuarios reales.

**Why:** Con usuarios reales en la beta, correr el suite contra prod es riesgo innecesario: el global-setup borra por email (hoy aislado al user de test, pero un cambio de email/typo o un test nuevo que toque otra tabla puede pegarle a data real). Además ensucia auth/métricas de prod (flow_states, user creado/borrado) en cada CI. Surgido al diagnosticar el cutover (la misma DB que .env.local).

**Cómo:** Proyecto Supabase staging (mismas migraciones + seed) → secrets de CI apuntando a staging → `.env.local` de cada dev a staging para e2e. Ojo: el smoke necesita una página `is_active` con cartas published en staging (replicar el cutover de francia ahí).

**Priority:** P2 (no bloquea la beta, pero sí antes de que el CI corra seguido con usuarios reales en prod).

</details>

---

## T-17 · Redirect `cromiks.com` → `cromiks.app`

**What:** `cromiks.com` debe redirigir (301) a `cromiks.app`. Plan del dueño: **transferir primero el dominio `.com` a Cloudflare**, después armar el redirect.

**Why:** `cromiks.app` es el dominio canónico (live en Railway, auth/OG/links apuntan ahí). El `.com` suelto confunde y puede romper auth/OG si alguien entra por ahí.

**Cómo:** (1) Transferir/agregar `cromiks.com` a Cloudflare (DNS). (2) **Redirect Rule** / Bulk Redirect en Cloudflare: `cromiks.com/*` → `https://cromiks.app/$1`, 301, preservando path+query. No requiere tocar Railway ni el código. Ojo: NO agregar `cromiks.com` como dominio servido en Railway ni al allowlist de Supabase — solo redirige.

**Priority:** P3 (cosmético/canónico; no bloquea la beta — el link a DMear es `cromiks.app` directo).

---

Camino crítico para invitar los 10-15. El código ya está (PR #25 mergeado). Lo que falta:

> **Página de la beta: francia (page 8, la final vs Francia), NO croacia.** croacia
> quedó como candidata vieja (es una página real del álbum —la semi— pero NO la
> activa para la beta). Toda la curaduría de la beta (bento, fotos, critique) se
> hizo sobre francia.

### Bloqueante (P0)
- [x] ~~**🔴 Login de prod manda a `localhost:8080` tras OAuth**~~ — ✅ RESUELTO Y VERIFICADO EN PROD (2026-06-04, PR #59 mergeado+deployado; el dueño confirmó "anda bien el login"). Causa REAL (no era config de Supabase, ni Google/GCP, ni cache del browser): `src/app/auth/callback/route.ts` armaba los redirects con el `origin` de `request.url`, que **detrás del proxy de Railway es el host interno del contenedor (`localhost:8080`)**, no `cromiks.app`. El OAuth completaba bien (la sesión se seteaba; los auth logs de GoTrue mostraban éxito porque el redirect final de la app es POSTERIOR al `/token` y GoTrue no lo logea) pero el redirect final iba al puerto interno. Fix: usar `env.NEXT_PUBLIC_APP_URL` (igual que `/auth/login`). Arregló también el magic-link por email. Ver [[cromiks-auth-url-config]].
- [x] ~~**Contenido de la página de beta (francia)**~~ — ✅ francia está curada: 30 cromos con foto REAL (T-11, pasada foto-por-foto), videos YouTube + relator_clips + `legendary_brief` en las legendarias (141/147/156/165). Sustancialmente listo (vs croacia, que nunca se construyó).
- [x] ~~**Re-texturizar el sobre 3D**~~ — ✅ HECHO: `body_baseColor.png` ya es la textura Cromiks (navy + sol de mayo dorado + "Eterno Diciembre" + art-deco, sin IP). Los docs decían "pendiente/tiene Pokémon" pero el rebrand estaba aplicado y committeado desde antes — eran docs viejos (corregidos 2026-06-04). Ver `CREDITS.md` / `docs/assets/3d-pack.md`.
- [x] ~~**Álbum respeta `is_active`**~~ — ✅ HECHO (T-04): `getAlbumData` scopea al set activo (`resolveActivePageIds`) y el contador "X / N" va sobre lo obtenible.
- [x] ~~**Cutover a prod**~~ — ✅ HECHO con francia (confirmado 2026-06-04). Verificado read-only: **solo `francia` (page 8) está `is_active`** (las otras 9 inactivas → no se muestran páginas sin llenar) y **las 30 cartas de francia tienen asset `published`** → cero placeholders en la beta.
- [ ] **Dominio + URL compartible** — `cromiks.app` ya está live en Railway (ver [[cromiks-prod-railway]]); confirmar el link final a compartir.
- [~] **Confirmar flujo end-to-end de usuario NUEVO** — ✅ login/signup en prod confirmado (2026-06-04, tras el fix del auth). El resto del golden path (sobre → abrir → álbum) lo cubre el smoke E2E (verde) + la data verificada (francia activa, 30/30 published). Opcional: una pasada manual completa por la UI antes de DMear, pero ya no hay nada roto conocido.

### Decisiones baratas
- [ ] **Gate de cohorte** — recomendado: unannounced-open (DM el link, cero build). Allowlist solo si aparece un random.
- [ ] **Momento para anclar la invitación** — fecha de aniversario o dedicatoria personal.

### Lindo-de-tener (no bloqueante para la beta)
- [ ] `/help` (FAQ) · línea de "beta temprana" en algún lado · revisar que el onboarding se entienda · verificar fuentes Anton/Geist cargadas · QA visual de `LegendaryMoment` (con clip real).

### Diferido — NO tocar para la beta
Tip jar (Mercado Pago) + decidir fundación · Sentry · sitio de marketing completo · las otras 9 páginas / ~185 cromos · T-03 (tratamiento legendario completo) · nombre final · revisión legal profesional de `/legal`.
