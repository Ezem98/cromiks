import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Footer minimal.
 *
 * Se usa tanto en marketing como en app shells.
 */

// Columnas de la variante full. Solo links a rutas que existen — si una ruta
// todavía no existe (ej. /help, /donate), NO se linkea para evitar 404.
const FOOTER_LINKS = [
  {
    heading: 'Producto',
    links: [
      { label: 'Inicio', href: '/' },
      { label: 'Sumarme', href: '/signup' },
      { label: 'Entrar', href: '/signin' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Sobre Cromiks', href: '/about' },
      { label: 'Términos', href: '/legal#terminos' },
      { label: 'Privacidad', href: '/legal#privacidad' },
    ],
  },
] as const

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
  // en PR7 #11 porque sus links apuntaban a rutas inexistentes. Restauradas en
  // PR7 marketing ahora que /about y /legal existen (ver FOOTER_LINKS).
  return (
    <footer className={cn('border-t border-white/[0.06] py-12 px-6', className)}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div className="sm:col-span-1">
          <div className="text-display text-2xl mb-2">Cromiks</div>
          <p className="text-(--color-text-secondary) text-sm leading-relaxed max-w-md">
            El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el
            momento original.
          </p>
        </div>

        {FOOTER_LINKS.map((col) => (
          <nav key={col.heading} className="space-y-3">
            <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
              {col.heading}
            </p>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-(--color-text-secondary) text-sm hover:text-(--color-text-primary) transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-mono text-[11px] text-(--color-text-muted)">
        <span>Cromiks · Homenaje no comercial · 2026</span>
        <span>Hecho con cariño en Argentina</span>
      </div>
    </footer>
  )
}
