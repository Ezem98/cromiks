# Assets · Referencias visuales

Referencias de diseño que inspiraron el look del producto. Útil si:
- Tenés que recrear un efecto y querés ver de dónde vino la idea
- Vas a hacer una nueva variante de cromo / pack / animación
- Querés mostrar a un diseñador / colaborador el "norte estético"

⚠️ Estas son **referencias**, no fuentes para copiar directo. La inspiración está OK, copiar pixel-by-pixel no.

---

## ⭐ Pokemon Cards CSS (LA referencia para los cromos)

Simon Goellner (@simeydotme) hizo un proyecto open source que recrea el efecto holográfico de cartas Pokémon **enteramente en CSS**. Es THE referencia obligada cuando se habla de "cartas web con foil".

| Link | Qué tiene |
|---|---|
| **https://poke-holo.simey.me/** | Demo en vivo con todas las variantes (cosmos, rare, reverse, galaxy) |
| **https://github.com/simeydotme/pokemon-cards-css** | Código completo, MIT licensed |
| **https://simey.me/** | Su blog con writeups detallados del proceso |

### Qué tomamos para el componente `Cromo`

| Efecto | Origen | Dónde lo usamos |
|---|---|---|
| **Prismatic shine** (gradiente arcoíris que sigue el mouse) | Pokemon CSS | `rare`, `epic`, `legendary` tiers |
| **Scanline overlay** (líneas horizontales tipo CRT) | Pokemon CSS | `rare` tier |
| **3D tilt on hover** | Pokemon CSS | Todos los tiers en hover |
| **Idea de "variantes por rareza"** | Pokemon TCG histórico + Pokemon CSS | Sistema de 5 tiers |

### Lo que NO tomamos
- El efecto "cosmos" / galaxia → reservado para algo futuro si lo necesitamos
- Las texturas de holo específicas de Pokemon (son IP)
- Los nombres ("Reverse Holo", "Full Art") — usamos nomenclatura propia

---

## 🃏 Trading cards digitales (referencia de UX y mercado)

| Link | Qué referencia |
|---|---|
| **https://nbatopshot.com/** | Cards 3D animadas (Dapper Labs). Referencia de "card que se mueve" / momento icónico |
| **https://sorare.com/** | Cards de fútbol digitales con scarcity tier (common / rare / super rare / unique). Referencia de tier system |
| **https://www.toppschrome.com/** | Topps Chrome físicas — paleta dorada / foil base de inspiración offline |
| **https://www.panini.com.ar/** | Panini Argentina — el competidor "espiritual" (físico). Ver cómo arman las páginas del álbum |

---

## ✨ WebGL / animaciones 3D (referencia para pack opening)

El "complete espectacular" del `PhaseTear` (flash + partículas + aura) toma de:

| Link | Qué referencia |
|---|---|
| **https://lusion.co/** | Studio creativo con WebGL premium. Referencia de "calidad cinematográfica" |
| **https://14islands.com/** | Studio con expertise en R3F. Referencia de portfolios |
| **https://r3f.docs.pmnd.rs/** | Docs oficiales de React Three Fiber |
| **https://docs.pmnd.rs/drei/introduction** | Drei helpers — donde está el `<Environment preset="warehouse">` que usamos |
| **https://discourse.threejs.org/** | Forum oficial Three.js — útil para resolver bugs raros |

---

## 🎨 CSS card effects (más opciones)

Búsquedas y galerías para cuando quieras explorar variantes nuevas:

| Link | Para qué |
|---|---|
| **https://codepen.io/search/pens?q=holographic+card** | Decenas de variantes del efecto holo |
| **https://codepen.io/search/pens?q=trading+card** | Cards estilo TCG, magic, etc |
| **https://codepen.io/search/pens?q=foil+effect** | Efectos foil aislados |
| **https://uiverse.io/** | Componentes CSS open source con muchos cards |

---

## 🌌 Paleta y mood (dark premium)

Referencias del look "argentino sin caer en cliché":

| Link | Qué referencia |
|---|---|
| **https://dribbble.com/search/dark-premium-ui** | Mood general dark + dorado |
| **https://www.behance.net/search/projects/world%20cup%202022** | Trabajos de branding del Mundial — ver qué hicieron los demás (sin copiar) |
| **https://www.collins.co/** | Branding studio. Referencia de tipografía display sobria |
| **https://2022.cca.org/** | Generic premium portfolio aesthetic |

---

## 🇦🇷 Argentina branding (sin cliché)

Lo que SÍ es referencia válida para el look argentino:

| Source | Qué tomar |
|---|---|
| Bandera oficial argentina | Solo la paleta celeste/blanco/dorado, no la bandera literal |
| Sol de mayo histórico | Símbolo OK, sin escudo AFA |
| Tipografías sobrias dark — no chunky / no "fútbol kitsch" | — |
| Art deco porteño (Subte / 9 de Julio) | Ornamentos sutiles para frames |

Lo que NO:
- ❌ Logo AFA (IP)
- ❌ Logo Adidas (IP)
- ❌ Camisetas oficiales con sponsors visibles
- ❌ Tipografías "gauchas" / glitter / overly nationalist

---

## 📱 Mobile patterns

Apps que tomamos de referencia para el flow mobile-first:

| App | Qué referencia |
|---|---|
| **Duolingo** | Daily streak UX + misiones diarias + claim de rewards |
| **Spotify** | Dark mode + transitions entre views |
| **Apple Music** | Card-based browsing |
| **Pokemon GO** | Apertura de "huevos" / loot boxes en mobile (timing del reveal) |

---

## 🎬 Movie / film references (mood de las animaciones)

Para el `PhaseTear` y el "complete espectacular":
- **Apertura de sobres en Pokemon TCG Online** — el shake + reveal cinematográfico
- **NBA Top Shot moment reveals** — el slow zoom dramático
- **Apple AirPods Pro unboxing video** — la sensación de "premium foil"
- **Films de Wes Anderson** para la paleta sobria + simetría (lejano pero válido como mood)

---

## 📚 Documentación de la lib

Útil cuando estás implementando algo nuevo:

| Lib | Docs |
|---|---|
| Motion (ex Framer Motion) | https://motion.dev/ |
| React Three Fiber | https://r3f.docs.pmnd.rs/ |
| Drei | https://docs.pmnd.rs/drei/introduction |
| Tailwind v4 | https://tailwindcss.com/docs |
| Radix UI | https://www.radix-ui.com/primitives |
| Lucide Icons | https://lucide.dev/ |
| Sonner (toasts) | https://sonner.emilkowal.ski/ |
| Supabase | https://supabase.com/docs |
| Next.js 16 | https://nextjs.org/docs |
| next/og (OG images) | https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image |
| Satori (lo que usa next/og) | https://github.com/vercel/satori |

---

## 🗂 Referencias

- [`./3d-pack.md`](./3d-pack.md) — Modelo 3D del sobre + rebrand
- [`./photos.md`](./photos.md) — Dónde sacar fotos para los cromos
- [`../03-design-system.md`](../03-design-system.md) — Tokens y conventions del DS
- [`../features/e1-pack-opening.md`](../features/e1-pack-opening.md) — Apertura cinemática del sobre
