# 00 · Producto y visión

## Qué es Cromiks

Cromiks es un **álbum digital coleccionable** del Mundial 2022 — la victoria de Argentina como campeón. Inspirado en los álbumes Panini físicos pero digital, con cromos que cobran vida: los legendarios se mueven, suenan, y "devuelven el momento original".

> El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el momento original.

**Nombre placeholder**: "Cromiks" — se va a decidir antes del launch. Posibles otros: Eterno, Diciembre, Cromos, etc.

**Álbum activo**: `eterno-diciembre` (id en DB). El nombre poético sale del clásico título "diciembre eterno" para el 18/12/2022.

---

## Target launch

**Junio 2026** — antes hay que pulir varios items críticos. Ver [`../roadmap.md`](../roadmap.md).

---

## Decisiones de producto centrales

| Decisión | Razón |
|---|---|
| **Gratis con tip jar** | No es un producto comercial agresivo. Es un homenaje. Si la gente quiere apoyar, hay tip jar (Mercado Pago) que dona a una fundación (Garrahan / Conin / Refugio Sin Cadenas — TBD) |
| **205 cromos en 10 páginas** | Matchea álbumes Panini históricos. Cantidad manejable: ~20-22 cromos por página |
| **1 sobre diario gratis + misiones** | Free-to-play sano. Si querés más sobres, hacés misiones — no se pueden comprar |
| **Sin trading entre usuarios (todavía)** | Compleja la implementación + economía. Si crecemos, considerar |
| **Rareza tier-coded**: common, uncommon, rare, epic, legendary | 5 niveles. Los legendaries son los 11 momentos del Mundial (gol Messi, gol Di María, etc.) |
| **Animaciones cinematográficas** | El producto se diferencia por la experiencia, no la cantidad de cromos |
| **Cromos repetidos se canjean por monedas** | Resolución de duplicados natural. Las legendaries NO se canjean (escasas, importan) |
| **Streak diario** | Engagement loop. No es brutal: si saltás un día perdés la racha pero no el sobre |
| **Audiencia AR primero, después LATAM, después global** | Idioma default español. Soporte adicional para `en`, `pt`, `it` desde el onboarding |

---

## Valores del producto

| Valor | Implicancia práctica |
|---|---|
| **Premium, sobrio** | Paleta dark, dorado, sin colores saturados ni glitter |
| **Argentino sin caer en cliché** | Sol de mayo OK, escudo AFA evitar (IP). Bandera literal evitar |
| **Tributo, no producto comercial** | Sin presión de compra. CTAs sutiles |
| **Privacy first** | No usamos saved payments. Las features sociales son opt-in |
| **Accesible** | Funciona en mobile de gama baja. Animaciones 3D con fallback para `prefers-reduced-motion` |
| **Sin IP de terceros** | Cero logos AFA / Adidas / equipos / Pokemon (el sobre actual es placeholder, ver [assets/3d-pack.md](../assets/3d-pack.md)) |

---

## Lo que NO es Cromiks

- ❌ No es un juego competitivo (no hay rankings PvP)
- ❌ No es un marketplace de NFTs (cero crypto, cero tokens)
- ❌ No es un wallet de stickers (no son sólo imágenes, son interactivos)
- ❌ No es una red social (los perfiles son públicos pero no hay feed ni follow)

---

## Personajes / usuarios

| Tipo | Perfil | Frecuencia esperada |
|---|---|---|
| **Coleccionista nostálgico** | 25-45 años, vio el Mundial. Quiere revivir | Daily login |
| **Fan casual** | 18-30 años, le gusta jugar | 2-3× por semana |
| **Lurker compartido** | Llega por share de WhatsApp, no se registra | One-shot view |

---

## Stack de decisiones del diseño visual

Ver detalle en [`../03-design-system.md`](../03-design-system.md). Resumen:

- **Paleta**: dark navy (`#0A0E14`) + dorado (`#D4A93C`) + celeste argentino (`#6BB9FF`)
- **Tipografía**: sans-serif system fonts por ahora, custom display TBD pre-launch
- **Animaciones**: Motion (ex Framer Motion) + Three.js / R3F para 3D
- **Sin GSAP** — Motion + useFrame + react-spring cubren 95% de necesidades

---

## Referencias

- [`01-tech-stack.md`](../01-tech-stack.md) — Stack técnico
- [`../roadmap.md`](../roadmap.md) — Pendientes y próximos pasos
- [`features/e1-pack-opening.md`](../features/e1-pack-opening.md) — La experiencia central del producto
