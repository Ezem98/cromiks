# Assets · Fotos para los cromos

Cómo y dónde conseguir las fotos de los ~150 cromos que hoy están en `content.photo.source: TODO`.

⚠️ **Cromiks es un proyecto tributo gratuito**, no comercial. Eso amplía un poco lo permitido vs un producto comercial, pero **no excluye respeto a copyright**. Las fotos del Mundial 2022 son altamente licenciadas (Getty / AP / Reuters dominan ese mercado).

---

## 🚦 Niveles de riesgo

### ✅ SAFE — Usar libremente

| Fuente | Pros | Contras | URL |
|---|---|---|---|
| **Wikimedia Commons** | Casi todos los jugadores tienen 1+ foto CC-BY o CC0. Búsqueda por nombre del jugador → página tiene "Media in this category" | Las fotos no son siempre del Mundial 2022 específico (a veces son de partidos de club previos) | https://commons.wikimedia.org/ |
| **Flickr (filtro CC)** | Fotógrafos amateurs profesionales suben acá con CC-BY. Hay material del Mundial | Requiere atribución estricta + variable calidad | https://www.flickr.com/search/?license=2%2C3%2C4%2C5%2C6%2C9 |
| **Unsplash** | Genéricas de fútbol — útiles para fondos / placeholders / cromos secundarios "estadio", "afición", etc. | Poco material específico del Mundial 2022 | https://unsplash.com/s/photos/soccer |
| **Pexels** | Similar a Unsplash | Mismo issue | https://www.pexels.com/search/football/ |
| **Pixabay** | Similar | Mismo issue | https://pixabay.com/images/search/football/ |

### ⚠️ GREY ZONE — Usar con cuidado

| Fuente | Notas |
|---|---|
| **AI generation** (Midjourney, Gemini, DALL-E, Flux) | Generar "portraits estilizados" de jugadores. Legalmente raro (la IA puede haberse entrenado con fotos licenciadas), pero **para tributo no comercial** es lo que muchos proyectos similares hacen. Importante: declarar que son AI en `/about` |
| **YouTube oficial FIFA highlights** | Hay highlight reels en HD. Capturar frame + editar. Técnicamente fair use para tributo, pero no es "safe" — FIFA puede mandar takedown |
| **AFA media kit** | Press materials de la AFA. Para uso no comercial / editorial puede ir. Ideal: contactarlos explicando el proyecto |
| **Press / news photos en webs públicas** | Las fotos que aparecen en clarin.com, lanacion.com, etc son casi todas Getty/AP. **Cuidado** |

### ❌ AVOID — Riesgo legal real

| Fuente | Por qué evitar |
|---|---|
| **Getty Images / AP / Reuters / AFP** | Detectan automáticamente. Sus marcas de agua se ven en el 90% de los resultados de Google Images del Mundial 2022 |
| **Instagram de medios** | Mismas fotos licenciadas, redistribuir es violación clara |
| **Sitios de Panini Adrenalyn / álbumes físicos competidores** | IP propia + competencia directa |
| **Fotos taggueadas como "official FIFA"** | FIFA es agresivo con copyright |

### 🎨 ALTERNATIVA — Ilustración custom

Probablemente la mejor opción para los **11 legendaries** y los **20-30 jugadores estrella**:

| Approach | Costo aproximado | Plazo |
|---|---|---|
| **Fiverr** — buscar "trading card illustration" / "sports portrait" | USD 15-50 por cromo | 3-5 días por cromo |
| **Behance / Instagram** — DM a ilustradores que te gusten | USD 30-150 por cromo | 1-2 semanas |
| **Estilo "tribute illustration"** tipo cómic / semi-realista / esquemático | Más barato + más distintivo | — |
| **Pack deal con ilustrador único** — el mismo estilo para todos los legendaries (paquete de 11) | USD 200-800 total | 2-4 semanas |

### Ventajas de ir 100% ilustración

- ✅ Cero IP issues (la ilustración es original)
- ✅ Coherencia estética del álbum (todos los cromos con el mismo "feel")
- ✅ Diferenciación del producto vs álbumes con fotos
- ✅ Podemos pedir "exactamente el momento" que queremos (no depender de lo que hay disponible)
- ❌ Mucho más caro y lento que usar fotos existentes
- ❌ Si el ilustrador es malo, el álbum entero se ve amateur

---

## 📐 Recomendación por tier

Mi sugerencia para repartir el catálogo:

| Tier | # cards | Fuente recomendada | Costo aprox |
|---|---|---|---|
| **Common** (130) | Estadios, aficionados, momentos secundarios, jugadores rotación | Wikimedia + Unsplash + Pexels | $0 |
| **Uncommon** (40) | Jugadores titulares no-estrella, momentos del torneo | Wikimedia + Flickr CC | $0 |
| **Rare** (20) | Goles secundarios, escenas icónicas | Wikimedia ediciones + AI generation | $0-100 (AI subs) |
| **Epic** (14) | Jugadores estrella (Messi, Mbappé, Modric, Lloris) | Ilustración custom o AI premium | $200-700 |
| **Legendary** (11) | LOS 11 momentos icónicos del Mundial | ⭐ **Ilustración custom obligatorio** | $500-1500 |

**Total estimado**: USD 700-2300 si querés calidad pro en los legendaries + epics.

**Mínimo viable**: USD 0 si usás Wikimedia para todo + AI para los legendaries.

---

## 📋 Workflow recomendado

