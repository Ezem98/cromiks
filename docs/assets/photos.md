# Assets · Fotos para los cromos

Cómo curar y publicar las fotos de los cromos. **Foto real en los 205** (la
ilustración custom se evaluó y se descartó). Postura: imágenes de cualquier fuente
pública HQ + **crédito + takedown a pedido** (decisión con asesoría legal).

> ⚠️ Cromiks es un homenaje **no comercial**. Eso amplía lo permitido vs un producto
> comercial, pero no excluye copyright. El régimen es: rehosteamos a R2, acreditamos,
> y bajamos a pedido en < 1 min (un `UPDATE` de SQL, sin redeploy).

El "cómo" mecánico vive en **[`scripts/assets/README.md`](../../scripts/assets/README.md)**.
Acá está el "qué fuente, con qué riesgo, y el flujo de punta a punta".

---

## 🔁 El flujo (de punta a punta)

```
1. Curás en el YAML        →   2. Corrés la CLI         →   3. pnpm seed        →  4. Se ve
   content.photo.source_url     fetch → normalize 3:4        proyecta a              en las 5
   + source_kind                → upload R2 → write_back     card_assets             superficies
```

1. **Curar** (a mano, en `catalog/eterno-diciembre.yaml`): pegás `source_url` y
   `source_kind` en el cromo. Para `direct`, completá también `author` + `license`.
2. **CLI** (`python scripts/assets/cli.py --only <card_id>`): baja la imagen, la
   normaliza (3:4 · 800x1066 · WebP <200KB), la sube a R2 con key versionado por hash,
   y escribe `asset`/`credit`/`author`/`license`/`status=published`/`content_hash` de
   vuelta en el YAML. Probá primero con `--dry-run`.
3. **`pnpm seed`**: proyecta el bloque `photo` a la tabla `card_assets`.
4. La app sirve `${NEXT_PUBLIC_R2_PUBLIC_BASE}/${r2_key}` (= `assets.cromiks.app/...`).

El catálogo (YAML) es la **fuente de verdad**; `card_assets` es su proyección.

### Schema del bloque `photo`

```yaml
content:
  photo:
    # --- INPUT (curado a mano) ---
    type:          official | video_capture | collage | social-media
    source_url:    URL de la fuente (o "TODO")
    source_kind:   wikimedia | direct | x | instagram | manual | "TODO"
    author:        autor/fotógrafo (para crédito)   # direct/x: a mano
    license:       cc-by | cc-by-sa | cc0 | all-rights-reserved | ai-generated
    legal_posture: licensed | takedown
    # --- OUTPUT (lo completa la CLI, no editar a mano) ---
    asset:         cromos/<album>/<card_id>.<hash>.webp
    credit:        string armado para alt/caption
    fetched_at:    fecha de obtención
    content_hash:  sha256 del WebP
    status:        pending | published | takedown
```

---

## 🔌 Adapters (qué `source_kind` funciona)

| source_kind | Qué pegás | Notas |
|---|---|---|
| **wikimedia** | link de Commons (file page o thumb) | **el más sólido**: saca autor + licencia solo (CC-BY/CC-BY-SA/CC0) |
| **direct** | URL directa de la imagen (`.../foto.jpg`) | `author`/`license` a mano en el YAML |
| **x** | link del tweet (`x.com/.../status/123`) | syndication API (sin login); foto full-res + @autor; `all-rights-reserved` |
| **instagram** | link del post (`instagram.com/p/...`) | **best-effort** (suele requerir login: `IG_USERNAME` + `instaloader --login`). Alto riesgo legal |

YouTube (frames de video para los momentos legendarios) y `self-capture` quedan para F2.

---

## 🚦 Niveles de riesgo por fuente

### ✅ SAFE — libre, con atribución
| Fuente | Notas |
|---|---|
| **Wikimedia Commons** | Casi todos los jugadores tienen 1+ foto CC-BY/CC0. `source_kind: wikimedia` resuelve autor/licencia solo. |
| **Flickr (filtro CC)** | CC-BY, requiere atribución estricta. Pegás la URL directa de la imagen (`source_kind: direct`). |
| **Unsplash / Pexels / Pixabay** | Genéricas (estadios, hinchada, fondos). `direct`. |

