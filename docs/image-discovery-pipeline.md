# 🛰️ Pipeline de discovery de imágenes (curaduría asistida)

**Fecha:** 2026-06-04 · **Estado:** diseño (pre-implementación) · **Origen:** follow-up de
[`scrapling-evaluacion.md`](./scrapling-evaluacion.md).

Diseño de una herramienta para **automatizar la búsqueda y selección de fotos** de los cromos,
dejándole al dev solo el juicio final (aprobar de un shortlist). Pensado para **escalar a N
álbumes** dentro de Cromiks, no solo "Eterno Diciembre".

---

## 1. Contexto y objetivo

Hoy poblar un cromo es manual de punta a punta: abrir el browser, buscar una foto del
jugador/momento, juzgar licencia, verificar que sea HQ, copiar la URL y pegarla en el YAML.
Son **minutos por cromo** × ~161 pending en este álbum × **N álbumes futuros**, con **un solo
dev**. Ese es el cuello que no escala.

El trabajo se descompone en 5 pasos y **solo uno es irreducible**:

| Paso | Automatizable | Hoy |
|---|---|---|
| A. Buscar candidatas para el cromo #X | ✅ 100% (APIs) | manual |
| B. Filtrar por resolución/licencia | ✅ 100% | manual |
| C. Rankear "¿es esta persona/momento? ¿recorta a 3:4?" | ✅ ~90% (visión) | manual |
| **D. Elegir la ganadora** | 🟡 **humano, pero de segundos** | minutos |
| E. Bajar → R2 → seed | ✅ ya existe ([`cli.py`](../scripts/assets/README.md)) | ✅ |

**Objetivo:** colapsar A→C a una herramienta automática y D a "apretar la foto buena" sobre un
shortlist pre-rankeado, manteniendo intacta la postura legal del álbum.

### No-objetivos

- ❌ No scrapeamos fuentes protegidas / anti-bot (ver [`scrapling-evaluacion.md`](./scrapling-evaluacion.md) §5).
- ❌ No auto-publicamos sin aprobación humana (el matching foto↔cromo lo confirma una persona).
- ❌ No reemplaza la postura legal ([`assets/photos.md`](./assets/photos.md)): solo surface de
  fuentes con licencia redistribuible.

---

## 2. Decisiones clave (resueltas con el dueño, 2026-06-04)

| # | Decisión | Razón |
|---|---|---|
| D1 | **Superficie de revisión: página admin in-app** (`/admin/curate`) | Vive en el producto, escala a N álbumes y a **curadores no-dev** a futuro. |
| D2 | **El YAML del catálogo sigue siendo la fuente de verdad** | Todo el pipeline (CLI, seed, créditos) ya cuelga del YAML. No lo movemos. |
| D3 | **Supabase es staging, no fuente de verdad** | El admin in-app (en Railway) **no puede commitear al repo**. Escribe *decisiones* a una tabla; un paso local las exporta al YAML. |
| D4 | **Fuentes por API** (Openverse / Commons / Flickr) | Browser/redes = fallback manual, no backbone (ver [`scrapling-evaluacion.md`](./scrapling-evaluacion.md) §5). |
| D5 | **Se incluyen TODAS las licencias** (CC, NC y all-rights) | Amparados en homenaje **no comercial** + **crédito** + **takedown** a `bajas@cromiks.app`. Misma postura ya documentada en [`assets/photos.md`](./assets/photos.md). Las no-CC entran como `legal_posture: takedown`. |
| D6 | **El admin vive en PROD** (cromiks.app/admin) | Curaduría desde cualquier lado + abre la puerta a curadores no-dev. Exige guard de ruta + RLS sólidos. |
| D7 | **Adapters `openverse` + `flickr` dedicados desde el MVP** | Re-resuelven atribución/licencia por ID en el fetch; más robusto que mapear a `direct`. |
| D8 | **El score por visión corre offline** (batch en `discover.py`) | Más barato (una vez por candidato, cacheable), sin latencia ni API key en la web app; el admin queda solo-lectura/aprobación. |

