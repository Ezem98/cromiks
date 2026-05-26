import { redirect } from 'next/navigation'
import { MarketingShell } from '@/components/layout/marketing-shell'
import { createClient } from '@/lib/supabase/server'

/**
 * Layout para páginas marketing/auth.
 *
 * Redirige a /home si el user ya está logueado (porque no tiene sentido
 * mostrar la landing o el signup a un user autenticado).
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return <MarketingShell>{children}</MarketingShell>
}
