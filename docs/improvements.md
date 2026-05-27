# ✨ Mejoras (código + UX/UI)

Snapshot: 26 mayo 2026.

Mejoras concretas sobre el MVP actual. **No** incluye bugs (eso vive en [`bugs.md`](./bugs.md)) ni features nuevas (eso vive en [`feature-ideas.md`](./feature-ideas.md)). Tampoco repite cosas marcadas como 🚧 pendientes en [`feature-status.md`](./feature-status.md).

## Cómo leer

| Símbolo | Significado |
|---|---|
| 🔥 | **Alta** — pre-launch sí o sí |
| 🟡 | **Media** — mejora notable, pero no bloquea launch |
| 🟢 | **Baja** — pulido, post-launch tranquilo |

---

## 🛠 Mejoras de código

### C-01 · Validación con Zod en todas las server actions 🔥
**Archivos**: [`src/features/*/actions.ts`](../src/features/)

Ninguna action valida sus inputs. Conviene un patrón uniforme: definir schemas Zod (o `valibot`) por action, parsear primero, devolver `{ ok: false, code: 'invalid_input' }` antes de tocar la DB. Beneficio cruzado: documenta el contrato de la action sin docstring.

**Esfuerzo**: 1 archivo `lib/actions.ts` con helper `defineAction(schema, fn)` + migrar 4-5 actions. Media tarde.

### C-02 · Error codes tipados en RPCs en vez de substring matching 🔥
**Archivos**: [`supabase/migrations/`](../supabase/migrations/) + actions correspondientes

Hoy las RPC tiran `raise exception 'pack_not_found'` y el cliente hace `error.message.includes('not_found')`. Frágil ante cambios. Mover a `raise exception using errcode = 'P0001', message = 'pack_not_found'` y leer `error.code` + `error.details`. Documentar el catálogo de errores en [`05-sql-functions.md`](./05-sql-functions.md).

**Esfuerzo**: 1 sesión completa (tocar todas las RPC actuales + actions).

### C-03 · Estrategia de logging / observabilidad 🔥
**Archivos**: `src/lib/` (nuevo helper) + todas las actions

`console.error(...)` no llega a producción (Vercel logs caducan). Sin Sentry/Axiom no vamos a saber qué se rompe post-launch. Sentry ya está en backlog 🚧 — yo lo subiría a P0 antes de junio.

**Esfuerzo**: 2-3 horas integrar Sentry + envolver las actions con `withErrorReporting`.

### C-04 · `strict: true` en `tsconfig.json` + erradicar `as` peligrosos 🔥
**Archivos**: [`tsconfig.json`](../tsconfig.json), assertions varias

Las `as Tier`, `as OpenPackResult` esquivan el check. Habilitar `strict: true` + agregar `parseTier()` exhaustivo. Pre-launch ideal para frenar drift.

**Esfuerzo**: 1-2 horas si strict ya está; si no, puede destapar cuestiones que requieren 1 sesión.

### C-05 · Catálogo de error codes UI 🟡
**Archivo**: `src/lib/errors.ts` (nuevo)

Cuando estandaricemos error codes (C-02), conviene una tabla `code → copy de usuario` en un solo lugar. Hoy cada action arma su propio toast con frases distintas.

### C-06 · `revalidateTag` semántico en vez de `revalidatePath` 🟡
**Archivos**: actions varias

Hoy revalidamos paths concretos (`/`, `/album`). Mejor un sistema de tags (`user-balance`, `album-progress`, `mission-status`) que se pueden combinar y son más estables ante movimiento de rutas. Bonus: arregla parcialmente B-09.

### C-07 · `useTransition` + `isPending` en client actions 🟡
**Archivos**: [`daily-pack-card.tsx`](../src/features/home/components/daily-pack-card.tsx), [`card-detail-dialog.tsx`](../src/features/album/components/card-detail-dialog.tsx), [`share-sheet.tsx`](../src/features/sharing/components/share-sheet.tsx), [`missions-card.tsx`](../src/features/home/components/missions-card.tsx)

Patrón uniforme: `const [pending, start] = useTransition(); start(() => action())`. Habilita disabled + spinner consistente y previene doble-tap.

### C-08 · Constantes de tamaños de Cromo/Sobre 🟢
**Archivos**: [`cromo.tsx`](../src/components/domain/cromo.tsx), [`sobre.tsx`](../src/components/domain/sobre.tsx)

Los `sizeMap = { sm: ..., md: ..., lg: ... }` están duplicados. Mover a `src/lib/sizes.ts` (o al design-system doc) y reusar.

### C-09 · Co-locar `@keyframes` shimmer/float 🟢
**Archivos**: globals.css + componentes