> El wrinkle de D3 es el corazón del diseño: separa **discovery (offline)** → **review
> (in-app, DB)** → **apply (offline, write-back YAML)** → **publish (CLI existente)**. La app
> nunca toca el repo; el dev local hace de puente DB↔YAML↔git.

---

## 3. Arquitectura

```
            OFFLINE (local, Python)                 IN-APP (Railway, Next.js)        OFFLINE (local)
 ┌──────────────────────────────────┐        ┌──────────────────────────────┐   ┌──────────────────┐
 │ discover.py                       │        │ /admin/curate                │   │ apply_decisions  │
 │  1. lee cromos pending del YAML   │        │  - auth admin                │   │  - lee decisiones │
 │  2. query builder (name/club/...) │  upsert│  - lista álbum → cromos      │   │    'chosen' de DB │
 │  3. busca: Openverse/Commons/Flickr├──────►│  - por cromo: shortlist      │   │  - write-back al  │
 │  4. filtro duro de resolución     │  cands │    rankeado (thumb+licencia+ │   │    YAML (ruamel)  │
 │  5. score por visión (Claude)     │   en   │    score+razón)              │   │    source_url/... │
 │                                   │ Supa-  │  - dev elige una o "ninguna" ├──►│                  │
 └──────────────────────────────────┘  base  │  → escribe decisión a DB     │   └────────┬─────────┘
                                              └──────────────────────────────┘            │
                                                                                          ▼
                                              ┌───────────────────────────────────────────────────┐
                                              │  cli.py (EXISTE)  → fetch → 3:4 → R2 → provenance    │
                                              │  pnpm seed (EXISTE) → card_assets → la app lo sirve  │
                                              └───────────────────────────────────────────────────┘
```

Cinco etapas, dos de las cuales **ya existen** (E):

1. **Discovery** (`scripts/assets/discover.py`, nuevo, local) → upsert de candidatos a Supabase.
2. **Review** (`/admin/curate`, nuevo, in-app) → escribe decisiones a Supabase.
3. **Apply** (`scripts/assets/apply_decisions.py`, nuevo, local) → write-back al YAML.
4. **Publish** (`cli.py`, existe) → R2 + provenance + `status: published`.
5. **Seed** (`pnpm seed`, existe) → proyecta a `card_assets`.

---

## 4. Componentes

### 4.1 Discovery job — `scripts/assets/discover.py`

Reusa la lectura del YAML y la lógica de imagen de la CLI actual.

**Query builder.** De los campos estructurados de cada cromo (`name`, `page`, `description`,
`metadata.club`/`position`/`number`) arma 2-3 variantes de query:
- Jugador → `"{name}" footballer`, `"{name}" {club}`, `"{name}" Argentina`.
- Momento → keywords de `description` + `"Argentina 2022"` / `"World Cup final"`.

**Fuentes (APIs; sin filtro de licencia — D5, se acepta todo y se etiqueta):**

| Fuente | Endpoint | Devuelve | Notas |
|---|---|---|---|
| **Openverse** (primaria) | `GET api.openverse.org/v1/images/?q=…&page_size=10` | url directa, `creator`, `license`, `license_url`, `source`, `width`/`height`, `attribution` | Sin key para empezar (rate-limit por IP); key OAuth2 para más. Solo indexa obras de licencia libre (CC/PD) → el grueso entra como CC. Agrega Flickr-CC + Wikimedia + museos. |
| **Wikimedia Commons** | `action=query&generator=search&gsrsearch=…&prop=imageinfo&iiprop=url\|extmetadata\|size` | url full-res, Artist, licencia | Ya implementado en el adapter `wikimedia`; reusar el parse. Licencias libres. |
| **Flickr** | `flickr.photos.search&text=…&extras=license,owner_name,o_dims,url_o` + `getSizes` | url full-res, owner, licencia (id → mapeo) | Necesita API key (gratis). **Sin** restricción `license=` (D5): incluye all-rights → `legal_posture: takedown`. Fuerte para partidos/eventos. |

