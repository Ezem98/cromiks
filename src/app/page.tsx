import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { MarketingShell } from '@/components/layout/marketing-shell'
import { Home } from '@/features/home/components/home'
import { Landing } from '@/features/landing/landing'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Cromiks · El álbum eterno',
}

/**
 * Root route — la URL "/" para todo el mundo.
 *
 * Decide qué renderizar según el estado del user:
 *  - No hay sesión          → Landing pública con MarketingShell
 *  - Hay sesión sin onboarding → redirect a /onboarding
 *  - Hay sesión completa    → Home autenticado con AppShell
 *
 * La URL del browser SIEMPRE queda en "/". No hay redirect a /home.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Caso 1: no logueado
  if (!user) {
    return (
      <MarketingShell>
        <Landing />
      </MarketingShell>
    )
  }

  // Caso 2: logueado pero sin onboarding
  if (!user.user_metadata?.onboarded) {
    redirect('/onboarding')
  }

  // Caso 3: logueado y onboarded → renderizar Home con AppShell
  const [profileResult, coinsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single(),
    supabase.from('user_coins').select('balance').eq('user_id', user.id).single(),
  ])

  if (!profileResult.data) {
    redirect('/onboarding')
  }

  return (
    <AppShell
      user={{
        username: profileResult.data.username,
        displayName: profileResult.data.display_name,
        avatarUrl: profileResult.data.avatar_url,
      }}
      coinsBalance={coinsResult.data?.balance ?? 0}
    >
      <Home />
    </AppShell>
  )
}