Hoy los componentes referencian keyframes globales por nombre. O bien colocarlos junto al componente (CSS module) o documentarlos en [`03-design-system.md`](./03-design-system.md) como animation tokens.

### C-10 · Helper `assignDailyMissions` que devuelve las misiones 🟡
**Archivo**: [`src/features/missions/queries.ts`](../src/features/missions/queries.ts) + home page

Hoy si no hay misiones, asignamos y volvemos a llamar `getHomeData`. Mejor: `assignDailyMissions` retorna las misiones creadas y el caller las inyecta en lo que ya tenía. Una sola query menos por usuario por día (1× DAU).

### C-11 · `import * as THREE` / framer-motion → tree-shake 🟢
**Archivos**: 3D components

Verificar que los imports de Three.js y `motion/react` no tiren bundle inflado. R3F ya hace mucho del trabajo, pero vale la pena confirmar.

### C-12 · Patrón único para queries Supabase 🟡
**Archivos**: [`src/features/*/queries.ts`](../src/features/)

Algunas queries usan `select('*')`, otras detallan columnas, otras usan inner joins explícitos. Definir convención en [`02-architecture.md`](./02-architecture.md): "select solo lo que se usa en la vista" + tipos co-localizados.

### C-13 · `<DailyPackCard>` y `<MissionsCard>` son client components 🟢
**Archivos**: respectivos

Revisar si la parte interactiva no puede vivir adentro de un Server Component shell (renderizar shell server-side y delegar el botón a un mini client). Mejora TTFB.

### C-14 · Tests setup (vitest + Playwright) 🟡
**Archivos**: no existen

No hay setup de tests. Para un MVP cerrado pre-launch yo no metería full coverage, pero sí: 1 smoke E2E con Playwright (signup → open pack → ver cromo en álbum) y unit tests para los happy/edge cases de los RPCs (testear contra una DB de prueba con seed).

### C-15 · Exportar `Tier` y otros enums desde un único `types/domain.ts` 🟢
**Archivos**: varios

Hoy `Tier` se importa de [`pack-opening/types.ts`](../src/features/pack-opening/types.ts) pero se usa en album, profile, sharing. Mover a un dominio compartido.

---

## 🎨 Mejoras de UX/UI

### U-01 · Toast global de errores + éxitos (sonner) 🔥
**Archivos**: feature components

Hoy las acciones se procesan en silencio. Cada server action debería disparar un toast en el cliente:
- ✅ "Cromo pineado" / "Compartido"
- ❌ "No pudimos canjear, intentá de nuevo"

`sonner` ya está instalado. Hace falta cablearlo en el client después de cada `await action()`.

### U-02 · Empty states humanizados 🔥
**Archivos**: [`home/components/missions-card.tsx`](../src/features/home/components/missions-card.tsx), [`album/components/album-view.tsx`](../src/features/album/components/album-view.tsx), [`profile/components/profile-view.tsx`](../src/features/profile/components/profile-view.tsx)

Edge cases visibles:
- Home sin misiones (caída de RPC): mensaje + CTA "Recargar"
- Álbum sin cromos (post-signup, antes del primer pack): copy "Abrí tu primer sobre para empezar" + CTA al home
- Perfil sin pineados: copy "Todavía no pineaste ningún cromo. Tocá uno para empezar"
- Home sin sobres pendientes: explicar que hay un sobre por día + countdown al próximo

### U-03 · Confirmación antes de dismantle 🔥
**Archivo**: [`card-detail-dialog.tsx`](../src/features/album/components/card-detail-dialog.tsx)

Ver B-02. UX + bug.

### U-04 · Loading skeleton del álbum 🔥
**Archivo**: [`src/app/(app)/album/`](../src/app/(app)/album/) (necesita `loading.tsx`)

La grilla aparece "popeando" cuando termina el query. Skeleton con 20-30 placeholders gris + shimmer matchea el layout final.

### U-05 · Onboarding visual de la primera vez 🔥
**Archivo**: nuevo, probablemente [`features/onboarding/`](../src/features/onboarding/)

El primer usuario después del signup llega al home sin saber qué hacer. Tour de 3 pasos:
1. "Este es tu sobre del día"
2. "Esta es tu racha"
3. "Acá vas a ver tus misiones"

Coachmarks tipo overlay con flecha. Skippable y nunca vuelve a aparecer (flag en `profiles.onboarding_seen_at`).

### U-06 · Countdown al próximo sobre 🟡
**Archivo**: [`daily-pack-card.tsx`](../src/features/home/components/daily-pack-card.tsx)

Si ya abrió el del día, mostrar "Próximo sobre en 8h 23m" en vez de simplemente esconder/disable. Crea anticipación.

