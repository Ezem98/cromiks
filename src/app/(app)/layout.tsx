import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { createClient } from '@/lib/supabase/server'

/**
 * Layout para páginas autenticadas con AppShell (navbar + footer).
 *
 * Lógica de guard:
 *  1. Si no hay user → /signin
 *  2. Si hay user pero no completó onboarding → /onboarding
 *  3. Si hay user onboarded → renderiza con AppShell
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  if (!user.user_metadata?.onboarded) {
    redirect('/onboarding')
  }

  // Profile y coins en paralelo
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
      {children}
    </AppShell>
  )
}
