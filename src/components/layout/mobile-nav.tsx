'use client'

import { HomeIcon, LayoutGridIcon, TargetIcon } from 'lucide-react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * Drawer mobile que reemplaza al nav horizontal en mobile.
 *
 * Se abre desde el botón hamburguesa del Navbar.
 */

type MobileNavProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const navItems = [
  { href: '/home', label: 'Inicio', icon: HomeIcon },
  { href: '/album', label: 'Álbum', icon: LayoutGridIcon },
  { href: '/missions', label: 'Misiones', icon: TargetIcon },
] as const

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-6 border-b border-white/[0.06]">
          <SheetTitle className="text-display text-3xl">Cromiks</SheetTitle>
          <SheetDescription className="text-(--color-text-muted) text-mono text-[11px] uppercase tracking-[0.15em]">
            El álbum eterno
          </SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-md',
                'text-(--color-text-primary) hover:bg-(--color-surface-raised)',
                'transition-colors',
              )}
            >
              <item.icon className="size-5 text-(--color-text-secondary)" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/[0.06]">
          <p className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
            Homenaje no comercial · 2026
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
