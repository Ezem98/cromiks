import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Landing pública — la cara del producto para users no logueados.
 *
 * Se renderiza desde app/page.tsx cuando NO hay sesión activa.
 * Si hay sesión, en su lugar se renderiza el Home autenticado.
 */
export function Landing() {
  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto text-center">
      {/* Eyebrow */}
      <div className="flex items-center gap-3 mb-6">
        <span className="h-px w-6 bg-(--color-gold)" />
        <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
          Próximamente · junio 2026
        </span>
      </div>

      {/* Hero title */}
      <h1 className="text-display text-[clamp(64px,12vw,128px)] leading-[0.88] mb-6">
        El álbum
        <br />
        <span className="prism-text">eterno.</span>
      </h1>

      {/* Tagline */}
      <p className="text-[18px] leading-normal text-(--color-text-secondary) max-w-xl mb-8">
        El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el momento
        original. Empezamos por el más sagrado: Argentina campeón mundial 2022.
      </p>

      {/* Meta */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-mono text-[12px] text-(--color-text-muted) mb-12">
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

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="primary" size="lg" asChild>
          <Link href="/signup">Sumate</Link>
        </Button>
      </div>
    </div>
  )
}
