import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { OnboardingForm } from '@/features/onboarding/components/onboarding-form'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Setup inicial',
}

/**
 * Página de onboarding post-signup.
 *
 * Layout focused (sin AppShell ni MarketingShell) — solo el formulario en
 * el centro de la pantalla. Sin distracciones.
 *
 * Si el user no está logueado, redirige a /signin.
 * Si ya completó el onboarding, redirige a /home.
 */
export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  if (user.user_metadata?.onboarded) {
    redirect('/home')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
            Casi listo
          </p>
          <h1 className="text-display text-5xl leading-[0.9]">Armemos tu perfil</h1>
          <p className="text-(--color-text-secondary) text-[15px] leading-relaxed pt-2">
            Esto se muestra cuando compartas tu álbum. Lo podés cambiar después.
          </p>
        </div>

        <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
          <OnboardingForm initialUsername={profile?.username ?? ''} email={user.email ?? ''} />
        </div>
      </div>
    </div>
  )
}
