# 🎟 Plan de implementación PR7 · Marketing & legales pre-launch · Cromiks

> **Nota**: Plan de **marketing/contenido** (no es tech-proposals). Pre-launch target: **junio 2026**. Snapshot: 2026-05-29.

## Context

El MVP funcional de Cromiks está cerrado y el stack pre-launch (Sentry, Zod, Ratelimit, E2E, PostHog, Better Stack) está casi cerrado. Lo que falta para mostrar el producto al mundo son **3 páginas públicas** del [`docs/feature-status.md`](./feature-status.md) §11, todas hoy en 🚧:

- **11.4 — Landing marketing real**: hoy es un único hero ([`src/features/landing/landing.tsx`](../src/features/landing/landing.tsx), 58 líneas). Funciona pero no "vende" el producto: no muestra qué hacen los cromos, no explica el loop, no comunica el homenaje, y el footer perdió sus columnas.
- **11.5 — `/about` con créditos visibles**: no existe. [`CREDITS.md`](../CREDITS.md) tiene un **TODO explícito** de exponer atribuciones — el modelo 3D del sobre (goonmize1, **CC-BY-4.0**) *requiere por licencia* atribución visible al usuario. Hoy esa obligación no se cumple en el sitio.
- **11.6 — `/legal` (terms + privacy)**: no existe. Recolectamos datos (Supabase auth, PostHog, Sentry, Upstash) y a futuro pagos (Mercado Pago tip jar). Sin política publicada.

El [`footer.tsx`](../src/components/layout/footer.tsx) ya documenta que sus columnas "Producto" y "Legal" se removieron en PR7 #11 *"porque todos sus links apuntaban a rutas inexistentes (/about, /help, /donate, /legal). Vuelven cuando esas pages existan."* — este plan las hace existir.

**Outcome esperado**: un sitio público presentable para la beta de junio 2026, que respeta la voz de marca, cumple la obligación de atribución CC-BY, publica términos/privacidad sobrios, y empieza a capturar emails de la waitlist.

---

## Decisiones tomadas (confirmadas con el dueño)

| # | Decisión | Implicancia |
|---|---|---|
| D1 | **Tono: voz de marca actual (lúdica-emocional)** | Seguir [`DESIGN.md`](../DESIGN.md) §3 al pie en landing y /about: voseo pleno, ritmo de cancha, "homenaje sin solemnidad". **Excepción**: /legal va en tono **formal/sobrio, tercera persona** (matriz de tono §3.2, fila "Comunicación legal"). |
| D2 | **CTA: email waitlist (join beta) + `/signup` activo** | El dominio real todavía no se compró (11.2 🚧). Se agrega captura de email para la beta **sin** sacar el `/signup` que ya funciona. Quien quiera entrar ya, entra; el resto deja su mail. |
| D3 | **/legal: escrito a medida, conciso** | Terms + privacy redactados específicos para Cromiks (homenaje no comercial, bajo riesgo). Sobrio, suficiente, sin inflar. |
| D4 | **/about: te menciona como creador** | Ezequiel Machado nombrado como creador. Cara humana al "hecho con cariño en Argentina". Las atribuciones de terceros (CC-BY) van igual por requisito de licencia. |

**Guardrails de marca (de [`00-product-vision.md`](./00-product-vision.md) y `DESIGN.md`)** — válidos para todo el copy:
- **Sin IP de terceros**: cero logos AFA/FIFA/Adidas/equipos. Sol de mayo OK, escudo AFA y bandera literal **evitar**. Nada de nombres con marca registrada en headlines.
- **Forbidden language** (`DESIGN.md` §3.4): nada de español neutro, anglicismos ("claim/drop/loguearse"), corporativo, hype vacío, ni una sola referencia a NFT/crypto/web3/earn.
- **Free, no producto**: tono de regalo, no de venta. Tip jar → fundación (Garrahan/Conin/Refugio — TBD, 11.13). CTAs sutiles.

---

## 📊 Scope

