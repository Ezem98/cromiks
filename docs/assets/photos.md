# Assets · Fotos para los cromos

Cómo y dónde conseguir las fotos de los ~150 cromos que hoy están en `content.photo.source: TODO`.

⚠️ **Cromiks es un proyecto tributo gratuito**, no comercial. Eso amplía un poco lo permitido vs un producto comercial, pero **no excluye respeto a copyright**. Las fotos del Mundial 2022 son altamente licenciadas (Getty / AP / Reuters dominan ese mercado).

> **Aclaración legal (recon 2026-05-30):** "sin lucro" NO vuelve legal usar fotos con copyright — baja el riesgo (menos probable que te demanden, menos daños), no es un permiso. Argentina no tiene "fair use" amplio estilo EEUU (Ley 11.723 solo tiene excepciones puntuales). Sumado a esto, el **derecho de imagen** del jugador es un tema aparte del copyright de la foto. Conclusión práctica: para los momentos del Mundial, ilustración propia o licencia — no frame-grabs de transmisión.

---

## 🎯 Página héroe de la soft-beta — croacia (recon 2026-05-30)

`croacia` (página 7, semifinal Arg 3-0 Croacia) es la página héroe de la beta. 15 cromos (121-135). Recon de Wikimedia Commons hecho para esta página.

**Hallazgo central:** en Commons hay fotos CC de las **personas** (Messi, Julián Álvarez ~33 archivos, Scaloni 13, Modrić, y casi todo el once) pero son retratos / acción de **otros partidos**. De los **momentos específicos de la semifinal vs Croacia no hay nada libre** — FIFA controla férreo la imagen de Qatar 2022. Como los cromos de croacia son momento-específicos por diseño, los retratos libres sirven para identidad/referencia, **no para el momento**.

**La buena noticia:** DESIGN.md 12.5 ya especifica las legendarias como **ilustración estilizada**, no foto:
- **124 gambeta-gvardiol** (hero): *"blanco y negro parcial, solo Messi y Gvardiol a color"* → ilustración.
- **123 julian-contraataque:** *"líneas de velocidad estilo cómic"* → ilustración.

O sea: para los 2 cromos que más importan en la beta, el problema de rights se evapora porque nunca fueron foto. El `content.photo.source` de esos es casi vestigial; el asset real es la ilustración + el embed de YouTube (`content.video`, ver scaffolding en el YAML).

### Verdict por cromo

| Cromo | Sujeto | ¿Commons libre? | Camino para la beta |
|---|---|---|---|
| 124 gambeta-gvardiol ⭐ | momento Messi/Gvardiol | ✗ (FIFA) | **Ilustrar** (DESIGN.md ya lo pide así) |
| 123 julian-contraataque | momento gol | ✗ | **Ilustrar** (estilo cómic, ya spec'd) |
| 122 messi-penal · 125 julian-gol-2 · 132 "a la final" | momentos | ✗ | Ilustrar o licenciar |
| 126 modric · 129 scaloni · 134 messi-camara | persona | ✓ retrato CC existe | Retrato libre = identidad; el momento no |
| 121 once · 127 plantel-festejo · 128 messi-julian-abrazo · 130 julian-festejo · 133 final · 135 familia | momentos de ese partido | ✗ | Ilustrar o licenciar |
| 131 hinchada-muchachos | hinchada genérica | ~ parcial (hay fotos CC de hinchada Qatar) | Posible foto libre genérica |

**Neto: 0 de 15 momentos están en Commons.** ~3-4 sujetos tienen retrato libre (identidad, no momento); 1 (hinchada) quizás tenga genérica.

### Recomendación para croacia
**Ilustrar la página entera** en un estilo coherente (no es workaround — es lo que el brand book ya pedía, y mata T-01 de raíz). Commons sirve como **referencia visual** de caras/dorsales para que las ilustraciones sean fieles, no como asset final. Empezá por el hero (124) y la otra legendaria (123). Los videos van como embed de YouTube oficial (rights-safe).

Categorías Commons verificadas (referencia de jugadores):
- [Julián Álvarez (footballer)](https://commons.wikimedia.org/wiki/Category:Juli%C3%A1n_%C3%81lvarez_(footballer)) (~33 archivos, ninguno de Croacia 2022)
- [Lionel Scaloni](https://commons.wikimedia.org/wiki/Category:Lionel_Scaloni) (13) · [Luka Modrić](https://commons.wikimedia.org/wiki/Category:Luka_Modri%C4%87)
- Del partido: solo fuentes con copyright (FIFA+, ESPN, YouTube highlights).

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