**Filtro duro.** Descarta candidatos cuyas dimensiones no den `800×1066` tras crop 3:4 centrado
(reusa el gate de resolución de [`imaging.py`](../scripts/assets/) — el mismo "no upscalea" de la
CLI). Esto solo ya elimina la mayoría del ruido.

**Score por visión (Claude).** Corre **offline, en batch dentro de `discover.py`** (D8): para los
candidatos que pasan el filtro duro, manda el **thumbnail** + el `name`+`description` del cromo a
un modelo de visión → `match` (0-1) + `reason` (una línea) + `crop_fit` (¿el sujeto queda centrado
en un 3:4?). El score se persiste en `card_asset_candidates`, así el shortlist ya llega ordenado
al admin (cero latencia, sin API key en la web app). Costo: thumbnails chicos, centavos por cromo.

**Idempotencia / cache.** Upsert por `(card_id, source_url_hash)` — re-correr no duplica. Cachea
respuestas de API a disco (como el dev-mode de scraping) para iterar sin re-pegar.

**Salida.** Upsert a `card_asset_candidates` (§4.2), con `rank` por score.

### 4.2 Staging en Supabase

Dos tablas nuevas. **Staging puro** — no son fuente de verdad; se pueden truncar y regenerar.

```sql
-- candidatos descubiertos (regenerable)
create table card_asset_candidates (
  id            uuid primary key default gen_random_uuid(),
  album_id      text not null,
  card_id       text not null,          -- = id del cromo en el YAML
  source        text not null,          -- openverse | wikimedia | flickr
  image_url     text not null,          -- URL directa de la imagen full-res
  landing_url   text,                   -- página de origen (para verificar)
  thumbnail_url text,
  author        text,
  license       text,                   -- cc0 | cc-by | cc-by-sa | ...
  license_url   text,
  width         int,
  height        int,
  crop_ok       boolean default false,  -- pasa 800x1066 @ 3:4
  vision_match  real,                   -- 0..1
  vision_reason text,
  rank          int,
  run_id        text,                   -- corrida de discovery que lo generó
  created_at    timestamptz default now(),
  unique (card_id, image_url)
);
create index on card_asset_candidates (album_id, card_id, rank);

-- decisión humana por cromo (lo que el admin in-app escribe)
create table card_asset_decisions (
  album_id      text not null,
  card_id       text not null,
  candidate_id  uuid references card_asset_candidates(id), -- null = "ninguna sirve"
  decision      text not null,          -- chosen | rejected_all | skipped
  decided_by    uuid,                   -- auth.uid()
  decided_at    timestamptz default now(),
  applied       boolean default false,  -- ya escrito al YAML por apply_decisions
  notes         text,
  primary key (album_id, card_id)
);
```

**RLS:** ambas tablas **solo admin** (lectura y escritura). Ver auth en §4.3.

### 4.3 Admin in-app — `/admin/curate`

Página Next.js (RSC + Server Actions), **solo para admins**, viviendo en **prod**
(`cromiks.app/admin` — D6).

- **Auth.** Hoy no hay rol admin. MVP: allowlist de `auth.uid()` en env (`ADMIN_USER_IDS`) +
  guard en el layout de `/admin` + RLS por esos IDs. A futuro: `profiles.role = 'admin'`
  (necesario antes de sumar curadores no-dev). Como vive en prod, el guard de ruta **no** puede
  ser solo client-side: chequeo en el layout server-side + RLS en las tablas.
- **Vista lista.** Selector de álbum → lista de cromos `pending` con badge "tiene candidatos /
  sin candidatos". Filtros: solo-sin-decidir, por página, por rareza.
