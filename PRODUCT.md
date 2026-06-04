# Product

> Capa estratégica de Cromiks. Lo visual (tokens, tipografía, motion, anatomía de cromos) vive en [DESIGN.md](./DESIGN.md), que es la fuente de verdad del design system. Este archivo responde quién/qué/por qué.

## Register

product

> Default para la mayoría de las superficies (home, álbum, misiones, perfil, onboarding): UI sobria y consistente que sirve a la tarea, para que los cromos brillen. Las superficies brand (landing `/`, `/about`, pack opening, detalle de cromo) se overridean por tarea: ahí el diseño ES el producto y aplican tipografía display, motion cinematográfico y color committed.

## Users

Personas 22–40, argentinas o latinoamericanas con conexión emocional al fútbol, urbanas, smartphone-first. Mix de millennials y gen Z que creció entre Panini físico y Pokémon Go; para muchas, Qatar 2022 fue su primer Mundial ganado conscientemente. Tres perfiles:

- **Coleccionista nostálgico** (25–45): vio el Mundial, quiere revivirlo. Daily login.
- **Fan casual** (18–30): le gusta jugar. 2–3× por semana.
- **Lurker compartido**: llega por un share de WhatsApp, no se registra. One-shot view.

El job to be done no es "completar una colección", es **revivir el momento**. No compite con FIFA Mobile; compite con Spotify Wrapped.

## Product Purpose

Cromiks es un **álbum digital**: el primero donde los cromos épicos se mueven, suenan y te devuelven el momento original. El primer álbum es Argentina campeón mundial 2022: 205 cromos en 10 páginas narrativas, 11 Legendarias con video y relato. Gratis con tip jar a fundación; es un homenaje, no un producto comercial. Éxito = asombro al abrir un sobre, nostalgia activa al revivir un momento, orgullo de tener TU álbum armado.

Categoría sin metáforas: "álbum digital". No es plataforma, no es experiencia inmersiva, no es Web3 collectibles.

## Brand Personality

En 3 palabras: **asombro, homenaje, argentino.**

- Norte emocional en orden: **asombro** (al sacar una Rare+) → **nostalgia activa** ("lo viví y lo estoy reviviendo", nunca melancolía pasiva) → **orgullo** ("este es MI álbum").
- Voz: voseo argentino pleno, slang futbolero sin parodia, frases cortas con ritmo de cancha, segunda persona ("Esta es tu Legendaria"). La emoción no se esconde: cuando hay celebración se nota, cuando hay error se asume con humor.
- Tono visual: dark premium, sobrio, edición limitada y archivo (Topps Chrome, Panini Adrenalyn como sensación, no como estética calcada).

Detalle completo de voice & tone (matriz por contexto, yes/no, lenguaje prohibido) en [DESIGN.md §3](./DESIGN.md).

## Anti-references

- **No NFT / crypto / blockchain**, ni en estética ni en discurso. Cero "claim", "drop", "earn".
- **No casino / gambling**: cero ruletas; los pity systems existen pero son invisibles.
- **No hardcore gaming**: sin leaderboards globales agresivos, sin PvP.
- **No museo / Wikipedia solemne**: homenaje sin solemnidad; asombro, no archivo muerto.
- **No cliché argentino**: sol de mayo OK; escudo AFA y bandera literal, evitar (IP además).
- **No español neutro** ("haz click", "posees") ni corporativo ("disfruta una experiencia única").
- **No asumir conocimiento profundo de fútbol** del usuario.

## Design Principles

1. **La rareza se gana la pantalla.** Los colores de tier y los efectos (foil, glow, prisma) viven exclusivamente en los cromos. La UI general es sobria y restrained para que el cromo sea siempre lo más vivo de la pantalla.
2. **Curaduría sobre cantidad.** 205 cromos elegidos uno por uno; cada elemento de UI también. Si dudamos, lo sacamos. No hay templates rellenados con datos: hay decisiones.
3. **Las celebraciones requieren amplitud, la UI requiere calma.** Un streak de 30 días merece partículas; un like no. Una animación por contexto, sin loops decorativos, motion cinematográfico solo en reveals y celebraciones.
4. **Homenaje sin solemnidad.** Reverente con los momentos (la apertura de una Legendaria es ceremonia), alegre en todo lo demás. El corazón está permitido cuando viene del alma.
5. **Tributo, no producto comercial.** Sin presión de compra, CTAs sutiles, los sobres extra se ganan con misiones, no se compran. El tip jar es invitación, nunca peaje.

## Accessibility & Inclusion

- **WCAG 2.1 AA** como target; ratios de contraste verificados en todos los tokens de texto (ver DESIGN.md §4.3).
- **`prefers-reduced-motion` respetado siempre**: la carta queda plana, glare y holo se ocultan, fallback a fades simples. Crítico en un producto cuyo diferenciador es el motion.
- Focus visible en todos los interactivos, skip-to-content, alt text obligatorio en cromos (jugador + momento), captions en videos con audio narrativo.
- Funciona en mobile de gama baja (audiencia AR smartphone-first); animaciones 3D con fallback.
- Producto dark-only, sin light mode alternativo.
- Idioma default español rioplatense; soporte `en`, `pt`, `it` desde el onboarding.