| Item | Página | Ruta | Estado actual | Entregable |
|---|---|---|---|---|
| 11.4 | Landing marketing real | `/` (no logueado) | Hero único básico | Landing multi-sección con waitlist |
| 11.5 | About + créditos | `/about` | No existe | Página nueva con historia + créditos visibles (CC-BY) |
| 11.6 | Legal | `/legal` | No existe | Terms + Privacy en una página con anclas |
| — | Footer full | (compartido) | Columnas removidas | Restaurar columnas Producto/Legal |
| — | Waitlist | server action + tabla | No existe | Captura de email para beta |

Fuera de scope (quedan 🚧 para otro PR): 11.1 nombre final, 11.2 dominio, 11.3 handles, 11.7 `/help` FAQ, 11.8 tip jar Mercado Pago integrado, 11.12 fuentes custom, 11.13 fundación, 11.14 re-texturizar sobre.

---

## 1️⃣ 11.4 · Landing marketing real

### Estructura (single page, dark premium, scroll vertical)

Reescribir [`src/features/landing/landing.tsx`](../src/features/landing/landing.tsx) como composición de secciones. Reusar tokens y utilidades ya existentes: `text-display`, `text-mono`, `prism-text`, `bg-(--color-gold)`, `--color-argentina-glow`, `Button` de `@/components/ui/button`. **Respetar `prefers-reduced-motion`** (valor del producto: accesible).

1. **Hero** (evolución del actual, no reemplazo total)
   - Eyebrow: `Próximamente · junio 2026`
   - Título: **El álbum** / **eterno.** (mantener `prism-text` en "eterno")
   - Tagline: *"El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el momento original. Empezamos por el más sagrado: Argentina campeón del mundo, 2022."*
   - Meta chips: `205 cromos · 10 páginas narrativas · 11 Legendarias`
   - **CTA dual**: campo de email *"Dejá tu mail y entrás a la beta"* + botón **"Avisame"** (waitlist) · link secundario *"o sumate ya →"* a `/signup`.

2. **Qué tienen de distinto los cromos** (3 columnas)
   - **Se mueven** — *"Las Legendarias no son una foto. Cobran vida."*
   - **Suenan** — *"El relato, el grito, el momento. Tal cual lo viviste."*
   - **Te devuelven el momento** — *"No coleccionás figuritas. Coleccionás recuerdos que podés volver a ver."*

3. **Las 11 Legendarias** (sin nombres con IP — describir momentos, no marcas)
   - Copy: *"Once momentos. Los que te pusieron la piel de gallina. Están todos. Y cuando sacás uno, vuelve a pasar."*
   - Grid de 11 slots tipo teaser (placeholders sobrios, sin fotos reales con IP — usar siluetas/tipografía hasta tener assets propios).

4. **Cómo funciona** (el loop sano F2P)
   - *"Un sobre por día. Gratis, siempre."* / *"¿Querés más? Hacé misiones. No se compran."* / *"Pegoteá tu álbum. Las repetidas se canjean por monedas."*

5. **Homenaje, no negocio**
   - Copy (voz de marca, sigue siendo emocional): *"Esto no se vende. Los Mundiales no se venden. Cromiks es gratis y va a seguir siéndolo. Si te nace bancar el proyecto, hay una alcancía — y va enterita a una fundación."*
   - Nota sobria al pie: *"Homenaje no comercial. Sin relación oficial con AFA, FIFA ni ninguna marca."* (cubre el flanco legal en la propia landing).

6. **CTA final** (repite waitlist + `/signup`).

7. **Footer full restaurado** (ver §4).

### Copy: hacer / no hacer
- ✅ Voseo pleno, frases cortas, emoción (D1). Ej: "Lo viviste. Ahora lo revivís."
- ❌ Nombrar jugadores/DT/rivales por nombre en headlines (riesgo de derechos de imagen). Describir el momento, no la persona.
- ❌ Mostrar fotos reales del Mundial hasta validar derechos. Usar tratamiento tipográfico/silueta.

