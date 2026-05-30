import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingShell } from '@/components/layout/marketing-shell'

export const metadata: Metadata = {
  title: 'Sobre Cromiks',
  description:
    'Qué es Cromiks, por qué existe y quién lo hace. Un homenaje no comercial al Mundial 2022.',
}

/**
 * /about — la historia del proyecto + créditos visibles (PR7 marketing, 11.5).
 *
 * Ruta top-level (NO dentro de (marketing)) porque ese route group redirige a
 * los users logueados a "/". /about tiene que verse logueado o no, así que
 * envuelve MarketingShell a mano.
 *
 * ⚠️ La sección "Créditos" es OBLIGATORIA por licencia: el modelo 3D del sobre
 * es CC-BY-4.0 y exige atribución visible (nombre del autor + link al original).
 * Fuente canónica de estos créditos: CREDITS.md (mantener ambos en sync).
 *
 * Tono: voz de marca (voseo, personal) salvo la nota legal del final (sobria).
 */

const CREDITS_3D = {
  title: 'Trading Card Pack',
  author: 'goonmize1',
  license: 'CC-BY-4.0',
  url: 'https://sketchfab.com/3d-models/trading-card-pack-26d1a87e47814d0ea3a710d169e3a671',
} as const

const NOT_CROMIKS = [
  'No es un juego competitivo. No hay rankings ni PvP.',
  'No es cripto. Cero NFT, cero tokens, cero blockchain.',
  'No es un marketplace. Los cromos no se compran ni se venden.',
  'No es una red social. No hay feed ni un botón de seguir.',
] as const

export default function AboutPage() {
  return (
    <MarketingShell>
      <article className="max-w-2xl mx-auto px-6 py-16 sm:py-24 space-y-16">
        {/* La historia */}
        <header className="text-center space-y-4">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
            Sobre Cromiks
          </p>
          <h1 className="text-display text-[clamp(40px,8vw,72px)] leading-[0.9]">
            Que diciembre
            <br />
            no se termine.
          </h1>
        </header>

        <section className="space-y-4 text-(--color-text-secondary) text-[17px] leading-relaxed">
          <p>Cromiks nació de una necesidad simple: que diciembre de 2022 no se termine nunca.</p>
          <p>
            Es el álbum de figuritas de toda la vida — el que pegoteabas en la mesa de la cocina —
            pero los cromos cobran vida. Las Legendarias se mueven, suenan y te devuelven el momento
            original. No es una foto: es el recuerdo, listo para volver a verlo cuando quieras.
          </p>
          <p>
            Empezamos por el más sagrado para nosotros: Argentina campeón del mundo. 205 cromos, 10
            páginas narrativas, 11 momentos que no nos vamos a olvidar nunca.
          </p>
        </section>

        {/* Quién lo hace */}
        <section className="space-y-4 border-t border-white/[0.06] pt-12">
          <h2 className="text-display text-3xl">Quién lo hace</h2>
          <p className="text-(--color-text-secondary) text-[16px] leading-relaxed">
            Lo hago yo, <strong className="text-(--color-text-primary)">Ezequiel Machado</strong>,
            un hincha más. Esto es un homenaje hecho con cariño en Argentina — un proyecto personal,
            no una empresa. Si algo se rompe o tenés una idea, hay alguien del otro lado que lo va a
            leer.
          </p>
        </section>

        {/* Qué NO es */}
        <section className="space-y-4 border-t border-white/[0.06] pt-12">
          <h2 className="text-display text-3xl">Lo que Cromiks no es</h2>
          <ul className="space-y-2">
            {NOT_CROMIKS.map((line) => (
              <li
                key={line}
                className="flex gap-3 text-(--color-text-secondary) text-[15px] leading-relaxed"
              >
                <span className="text-(--color-gold) shrink-0">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Créditos — OBLIGATORIO por licencia CC-BY */}
        <section className="space-y-5 border-t border-white/[0.06] pt-12">
          <h2 className="text-display text-3xl">Créditos</h2>
          <p className="text-(--color-text-secondary) text-[15px] leading-relaxed">
            Cromiks se para sobre el trabajo de mucha gente. Gracias.
          </p>

          <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6 space-y-2">
            <p className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)">
              Modelo 3D del sobre
            </p>
            <p className="text-(--color-text-primary) text-[15px]">
              «{CREDITS_3D.title}» por{' '}
              <a
                href={CREDITS_3D.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--color-argentina-glow) hover:underline underline-offset-2"
              >
                {CREDITS_3D.author}
              </a>{' '}
              — licencia {CREDITS_3D.license}.
            </p>
          </div>

          <div className="space-y-3 text-(--color-text-secondary) text-[14px] leading-relaxed">
            <p>
              <span className="text-(--color-text-primary)">Tipografías:</span> Outfit y Roboto,
              bajo SIL Open Font License (OFL).
            </p>
            <p>
              <span className="text-(--color-text-primary)">Tecnología:</span> Next.js, React,
              Three.js, Tailwind CSS y Supabase, entre otras librerías de código abierto.
            </p>
          </div>
        </section>

        {/* Nota legal sobria — puente a /legal */}
        <section className="border-t border-white/[0.06] pt-12">
          <p className="text-mono text-[12px] leading-relaxed text-(--color-text-muted)">
            Cromiks es un homenaje no comercial al fútbol argentino. El contenido pertenece a sus
            dueños. Sin relación oficial con AFA, FIFA ni Adidas. Ver{' '}
            <Link href="/legal" className="text-(--color-argentina-glow) hover:underline">
              términos y privacidad
            </Link>
            .
          </p>
        </section>
      </article>
    </MarketingShell>
  )
}