- **Vista por cromo.** Muestra el cromo (name + description + slot/ratio del bento si aplica) y
  su **shortlist rankeado**: cada candidato = thumbnail grande + badge de licencia + `vision_match`
  + `reason` + link al `landing_url` para verificar. El dev:
  - clic en una candidata → **Server Action** escribe `decision='chosen'` con su `candidate_id`;
  - o "ninguna sirve" → `decision='rejected_all'` (queda flaggeado para fallback manual);
  - navegación con teclado (1-5 elegir, N ninguna, → siguiente) para velocidad.
- **No toca el repo ni el YAML.** Solo escribe en `card_asset_decisions`. Funciona igual en prod
  (cromiks.app/admin) que en local.

### 4.4 Apply / export — `scripts/assets/apply_decisions.py`

Corre **local** (el dev tiene el repo + credenciales). Puente DB → YAML:

1. Lee `card_asset_decisions` con `decision='chosen' AND applied=false` (join al candidato).
2. Para cada uno, escribe en el bloque `photo` del cromo en el YAML, con **ruamel.yaml** (preserva
   comentarios y formato, a diferencia de pyyaml):
   - `source_url` ← `image_url`
   - `source_kind` ← mapeo (§5)
   - `author` ← `author`, `license` ← `license`, `legal_posture` según licencia
3. Marca `applied=true` en la decisión.
4. El dev revisa el diff del YAML y commitea (curaduría versionada en git).

Después, el flujo de siempre: `cli.py --only <ids>` → R2 → `pnpm seed`.

### 4.5 Publicación (sin cambios)

[`cli.py`](../scripts/assets/README.md) y `pnpm seed` ya hacen fetch → normalize 3:4 → R2 →
provenance → `status: published` → `card_assets`. **No se tocan.**

---

## 5. Mapeo de `source_kind` / adapters

| Fuente discovery | `source_kind` a escribir | Adapter |
|---|---|---|
| Wikimedia | `wikimedia` | ✅ existe |
| Flickr | `flickr` (nuevo) | re-resuelve owner/licencia por ID (`getSizes` + `getInfo`) |
| Openverse | `openverse` (nuevo) | re-resuelve atribución/licencia por ID al fetch |

**Decisión (D7):** adapters `openverse` y `flickr` dedicados **desde el MVP** — re-resuelven
atribución/licencia por ID en el fetch (más robusto que `direct`). `wikimedia` ya existe.
`direct` queda solo para el **fallback manual** (URL pegada a mano por el dev).

---

## 6. Licencias y postura legal (D5)

- **Se incluyen TODAS las licencias** — CC0/PDM/CC-BY/CC-BY-SA, variantes NC y all-rights. Nos
  amparamos en el homenaje **no comercial** + **crédito** + **takedown a `bajas@cromiks.app`**, la
  misma postura ya documentada en [`assets/photos.md`](./assets/photos.md). **No se descarta un
  candidato por su licencia.**
  - En la práctica, Openverse y Commons solo indexan obras de licencia libre → el grueso entra
    como CC igual. "Todas" afecta sobre todo a **Flickr** (no se restringe el `license=`) y a no
    tirar candidatos NC/all-rights que aparezcan.
- **`legal_posture`** se deriva de la licencia: CC/PD → `licensed`; NC o all-rights → `takedown`
  (baja a pedido). El admin muestra el badge de licencia para que el dev sepa qué está aprobando.
- Se mantiene el invariante **`published ⇒ author + license + credit`** SIEMPRE (incluso los
  all-rights se acreditan igual) — lo refuerza la CLI y el CI de [T-05](../TODOS.md).
- Los **momentos legendarios** sin equivalente disponible siguen por [T-01](../TODOS.md); el
  discovery los marcará `rejected_all`/sin-candidatos, que es la señal correcta.

---

## 7. Escala multi-álbum

El pipeline es **álbum-agnóstico**: todo se keyea por `(album_id, card_id)`. Un álbum nuevo es:
1. escribir su YAML de catálogo (cromos con `source_url: "TODO"`),
2. `discover.py --album <id>`,
3. revisar en `/admin/curate` (selector de álbum),
4. `apply_decisions.py --album <id>` → `cli.py` → `seed`.