### Archivos
- **Modificar**: [`src/features/landing/landing.tsx`](../src/features/landing/landing.tsx) — componer las 7 secciones.
- **Nuevos (opcional, si la landing crece)**: `src/features/landing/sections/*.tsx` (hero, features, legendarias, loop, tribute) para mantener el archivo legible.
- **Sin cambios**: [`src/app/page.tsx`](../src/app/page.tsx) — sigue decidiendo Landing vs Home por sesión.

---

## 2️⃣ 11.4b · Waitlist (captura de email beta)

Decisión D2: capturar emails sin bloquear `/signup`.

### Backend
- **Tabla nueva** `waitlist` en Supabase (migración en [`supabase/`](../supabase/)):
  ```sql
  create table public.waitlist (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    locale text,                 -- es/en/pt/it desde el navegador
    source text default 'landing',
    created_at timestamptz default now()
  );
  -- RLS: insert público anónimo permitido, select solo service role.
  ```
- **Server action nueva** `joinWaitlist` en `src/features/landing/actions.ts`, usando el helper existente [`defineAction`](../src/lib/actions.ts):
  - `schema: z.object({ email: z.email(), locale: z.string().optional() })`
  - `auth: 'optional'` (es público)
  - `rateLimit`: agregar entrada `waitlist` (por IP) en [`src/lib/ratelimit.ts`](../src/lib/ratelimit.ts) — ej. `{ tokens: 5, window: '1 m' }`. El endpoint es público → limitar por IP como el OG endpoint.
  - `expectedErrors: ['already_subscribed']` (violación de unique → mensaje amable, no Sentry).
  - Copy de error en [`src/lib/errors.ts`](../src/lib/errors.ts): `already_subscribed: 'Ya estás en la lista, te avisamos 👀'`.
- **Confirmación de éxito**: copy *"Listo. Cuando abramos, sos de los primeros."*

> **Resend (implementado)**: la tabla `waitlist` es la fuente de verdad; además, al alta exitosa se registra el contacto en Resend vía [`addWaitlistContact`](../src/lib/resend.ts) (`POST https://api.resend.com/contacts`, Contacts API account-level), dentro del segmento **"Waitlist · beta"** (`5e866e10-3d2a-46a1-91db-4d920befb008`) para el broadcast de lanzamiento. Es best-effort/fail-silent: si Resend falla, el alta igual queda en Supabase. El segment id es público → hardcodeado (igual que el DSN de Sentry); `RESEND_API_KEY` viene de env.

### Frontend
- Componente `WaitlistForm` (client) con `useTransition`, input email + botón "Avisame", estados loading/success/error con toast (mismo patrón que el resto de la app). Reutilizable en hero y CTA final.

---

## 3️⃣ 11.5 · `/about` con créditos visibles

Página nueva. **Ruta top-level** (`src/app/about/page.tsx`), NO dentro del route group `(marketing)`: ese grupo tiene un layout que **redirige a los users logueados a `/`** ([`(marketing)/layout.tsx`](../src/app/(marketing)/layout.tsx)), y `/about` tiene que verse logueado o no (el footer del app shell también linkea acá). La página envuelve `MarketingShell` a mano.

- **Ruta**: `src/app/about/page.tsx`
- **Metadata**: title `Sobre Cromiks`, description del homenaje.

### Secciones

1. **La historia** (voz de marca, emocional)
   - *"Cromiks nació de una necesidad simple: que diciembre de 2022 no se termine nunca."*
   - El por qué: el álbum Panini de toda la vida, pero los cromos cobran vida.

2. **Quién lo hace** (D4 — creador nombrado)
   - *"Lo hago yo, Ezequiel Machado, un hincha más. Esto es un homenaje hecho con cariño en Argentina."* (alinear con el footer "Hecho con cariño en Argentina").
   - Tono personal, no corporativo.

3. **Qué NO es Cromiks** (refuerza posicionamiento, de `00-product-vision.md`)
   - No es competitivo, no es NFT/crypto, no es marketplace, no es red social.

