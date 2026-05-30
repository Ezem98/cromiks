import { WaitlistForm } from '@/features/landing/components/waitlist-form'

/**
 * Landing pública — la cara del producto para users no logueados.
 *
 * Se renderiza desde app/page.tsx (envuelta en MarketingShell, que aporta
 * header + footer). Si hay sesión, en su lugar se renderiza el Home autenticado.
 *
 * Estructura (PR7 marketing, 11.4):
 *   1. Hero + captura de email (beta)
 *   2. Qué tienen de distinto los cromos
 *   3. Las 11 Legendarias
 *   4. Cómo funciona (loop F2P sano)
 *   5. Homenaje, no negocio
 *   6. CTA final
 *
 * Voz de marca: voseo pleno, ritmo de cancha (DESIGN.md §3). Sin IP de terceros:
 * describimos momentos, no nombramos jugadores ni marcas en los headlines.
 * Página estática — el reset global respeta prefers-reduced-motion.
 */

const FEATURES = [
  {
    title: 'Se mueven',
    body: 'Las Legendarias no son una foto. Cobran vida.',
  },
  {
    title: 'Suenan',
    body: 'El relato, el grito, el momento. Tal cual lo viviste.',
  },
  {
    title: 'Te devuelven el momento',
    body: 'No coleccionás figuritas. Coleccionás recuerdos que podés volver a ver.',
  },
] as const

// Slots de las 11 Legendarias — teasers numerados (sin assets con IP todavía).
const LEGENDARIA_SLOTS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'] as const

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Un sobre por día',
    body: 'Gratis, siempre. Abrís, y adentro hay un asombro.',
  },
  {
    step: '02',
    title: '¿Querés más? Misiones',
    body: 'Más sobres se ganan jugando. No se compran.',
  },
  {
    step: '03',
    title: 'Pegoteá tu álbum',
    body: 'Las repetidas se canjean por monedas. Las Legendarias, jamás.',
  },
] as const

export function Landing() {
  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------------- */}
      {/* 1. Hero */}
      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-16 sm:pt-28 max-w-4xl mx-auto text-center">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-px w-6 bg-(--color-gold)" />
          <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
            Próximamente · junio 2026
          </span>
        </div>

        <h1 className="text-display text-[clamp(64px,12vw,128px)] leading-[0.88] mb-6">
          El álbum
          <br />
          <span className="prism-text">eterno.</span>
        </h1>

        <p className="text-[18px] leading-normal text-(--color-text-secondary) max-w-xl mb-8">
          El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el
          momento original. Empezamos por el más sagrado: Argentina campeón del mundo, 2022.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 text-mono text-[12px] text-(--color-text-muted) mb-10">
          <span className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-(--color-gold)" />
            205 cromos
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-(--color-gold)" />
            10 páginas narrativas
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-(--color-gold)" />
            11 Legendarias
          </span>
        </div>

        <WaitlistForm />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. Qué tienen de distinto los cromos */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-6 py-16 sm:py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-display text-[clamp(32px,5vw,52px)] leading-[0.95] mb-3 text-center">
            No es una figurita.
            <br />
            <span className="text-(--color-text-secondary)">Es el momento.</span>
          </h2>
          <p className="text-center text-(--color-text-muted) text-[15px] max-w-lg mx-auto mb-12">
            Lo viviste. Ahora lo revivís.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6"
              >
                <span className="text-mono text-[11px] text-(--color-gold)">0{i + 1}</span>
                <h3 className="text-display text-2xl mt-3 mb-2 leading-tight">{f.title}</h3>
                <p className="text-(--color-text-secondary) text-[14px] leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 3. Las 11 Legendarias */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-6 py-16 sm:py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold) mb-4">
            Las 11 Legendarias
          </p>
          <h2 className="text-display text-[clamp(32px,5vw,52px)] leading-[0.95] mb-4">
            Once momentos.
          </h2>
          <p className="text-(--color-text-secondary) text-[16px] max-w-xl mx-auto mb-12">
            Los que te pusieron la piel de gallina. Están todos. Y cuando sacás uno, vuelve a pasar.
          </p>

          {/* Teasers numerados — sin fotos con IP hasta tener assets propios. */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {LEGENDARIA_SLOTS.map((n) => (
              <div
                key={n}
                className="aspect-[3/4] rounded-[12px] bg-(--color-surface-raised) border border-white/[0.06] flex items-center justify-center"
              >
                <span className="text-display text-3xl text-(--color-text-ghost)">{n}</span>
              </div>
            ))}
            {/* Slot 12 = "y vos" / misterio */}
            <div className="aspect-[3/4] rounded-[12px] border border-dashed border-(--color-gold)/30 flex items-center justify-center">
              <span className="text-mono text-[10px] uppercase tracking-[0.1em] text-(--color-gold)/70 px-2 text-center">
                Sacalas todas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 4. Cómo funciona */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-6 py-16 sm:py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-display text-[clamp(32px,5vw,52px)] leading-[0.95] mb-12 text-center">
            Cómo funciona
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="text-center sm:text-left">
                <span className="text-display text-5xl text-(--color-gold)">{s.step}</span>
                <h3 className="text-display text-xl mt-3 mb-2 leading-tight">{s.title}</h3>
                <p className="text-(--color-text-secondary) text-[14px] leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 5. Homenaje, no negocio */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-6 py-16 sm:py-24 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-display text-[clamp(32px,5vw,52px)] leading-[0.95] mb-6">
            Esto no se vende.
          </h2>
          <p className="text-(--color-text-secondary) text-[17px] leading-relaxed mb-4">
            Los Mundiales no se venden. Cromiks es gratis y va a seguir siéndolo. Si te nace bancar
            el proyecto, hay una alcancía — y va enterita a una fundación.
          </p>
          <p className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted) leading-relaxed">
            Homenaje no comercial. Sin relación oficial con AFA, FIFA ni ninguna marca.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 6. CTA final */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-6 py-20 sm:py-28 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-display text-[clamp(40px,7vw,72px)] leading-[0.9] mb-6">
            Entrá a la
            <br />
            <span className="prism-text">beta.</span>
          </h2>
          <p className="text-(--color-text-secondary) text-[16px] mb-8">
            Dejá tu mail y sos de los primeros en armar el álbum eterno.
          </p>
          <WaitlistForm />
        </div>
      </section>
    </div>
  )
}