El admin in-app es lo que permite, a futuro, que **curadores no-dev** ayuden con la revisión
(paso 3) sin tocar repo ni terminal; el dev solo corre discovery (1-2) y apply+publish (4).

---

## 8. Métricas de éxito

- **Cobertura:** % de cromos pending con ≥1 candidato `crop_ok` (objetivo MVP: >60% de jugadores).
- **Auto-match:** % donde el top-1 por visión es el elegido por el humano (mide qué tan bueno es
  el ranking → cuánto baja el tiempo de revisión).
- **Tiempo por cromo:** de minutos (manual) a <10s (aprobar de shortlist). Es la métrica norte.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| APIs sin cobertura para momentos (no jugadores) | Esperado; se flaggean `rejected_all` → fallback T-01. No es regresión. |
| Falsos positivos de visión | El humano confirma siempre (paso D). Visión solo rankea, no decide. |
| Atribución incorrecta de la API | `landing_url` visible en el admin para verificar; la CLI re-valida en fetch. |
| Rate limits de Openverse | Cache a disco + key OAuth2 + backoff. |
| Costo de visión | Thumbnails chicos; correr visión solo sobre los que pasan filtro duro. |
| Admin sin rol formal | MVP allowlist de uid en env; migrar a `profiles.role` antes de sumar curadores. |
| Staging desincronizado del YAML | DB es regenerable; el YAML manda. `applied` evita doble escritura. |

---

## 10. Plan por fases

| Fase | Alcance | Esfuerzo |
|---|---|---|
| **0 · Discovery core** | `discover.py` solo-Openverse + filtro duro + upsert a `card_asset_candidates`. Sin visión, sin admin (revisar candidatos por query SQL). Valida cobertura real. | ~1 día |
| **1 · Admin in-app** | Tablas + RLS + `/admin/curate` (auth allowlist, lista + vista por cromo + Server Action de decisión). | ~2 días |
| **2 · Apply + loop completo** | `apply_decisions.py` (ruamel write-back) → cerrar el loop discovery→review→YAML→publish punta a punta. | ~1 día |
| **3 · Calidad** | Score por visión (ranking) + fuentes Commons + Flickr + adapters `openverse`/`flickr`. | ~2 días |
| **4 · No-dev** | `profiles.role='admin'`, multi-curador, métricas en el admin. | post, según necesidad |

MVP usable end-to-end = Fases 0+1+2 (~4 días). Fase 3 sube la tasa de auto-match (menos tiempo
humano). Fase 4 abre la curaduría a no-devs.

---

## 11. Preguntas abiertas — RESUELTAS (2026-06-04)

1. **Licencias** → se incluyen **todas** (CC, NC, all-rights), amparados en no-comercial +
   crédito + takedown. Ver D5 / §6.
2. **Dónde vive el admin** → **prod** (`cromiks.app/admin`). Ver D6 / §4.3.
3. **Adapter dedicado** → sí, `openverse` + `flickr` **desde el MVP**. Ver D7 / §5.
4. **Visión offline vs on-demand** → **offline** (batch en `discover.py`). Ver D8 / §4.1.

Sin preguntas abiertas pendientes. Listo para implementar (Fase 0).

---

## Referencias

- [`scrapling-evaluacion.md`](./scrapling-evaluacion.md) — por qué NO un scraper anti-bot (TP-38).
- [`assets/photos.md`](./assets/photos.md) — postura legal + niveles de riesgo por fuente.
- [`scripts/assets/README.md`](../scripts/assets/README.md) — la CLI y adapters existentes (etapa E).
- [`TODOS.md`](../TODOS.md) — T-01 (legendarios), T-05 (CI de crédito).
- Openverse API: <https://api.openverse.org/v1/> · Flickr API: <https://www.flickr.com/services/api/>
