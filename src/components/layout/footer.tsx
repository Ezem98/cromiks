import { cn } from '@/lib/utils'

/**
 * Footer minimal.
 *
 * Se usa tanto en marketing como en app shells.
 */

type FooterProps = {
  variant?: 'minimal' | 'full'
  className?: string
}

export function Footer({ variant = 'minimal', className }: FooterProps) {
  if (variant === 'minimal') {
    return (
      <footer className={cn('border-t border-white/[0.06] py-6 px-6', className)}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-mono text-[11px] text-(--color-text-muted)">
          <span>Cromiks · Homenaje no comercial · 2026</span>
          <span>Hecho con cariño en Argentina</span>
        </div>
      </footer>
    )
  }

  // Variante full para landing
  return (
    <footer className={cn('border-t border-white/[0.06] py-12 px-6', className)}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="text-display text-2xl mb-2">Cromiks</div>
          <p className="text-(--color-text-secondary) text-sm leading-relaxed">
            El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el
            momento original.
          </p>
        </div>

        <div>
          <h4 className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-3">
            Producto
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="/about"
                className="text-(--color-text-secondary) hover:text-(--color-text-primary)"
              >
                Conocé el proyecto
              </a>
            </li>
            <li>
              <a
                href="/help"
                className="text-(--color-text-secondary) hover:text-(--color-text-primary)"
              >
                Ayuda
              </a>
            </li>
            <li>
              <a
                href="/donate"
                className="text-(--color-text-secondary) hover:text-(--color-text-primary)"
              >
                Donar a fundación
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-3">
            Legal
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="/legal"
                className="text-(--color-text-secondary) hover:text-(--color-text-primary)"
              >
                Términos y privacidad
              </a>
            </li>
            <li>
              <a
                href="/legal#homenaje"
                className="text-(--color-text-secondary) hover:text-(--color-text-primary)"
              >
                Sobre el homenaje
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-mono text-[11px] text-(--color-text-muted)">
        <span>Cromiks · Homenaje no comercial · 2026</span>
        <span>Hecho con cariño en Argentina</span>
      </div>
    </footer>
  )
}
