# 📋 TODOS

Deferred work captured during reviews. Each item has enough context to pick up cold.

---

## T-01 · Legendary still-image rights (pre-beta risk)

**What:** Decide and implement a rights-safe source for the *still image* on each legendary cromo.

**Why:** The catalog marks all 11 legendaries' photos as `type: video_capture` (frame-grabs of broadcaster footage). The PR8 beta plan dodges *clip* rights by embedding the official YouTube highlight ("Ver el momento"), but the still frame printed on the cromo itself is the same owned footage. This carries the same IP exposure as the Pokemon pack texture the product treats as a hard launch gate. Surfaced by the /plan-eng-review outside voice (2026-05-30).

**Pros:** Removes a launch-blocking IP risk hiding in plain sight; keeps the "zero third-party IP" product value honest.
**Cons:** Real content/legal work; may force a stylized/illustrated treatment instead of photoreal stills.

**Context:** Options to evaluate — licensed stills (Getty/AP), self-produced illustration of the moment, or a deliberately stylized non-photographic legendary treatment. The clip embed stays regardless. Affects the curated beta page since it must contain legendaries (see beta plan step 3).

**Depends on:** Which hero page is chosen for the beta (determines which legendaries' stills are needed first). croacia was floated (Gvardiol gambeta + Julián run).

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

## T-04 · El álbum no refleja la restricción de página activa (beta UX)

**What:** En la beta, el álbum muestra las 10 páginas y 205 slots como obtenibles, pero solo croacia (~15 cromos) se puede sortear (`pages.is_active`). El contador "X / 205" se topa en ~15 y las otras 9 páginas no se completan nunca.

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

## T-08 · PR2 del bento — detalle + reveal con ratios apaisados (fast-follow)

**What:** Adaptar `src/components/domain/cromo.tsx` (`sizeMap` 3:4 fijo → ratios variables: frame/nameplate/número apaisados) y `src/features/pack-opening/components/3d/card-mesh.tsx` (pasar w/h apaisado al `planeGeometry`) para que los cromos anchos se vean en su ratio en el detalle y en el reveal del sobre.

**Why:** PR1 (bento en la grilla) shippea sin esto; mientras tanto un cromo ancho se ve recortado a 3:4 en el modal de detalle (`<Cromo>` con object-cover) y en el reveal 3D. Degradación aceptada para la ventana de PR1 (decisión /plan-eng-review 2026-06-03), no rota. Fast-follow.

**Pros:** Cierra la experiencia del ancho en todas las superficies. **Cons:** Toca 3D (R3F) + el componente del cromo; menor que PR1.

**Context:** `<Cromo>` se usa solo en `card-detail-dialog.tsx`. El reveal NO usa `<Cromo>` (usa `card-mesh`). `card-mesh` ya parametriza `planeGeometry args={[w,h]}` → recibe otro w/h. **Depends on:** PR1 del bento. **Priority:** P2 (fast-follow post-PR1).

---

## T-09 · "Se arma con 2 mitades" de verdad (post-beta, con pity)

**What:** La mecánica de coleccionable real: dos cromos sorteables (ej. 136a/136b) que con ambos forman una foto continua, con media-foto+silueta si tenés uno solo. En la beta se shippeó como **díptico solo-presentación** (un cromo ancho, sin mecánica) por el riesgo de pool chico.

**Why:** En un pool de ~31 con reemplazo, la probabilidad de juntar las dos mitades específicas es baja → el flagship se ve mitad-armado para casi todos (outside voice, /plan-eng-review 2026-06-03). Para hacerlo bien hace falta un **pity/garantía** (ej. la segunda mitad cae garantizada tras N sobres si ya tenés la primera) + manejar el reveal apaisado + OG/share por-mitad + el conteo (sube a 206, ver design doc original).

**Pros:** El gancho de coleccionable analógico real ("me falta la otra mitad"). **Cons:** Toca `roll_cards`/`open_pack` (engine), completion, OG, reveal; pool grande lo hace viable (post-beta con más páginas activas).

**Context:** Design doc original (`~/.gstack/projects/Ezem98-cromiks/emachado-main-design-20260602-213047.md`, secciones originales) tiene el modelo de dos filas detallado. Reconsiderar cuando el pool sea más grande y haya un pity diseñado. **Depends on:** beta learnings + pool expandido (T-02). **Priority:** P3 (post-beta).

---

## 🚀 Beta launch — croacia (checklist)

Camino crítico para invitar los 10-15. El código ya está (PR #25 mergeado). Lo que falta:

### Bloqueante (P0)
- [ ] **Contenido de croacia** — ilustrar los 15 cromos + 2 URLs de YouTube (123, 124) + descripciones/`legendary_brief` en voseo. Rama `content/croacia-beta`. Ver `docs/assets/photos.md`.
- [ ] **Re-texturizar el sobre 3D** — `body_baseColor.png` TODAVÍA tiene IP de Pokémon (sin cambios desde 2026-05-27; el rebrand nunca se aplicó). Aplicar la textura nueva (espejada por el UV), verificar en 3D, commitear. Ver `public/models/pack/REBRAND_BRIEF.md`.
- [ ] **Álbum respeta `is_active`** — T-04 (arriba).
- [ ] **Cutover** — `pnpm seed` → `pnpm db:push` → `UPDATE pages SET is_active=true WHERE id='croacia'` → `pnpm tsx scripts/test-roll-cards.ts` contra prod. Resetear el inventario de las 4 cuentas de prueba.
- [ ] **Dominio + URL compartible** — comprar/apuntar un dominio (el nombre puede quedar "Cromiks" placeholder).
- [ ] **Confirmar flujo end-to-end de usuario NUEVO** en prod con croacia-only (signup → onboarding → sobre → abrir → álbum se llena, sin placeholders).

### Decisiones baratas
- [ ] **Gate de cohorte** — recomendado: unannounced-open (DM el link, cero build). Allowlist solo si aparece un random.
- [ ] **Momento para anclar la invitación** — fecha de aniversario o dedicatoria personal.

### Lindo-de-tener (no bloqueante para la beta)
- [ ] `/help` (FAQ) · línea de "beta temprana" en algún lado · revisar que el onboarding se entienda · verificar fuentes Anton/Geist cargadas · QA visual de `LegendaryMoment` (con clip real).

### Diferido — NO tocar para la beta
Tip jar (Mercado Pago) + decidir fundación · Sentry · sitio de marketing completo · las otras 9 páginas / ~185 cromos · T-03 (tratamiento legendario completo) · nombre final · revisión legal profesional de `/legal`.
