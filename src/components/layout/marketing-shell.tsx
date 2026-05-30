import Link from 'next/link'
import { Footer } from './footer'

/**
 * Shell para páginas públicas: landing, signup, signin, /about, /help, /legal.
 *
 * - Header minimal con logo + "Sumarme" CTA
 * - Footer variante "full"
 * - Container con max-width genérico
 */

type MarketingShellProps = {
  children: React.ReactNode
  /**
   * Si false, no muestra el CTA "Sumarme" en el header.
   * Útil para evitar redundancia en /signup mismo.
   */
  showCta?: boolean
}

export function MarketingShell({ children, showCta = true }: MarketingShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-(--color-argentina-glow) focus:px-4 focus:py-2 focus:text-(--color-surface-deep) focus:font-medium"
      >
        Saltar al contenido
      </a>

      <header className="w-full border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-display text-2xl leading-none">
            Cromiks
          </Link>

          {showCta && (
            <div className="flex items-center gap-3">
              <Link
                href="/signin"
                className="text-sm text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-(--color-argentina-glow) text-(--color-surface-deep) px-4 py-1.5 rounded-md font-medium hover:bg-[#8FCCFF] transition-colors"
              >
                Sumarme
              </Link>
            </div>
          )}
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer variant="full" />
    </div>
  )
}