### U-07 · Variantes de `complete` por rareza máxima 🟡
Item 3.12 ya está en backlog 🚧, pero quiero re-enfatizarlo: el `complete` espectacular es **el** momento del pack opening. Tener 3 niveles (común-rare, epic, legendary) baja el feel "monótono" del 4to/5to sobre.

### U-08 · Microinteracciones de pin/unpin 🟡
**Archivo**: [`card-detail-dialog.tsx`](../src/features/album/components/card-detail-dialog.tsx)

Animar el ícono de pin (rotación + scale + color) cuando se toggle. Optimistic update local antes del round-trip al server.

### U-09 · Accesibilidad: contraste WCAG AA 🟡
**Archivos**: design-system + componentes

Verificar contrast ratios en:
- Tier badges sobre fondo navy
- "Disabled" states (gris sobre navy)
- Texto en cards rare/epic/legendary con gradientes

Tool: axe DevTools / Lighthouse. Si fallan, ajustar tokens del design system.

### U-10 · `aria-label` y semántica en el álbum 🟡
**Archivo**: [`album-slot.tsx`](../src/features/album/components/album-slot.tsx)

Slots como buttons con `aria-label="Cromo {n} de 205, {tier}, {tenés/te falta}"`. Roles `role="grid"`/`role="gridcell"`. Permite navegación con keyboard + screen reader.

### U-11 · Focus visible consistente 🟡
**Archivo**: design system / globals.css

Verificar que `:focus-visible` tiene un outline gold consistente en todos los interactivos (botones, inputs, cards del álbum). Hoy `outline-none` puede estar comiéndoselo.

### U-12 · Mobile: tap targets >= 44×44 px 🟡
**Archivos**: navbar / mobile-nav / album grid

Auditar tap targets en mobile, especialmente los dots de página del álbum y los íconos pequeños del bottom nav.

### U-13 · Visual feedback en el botón "Compartir" 🟢
**Archivo**: [`share-sheet.tsx`](../src/features/sharing/components/share-sheet.tsx)

Cuando hace "Copiar link", animar el botón a checkmark + cambiar copy a "Copiado!" por 2s.

### U-14 · Preview del OG image en el ShareSheet 🟢
**Archivo**: [`share-sheet.tsx`](../src/features/sharing/components/share-sheet.tsx)

Renderizar el `/api/og/card/[cardId]` como thumbnail dentro del sheet, así el usuario ve **qué** va a compartir antes de elegir target.

### U-15 · Atajos de teclado en el álbum 🟢
**Archivo**: [`album-view.tsx`](../src/features/album/components/album-view.tsx)

`←` / `→` para navegar páginas, `Esc` para cerrar el dialog del cromo. Quick wins de UX desktop.

### U-16 · Animación entre fases del pack opening 🟢
**Archivo**: [`pack-opening-flow.tsx`](../src/features/pack-opening/components/pack-opening-flow.tsx)

Las transiciones entre `anticipation → tear → stack → summary` son cortes secos. Crossfade de 200ms suaviza.

### U-17 · Imágenes con `sizes` prop optimizado 🟡
**Archivos**: [`cromo.tsx`](../src/components/domain/cromo.tsx), profile, album

Next/Image sin `sizes` carga imágenes más grandes de lo necesario en mobile. `sizes="(max-width: 640px) 160px, (max-width: 1024px) 240px, 320px"` ahorra bandwidth.

### U-18 · "Saltar animación" más descubrible 🟢
**Archivo**: [`pack-opening-flow.tsx:51`](../src/features/pack-opening/components/pack-opening-flow.tsx)

El botón skip tiene aria-label pero no copy visible. Un primer encuentro debería verlo. Aparición fade-in delayed después de 1.5s, o tooltip "Tocá acá para saltar" la primera vez.

### U-19 · CTA contextual en `/cromo/[cardId]` para guests 🟡
**Archivo**: [`src/app/cromo/[cardId]/page.tsx`](../src/app/cromo/[cardId]/page.tsx)

Si llega un guest desde un share, mostrar "¿Querés tu propio álbum? Sumate gratis" sticky abajo. Hoy hay "Lo tenés / No lo tenés" para logueados, pero el guest no tiene CTA visible.

### U-20 · `text-balance` en títulos cortos 🟢
**Archivos**: varios

`text-wrap: balance` en h1/h2 de cards corta visualmente mejor. CSS gratis.

### U-21 · Página `/` (`landing`) — visual hierarchy 🟡
**Archivo**: [`src/features/landing/landing.tsx`](../src/features/landing/landing.tsx)

La landing está marcada como "básica" en feature-status. Pre-launch necesita: hero claro con CTA primaria, ejemplos visuales de cromos animados (recuperando assets), social proof (cuando exista), countdown si es pre-launch.

