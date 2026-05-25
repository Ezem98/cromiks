'use client'

import { ChevronDownIcon, LogOutIcon, MenuIcon, SettingsIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/**
 * Navbar de la app autenticada.
 *
 * - Logo/brand a la izquierda
 * - Navegación principal en medio (Home, Álbum, Misiones)
 * - Avatar + dropdown a la derecha
 * - Botón hamburguesa en mobile (controla MobileNav)
 */

type User = {
  username: string
  displayName?: string | null
  avatarUrl?: string | null
}

type NavbarProps = {
  user?: User
  coinsBalance?: number
  onMobileNavToggle?: () => void
  className?: string
}

export function Navbar({ user, coinsBalance, onMobileNavToggle, className }: NavbarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full',
        'bg-(--color-surface-deep)/80 backdrop-blur-lg',
        'border-b border-white/[0.06]',
        className,
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onMobileNavToggle}
          aria-label="Abrir menú"
          className="md:hidden p-2 -ml-2 rounded-md hover:bg-(--color-surface-raised) transition-colors"
        >
          <MenuIcon className="size-5" />
        </button>

        {/* Logo */}
        <Link href="/home" className="text-display text-2xl leading-none">
          Cromiks
        </Link>

        {/* Nav links — desktop only */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          <NavLink href="/home">Inicio</NavLink>
          <NavLink href="/album">Álbum</NavLink>
          <NavLink href="/missions">Misiones</NavLink>
        </nav>

        <div className="flex-1" />

        {/* Coins balance */}
        {coinsBalance !== undefined && (
          <div className="hidden sm:flex items-center gap-2 text-mono text-[13px]">
            <span className="size-4 rounded-full bg-(--color-gold)" />
            <span className="text-(--color-text-primary)">{coinsBalance}</span>
          </div>
        )}

        {/* User dropdown */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-full pl-1 pr-3 py-1',
                  'hover:bg-(--color-surface-raised) transition-colors',
                )}
              >
                <Avatar user={user} />
                <span className="hidden sm:inline text-sm text-(--color-text-primary)">
                  {user.displayName || user.username}
                </span>
                <ChevronDownIcon className="size-3.5 text-(--color-text-muted)" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-(--color-text-muted) text-[11px] uppercase tracking-wider">
                Tu cuenta
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/u/${user.username}`} className="cursor-pointer">
                  <UserIcon className="size-4" />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <SettingsIcon className="size-4" />
                  Ajustes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-(--color-danger) focus:text-(--color-danger)">
                <LogOutIcon className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/signin">Entrar</Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/signup">Sumarme</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'text-sm px-3 py-1.5 rounded-md',
        'text-(--color-text-secondary) hover:text-(--color-text-primary)',
        'hover:bg-(--color-surface-raised) transition-colors',
      )}
    >
      {children}
    </Link>
  )
}

function Avatar({ user }: { user: User }) {
  if (user.avatarUrl) {
    return (
      // Usamos img normal porque el avatar viene de URL dinámica del user.
      // En producción esto va a ser un Image con loader custom.
      // biome-ignore lint/performance/noImgElement: avatar dinámico de user
      <img
        src={user.avatarUrl}
        alt={user.displayName || user.username}
        className="size-7 rounded-full object-cover"
      />
    )
  }

  // Fallback con iniciales
  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase()
  return (
    <div className="size-7 rounded-full bg-(--color-surface-elevated) border border-white/10 flex items-center justify-center text-[11px] font-medium text-(--color-text-primary)">
      {initials}
    </div>
  )
}