### ⚠️ GREY ZONE — con cuidado, crédito + takedown
| Fuente | Notas |
|---|---|
| **AI generation** (Midjourney/Flux/DALL-E) | Para gaps sin foto buena. `license: ai-generated` y declarado como tal. Prompts abajo. |
| **X / posts públicos** | `source_kind: x`. Copyright del autor → `all-rights-reserved` + takedown. |
| **AFA media kit / prensa pública** | Mejor pedir permiso. La mayoría son Getty/AP por abajo. |

### ❌ AVOID — riesgo legal real (los más litigantes)
| Fuente | Por qué |
|---|---|
| **Getty / AP / Reuters / AFP** | Detección automática + watermarks. |
| **Instagram de medios** | Mismas fotos licenciadas; redistribuir es violación clara. (El adapter `instagram` existe, pero es la fuente más caliente — usalo sabiendo el costo.) |
| **Panini / álbumes competidores** | IP propia + competencia directa. |
| **"official FIFA"** | FIFA es agresivo con copyright. |

---

## 📐 Specs (las garantiza la CLI — no comprimas a mano)

| Spec | Valor | Quién lo hace |
|---|---|---|
| Ratio | 3:4 (vertical) | CLI: cover-crop centrado |
| Resolución | 800x1066 | CLI: resize (NO upscalea; si la fuente es chica, flaggea y skip) |
| Formato | WebP | CLI |
| Tamaño | < 200KB | CLI: loop de calidad descendente (piso q≈60) |
| Composición | sujeto centrado, fondo limpio | al curar: elegí una foto que crashee bien a 3:4 |

Si la CLI flaggea "resolución insuficiente", buscá una fuente más grande (el original
de Commons suele ser más grande que el thumb `500px-`).

---

## 📦 Hosting — Cloudflare R2 (cableado)

- Bucket **`cromiks-assets`**, dominio público **`assets.cromiks.app`** (R2 Custom Domain).
- La CLI sube con boto3 (S3-compat). La app sirve por el dominio bindeado, con cert de
  Cloudflare y `Cache-Control: immutable` (por eso el key lleva hash de versión).
- Setup completo: **[`../r2-setup.md`](../r2-setup.md)**.

> Histórico: se evaluó Supabase Storage y se descartó en favor de R2 (TP-16).

---

## 📜 Créditos + takedown (automático)

- **Créditos:** `/about` lista autor · fuente · licencia de **cada foto publicada**,
  leído de `card_assets` (no se mantiene a mano). Un cromo en `takedown` desaparece
  también de los créditos.
- **Takedown:** llega un pedido a `bajas@cromiks.app` →
  `UPDATE card_assets SET status='takedown' WHERE card_id='...'` → la foto cae en las
  5 superficies en < 1 min, sin redeploy. Es **terminal**: el reseed NUNCA la revive.

---

## 🤖 Prompts para AI (gaps sin foto buena)

`license: ai-generated`, declarado en /about.

**Portrait de jugador**:
```
Portrait photo of professional footballer, Argentina national team jersey
white and light blue vertical stripes, intense focused expression,
professional sports photography, soft studio lighting, neutral dark background,
photorealistic, high detail, depth of field, --ar 3:4 --v 6
```

**Momento dramático**:
```
Cinematic still of a football moment, dramatic lighting,
[describir momento], shallow depth of field, golden hour,
photorealistic, emotion in focus, --ar 3:4 --v 6
```

⚠️ Las AIs no garantizan parecido facial. Para estrellas vas a iterar; para
"momento" o "hinchada genérica" funciona mejor.

---

## Referencias

- [`../../scripts/assets/README.md`](../../scripts/assets/README.md) — cómo correr la CLI
- [`../r2-setup.md`](../r2-setup.md) — setup de Cloudflare R2 + Railway
- [`./visual-references.md`](./visual-references.md) — cómo deben verse las cards
- [`../operations/seeding.md`](../operations/seeding.md) — `pnpm seed` (proyecta el YAML a la DB)