### U-22 · Share targets: pre-fill caption "lo dijo el copy strategist" 🟢
**Archivo**: [`share-sheet.tsx`](../src/features/sharing/components/share-sheet.tsx)

Hoy el caption es genérico. Variantes por tier:
- Common: "Mirá qué cromo me tocó 👀"
- Legendary: "🔥 ¡Conseguí a {name}! ¿Lo tenés?"

Multiplica engagement de compartidos.

### U-23 · Vibration API en momentos clave 🟡
Item 3.11 ya en backlog 🚧, pero quiero anchor: vibración corta (~30ms) cuando se rompe el sobre (`navigator.vibrate(30)`) y vibración larga (~150ms) cuando aparece legendary. Casi-nada de código, mucho juice.

### U-24 · Sticky `(tu posición)` en la nav de páginas del álbum 🟢
**Archivo**: [`album-page-nav.tsx`](../src/features/album/components/album-page-nav.tsx)

Cuando hay >10 páginas, scroll horizontal con la actual centrada. Hoy son 10 fijas y ok, pero si en el futuro hay más álbumes lo vamos a necesitar.

### U-25 · Persistir scroll position del álbum 🟢
**Archivo**: [`album-view.tsx`](../src/features/album/components/album-view.tsx)

Volver al álbum después de abrir un dialog hoy resetea el scroll. Mantener offset (sessionStorage o referenced state) mejora flow.

---

## Tabla resumen

| ID | Prio | Categoría | 1-liner |
|---|---|---|---|
| C-01 | 🔥 | Código | Zod en server actions |
| C-02 | 🔥 | Código | Error codes tipados en RPC |
| C-03 | 🔥 | Código | Sentry + logging strategy |
| C-04 | 🔥 | Código | `strict: true` + matar `as` peligrosos |
| C-05 | 🟡 | Código | Catálogo de error codes UI |
| C-06 | 🟡 | Código | revalidateTag semánticos |
| C-07 | 🟡 | Código | useTransition uniforme |
| C-08 | 🟢 | Código | Constantes tamaños cromo/sobre |
| C-09 | 🟢 | Código | Co-locar keyframes |
| C-10 | 🟡 | Código | assignDailyMissions retorna las misiones |
| C-11 | 🟢 | Código | Bundle audit (three/motion) |
| C-12 | 🟡 | Código | Patrón único queries Supabase |
| C-13 | 🟢 | Código | Cards client → server shells |
| C-14 | 🟡 | Código | Smoke E2E + tests RPC |
| C-15 | 🟢 | Código | Domain types compartidos |
| U-01 | 🔥 | UX | Toast feedback global |
| U-02 | 🔥 | UX | Empty states humanizados |
| U-03 | 🔥 | UX | Confirmación dismantle |
| U-04 | 🔥 | UX | Loading skeleton álbum |
| U-05 | 🔥 | UX | Onboarding visual primer vez |
| U-06 | 🟡 | UX | Countdown próximo sobre |
| U-07 | 🟡 | UX | Variantes complete por rareza |
| U-08 | 🟡 | UX | Microinteracciones pin |
| U-09 | 🟡 | A11y | WCAG AA contrast audit |
| U-10 | 🟡 | A11y | aria-label álbum |
| U-11 | 🟡 | A11y | Focus visible consistente |
| U-12 | 🟡 | A11y | Tap targets mobile ≥44px |
| U-13 | 🟢 | UX | "Copiado!" feedback |
| U-14 | 🟢 | UX | Preview OG en ShareSheet |
| U-15 | 🟢 | UX | Atajos teclado álbum |
| U-16 | 🟢 | UX | Crossfade entre fases |
| U-17 | 🟡 | Perf | Image sizes prop |
| U-18 | 🟢 | UX | Skip animación descubrible |
| U-19 | 🟡 | UX | CTA guest en /cromo |
| U-20 | 🟢 | UX | text-balance en títulos |
| U-21 | 🟡 | UX | Pulir landing |
| U-22 | 🟢 | UX | Captions de share por tier |
| U-23 | 🟡 | UX | Haptics (vibrate) |
| U-24 | 🟢 | UX | Nav álbum sticky/scroll |
| U-25 | 🟢 | UX | Persistir scroll álbum |

---

## Sprint sugerido pre-launch

Si tengo que elegir **un solo sprint de 1 semana** pre-launch, va por las 🔥:

**Día 1-2**: C-01 (Zod) + C-02 (error codes) + C-03 (Sentry) + C-04 (strict).
**Día 3**: U-01 (toasts) + U-03 (confirmación dismantle) + U-04 (skeleton álbum).
**Día 4-5**: U-02 (empty states) + U-05 (onboarding visual).

Eso deja el producto con plumbing decente + UX que respira en los puntos de fricción más altos.
