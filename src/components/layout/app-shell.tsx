'use client'

import { useState } from 'react'
import { Footer } from './footer'
import { MobileNav } from './mobile-nav'
import { Navbar } from './navbar'

/**
 * Shell para páginas autenticadas: home, álbum, misiones, perfil, settings.
 *
 * - Navbar sticky con logo + nav links + avatar dropdown
 * - MobileNav drawer (controlado por estado interno)
 * - Footer minimal
 * - Container con max-width que se puede sobrescribir por la página
 */

type User = {
  username: string
  displayName?: string | null
  avatarUrl?: string | null
}

type AppShellProps = {
  children: React.ReactNode
  user: User
  coinsBalance?: number
}

export function AppShell({ children, user, coinsBalance }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        user={user}
        coinsBalance={coinsBalance}
        onMobileNavToggle={() => setMobileNavOpen(true)}
      />

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">{children}</main>

      <Footer variant="minimal" />
    </div>
  )
}