4. **Créditos y atribuciones** ⚠️ **obligatorio por licencia**
   - Renderizar visiblemente el contenido de [`CREDITS.md`](../CREDITS.md):
     - **Modelo 3D del sobre** — *"Trading Card Pack" by goonmize1*, **CC-BY-4.0**, con **link al original en Sketchfab** (la licencia exige nombre del autor + link donde el modelo es visible al usuario).
     - Tipografías (Outfit, Roboto — OFL), librerías core (Next.js, React, Three.js, Supabase, etc.).
   - **Decisión de implementación**: para no duplicar texto, exponer los créditos como contenido estructurado. Dos opciones (elegir en build):
     - (a) Hardcodear el bloque de créditos en el `.tsx` (simple, lo más rápido).
     - (b) Generar desde `CREDITS.md` en build. **Recomendado: (a)** por simplicidad; mantener `CREDITS.md` como fuente canónica y la página como espejo, con un comentario que cruce ambos.

5. **Nota legal sobria** (puente a `/legal`)
   - *"Cromiks es un homenaje no comercial al fútbol argentino. El contenido pertenece a sus dueños. Sin relación oficial con AFA, FIFA ni Adidas."* (copy literal de la matriz de tono legal de `DESIGN.md` §3.2).

---

## 4️⃣ 11.6 · `/legal` (terms + privacy)

Decisión D3: escrito a medida, conciso, **tono formal/sobrio/tercera persona** (única excepción a la voz de marca).

- **Ruta**: `src/app/legal/page.tsx` (top-level, mismo motivo que `/about`) con anclas `#terminos` y `#privacidad` (una sola página, dos secciones — el footer puede linkear a cada ancla).
- **Metadata**: title `Términos y privacidad`.

### Términos de uso (esqueleto de contenido)
- Naturaleza: homenaje **no comercial**, servicio gratuito "tal cual está" (as-is), pre-launch/beta.
- No afiliación: sin relación oficial con AFA, FIFA, Adidas, clubes ni jugadores. Marcas y nombres pertenecen a sus dueños.
- Cuenta: el usuario es responsable de su acceso. Edad mínima razonable.
- Economía del juego: monedas/sobres/cromos **no tienen valor monetario**, no se compran ni se canjean por dinero, no son transferibles fuera del producto. **Nada de crypto/NFT.**
- Donaciones (tip jar): voluntarias, no reembolsables, destinadas a fundación. (Texto activable cuando se integre Mercado Pago — 11.8.)
- Propiedad intelectual: el código y la identidad Cromiks son del proyecto; assets de terceros bajo sus licencias (ver `/about`).
- Cambios y baja del servicio: puede cambiar o discontinuarse sin previo aviso (es un proyecto personal/beta).

### Política de privacidad (esqueleto — basado en infra real)
Datos que efectivamente se tocan (verificado en `.env.example` y configs):
- **Cuenta**: email vía **Supabase Auth** (OTP/OAuth). No se guardan contraseñas propias.
- **Analítica de producto**: **PostHog** (eventos de uso, feature flags). Mencionar finalidad y opt-out si aplica.
- **Errores**: **Sentry** (stack traces; Replays **off** según plan prelaunch — confirmar).
- **Anti-abuso**: **Upstash** (rate-limit por IP).
- **Email**: **Resend** (transaccional vía Supabase; + waitlist si dejó su mail).
- **Pagos**: **no se guardan medios de pago** (valor "privacy first" de `00-product-vision.md`). Mercado Pago procesa donaciones cuando exista — los datos de pago los maneja Mercado Pago, no Cromiks.
- **Perfiles públicos**: username/display/avatar visibles públicamente; features sociales **opt-in**.
- **Derechos del usuario**: contacto para baja/borrado (definir email de contacto — `hola@cromiks.com` ya es el `RESEND_FROM_EMAIL` default).
- **Cookies**: solo sesión (Supabase) + analítica; sin publicidad de terceros.

