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

  // Variante full para landing. Las columnas "Producto" y "Legal" se removieron
  // en PR7 #11 porque todos sus links apuntaban a rutas inexistentes
  // (/about, /help, /donate, /legal). Vuelven cuando esas pages existan.
  return (
    <footer className={cn('border-t border-white/[0.06] py-12 px-6', className)}>
      <div className="max-w-6xl mx-auto">
        <div className="text-display text-2xl mb-2">Cromiks</div>
        <p className="text-(--color-text-secondary) text-sm leading-relaxed max-w-md">
          El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el
          momento original.
        </p>
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-mono text-[11px] text-(--color-text-muted)">
        <span>Cromiks · Homenaje no comercial · 2026</span>
        <span>Hecho con cariño en Argentina</span>
      </div>
    </footer>
  )
}