### Paso 1 — Inventariar
Listar los 205 cromos del YAML y marcar qué cromos son:
- A) Tienen jugador específico → necesitan foto del jugador
- B) Son "momento" → necesitan ilustración del momento O foto del partido
- C) Son ambiente / aficionados / estadios → fotos genéricas OK

### Paso 2 — Sweep Wikimedia
Para los del tipo A:
1. Buscar nombre del jugador en https://commons.wikimedia.org/
2. Filtrar por "Quality images" si hay
3. Anotar URL + autor (atribución obligatoria)
4. Descargar en alta resolución

### Paso 3 — Llenar gaps con AI
Para jugadores que no tienen foto buena en Wikimedia:
- Prompt tipo: *"Portrait photo of [jugador], Argentina national team jersey blue and white stripes, professional sports photography, soft studio lighting, neutral background, photorealistic, high detail"*
- Tools: Midjourney v6+, Flux, DALL-E 3
- Iterar hasta que la cara se parezca al jugador real

### Paso 4 — Ilustraciones para legendaries
- Hacer brief con el momento específico (minuto, descripción, emoción)
- Buscar ilustrador con estilo "sports tribute" / "cinematic illustration"
- Pedir muestra antes de contratar pack completo

### Paso 5 — Optimizar y hostear
- Comprimir a JPG/WebP de **800x1066** (ratio 3:4 que matchea el cromo)
- Subir a **Supabase Storage** o **Cloudinary** (CDN gratis hasta cierto límite)
- Actualizar `catalog/eterno-diciembre.yaml` con la URL HTTPS pública
- Re-correr `pnpm seed` (idempotente, updatea content.photo.source)

---

## 📦 Hosting de imágenes

| Opción | Pros | Contras | URL |
|---|---|---|---|
| **Supabase Storage** | Ya está integrado al proyecto. Free tier 1GB. CDN incluido | Bandwidth limitado en free | https://supabase.com/docs/guides/storage |
| **Cloudinary** | Optimización automática (resize, format) | Setup adicional | https://cloudinary.com/ |
| **Vercel Blob** | Si deployamos en Vercel, integración perfecta | Más caro que Supabase | https://vercel.com/docs/storage/vercel-blob |
| **S3 / R2** (Cloudflare) | El más barato a escala | Setup más complejo | https://www.cloudflare.com/developer-platform/r2/ |

⭐ **Mi recomendación**: Supabase Storage para arrancar. Ya está. Migrar a R2 si crecemos.

---

## 🔧 Specs técnicos de las fotos

Para que se vean bien en el componente `Cromo`:

| Spec | Valor recomendado |
|---|---|
| Ratio | 3:4 (vertical) o 4:5 |
| Resolución | 800x1066 px mínimo (para retina) |
| Formato | WebP (con JPG fallback) |
| Tamaño máx | ~200KB por imagen comprimida |
| Composición | Sujeto centrado, fondo limpio (la card lo "enmarca") |
| Color | Más punchy que aburrido — la card es dark, las fotos pop |
| Crop | Cabeza + torso para jugadores. Wide shot para "momentos" |

---

## 📜 Atribución y créditos

Si usás fuentes CC-BY (Wikimedia, Flickr), hay que **acreditar al autor**. Plan:

1. Página `/about` con sección "Créditos de imágenes" listando cada foto, autor, fuente, licencia
2. Eventualmente, tooltip en el cromo en `/u/[username]` que muestre fuente (opcional)
3. `CREDITS.md` actualizado con bloque de fotos

Template de atribución:
```
[Nombre del cromo] · Foto: [Autor] · [Fuente] · [Licencia]
Ej: "Messi celebra el segundo gol" · Foto: Tasnim News Agency · 
    Wikimedia Commons · CC BY 4.0
```

---

## 🤖 Prompts para AI generation (templates)

Para usar con Midjourney / Flux / DALL-E si vas por la vía AI:

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
[describir momento específico], shallow depth of field, 
golden hour, photorealistic, emotion in focus, --ar 3:4 --v 6
```

**Estadio / aficionados**:
```
Wide shot of football stadium crowd celebrating, blue and white flags, 
dramatic floodlights, atmospheric haze, photorealistic, 
documentary style --ar 3:4 --v 6
```

⚠️ Importante: las AIs **no garantizan parecido facial** al jugador real. Para jugadores estrella vas a iterar mucho. Para "fans genéricos" o "momento dramático" funciona mejor.

---

## 📈 Roadmap sugerido

Si querés completar las fotos en orden de impacto:

| Sprint | Foco | Estimación |
|---|---|---|
| 1 | Wikimedia sweep para los 11 legendaries + 14 epics (25 cards) | 4-6 hs |
| 2 | Wikimedia/Flickr para 20 rares (jugadores titulares) | 3-4 hs |
| 3 | Fotos genéricas (Unsplash/Pexels) para 50 commons (estadios, aficionados) | 2 hs |
| 4 | AI generation para los 80 commons restantes (jugadores rotación) | 6-8 hs |
| 5 | Ilustración custom para los 11 legendaries (reemplazar Wikimedia) | 2-4 semanas elapsed (espera del ilustrador) |

Total ≈ 15-20 hs de trabajo propio + espera del ilustrador.

---

## Referencias

- [`./visual-references.md`](./visual-references.md) — Inspiración de cómo deben verse las cards
- [`./3d-pack.md`](./3d-pack.md) — El sobre tiene el mismo issue de "asset placeholder"
- [`../operations/seeding.md`](../operations/seeding.md) — Cómo correr `pnpm seed` después de actualizar las URLs
- [`../feature-status.md`](../feature-status.md) — Item 9.4 (photo URLs reales)