> ⚠️ **Disclaimer en el doc**: incluir nota *"Este texto no constituye asesoramiento legal; revisar con profesional antes del launch comercial"*. Apropiado al alcance no comercial; baja la deuda sin pretender ser un dictamen.

---

## 5️⃣ Footer full restaurado

Restaurar en [`src/components/layout/footer.tsx`](../src/components/layout/footer.tsx) (variante `full`) las columnas que se removieron, ahora que las rutas existen:
- **Producto**: link a secciones de la landing (anclas) + `/signup`.
- **Legal**: `/about`, `/legal#terminos`, `/legal#privacidad`. (`/help` y `/donate` quedan fuera — siguen sin existir; **no** linkear a rutas inexistentes, mismo criterio que el comentario actual del footer.)
- Mantener la línea `Cromiks · Homenaje no comercial · 2026` y `Hecho con cariño en Argentina`.

Header (`MarketingShell`): opcionalmente sumar link a `/about` junto a "Entrar" — bajo prioridad.

---

## 📁 Resumen de archivos

**Nuevos**
- `src/app/(marketing)/about/page.tsx`
- `src/app/(marketing)/legal/page.tsx`
- `src/features/landing/actions.ts` (`joinWaitlist`)
- `src/features/landing/components/waitlist-form.tsx`
- `supabase/migrations/<ts>_waitlist.sql`
- (opcional) `src/features/landing/sections/*.tsx`

**Modificados**
- `src/features/landing/landing.tsx` — landing multi-sección
- `src/components/layout/footer.tsx` — restaurar columnas
- `src/lib/ratelimit.ts` — entrada `waitlist`
- `src/lib/errors.ts` — `already_subscribed`
- `docs/feature-status.md` — marcar 11.4/11.5/11.6 según avance (🚧 → 🟡/✅)

**Sin tocar**: `src/app/page.tsx`, `(marketing)/layout.tsx` (ya redirigen logueados correctamente).

---

## ✅ Verificación end-to-end

- [ ] No logueado, `/` muestra la landing nueva completa; las animaciones respetan `prefers-reduced-motion`.
- [ ] Waitlist: dejar un email válido → toast éxito + fila en tabla `waitlist`. Reenviar el mismo → mensaje "ya estás en la lista" (no error en Sentry). 6 intentos/min misma IP → `rate_limited`.
- [ ] `/signup` sigue funcionando (CTA secundario "sumate ya").
- [ ] `/about` carga con `MarketingShell`; muestra créditos del modelo 3D con **nombre del autor (goonmize1) + link a Sketchfab visibles** (chequeo de cumplimiento CC-BY-4.0); nombra a Ezequiel como creador.
- [ ] `/legal` carga; anclas `#terminos` y `#privacidad` scrollean; tono sobrio en tercera persona; incluye disclaimer.
- [ ] Footer full muestra columnas Producto/Legal con links **a rutas que existen** (cero 404). Logueado: el footer/links no rompen.
- [ ] `pnpm type-check` y `pnpm lint` limpios. Smoke E2E existente sigue verde (la landing no logueada no rompe el golden path).
- [ ] Revisión de copy: cero IP en headlines, cero forbidden language (`DESIGN.md` §3.4), voseo consistente.

---

## 🔗 Referencias

- [`docs/feature-status.md`](./feature-status.md) §11 — items 11.4 / 11.5 / 11.6
- [`docs/00-product-vision.md`](./00-product-vision.md) — qué es / qué no es / valores / guardrails de IP
- [`DESIGN.md`](../DESIGN.md) §2-3 — brand essence + voice & tone (matriz de tono, forbidden language)
- [`CREDITS.md`](../CREDITS.md) — atribuciones obligatorias (CC-BY del sobre)
- [`docs/implementation-plan-prelaunch.md`](./implementation-plan-prelaunch.md) — `defineAction`, ratelimit, errors (helpers que reutiliza la waitlist)
