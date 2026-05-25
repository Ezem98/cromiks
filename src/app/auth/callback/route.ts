import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Magic link callback handler.
 *
 * Cuando el user clickea el link del email, Supabase lo redirige acá con
 * un `code` en la query. Lo intercambiamos por una sesión y redirigimos
 * a /home (o a la URL original que quería visitar).
 *
 * Si no hay code o falla el exchange, redirigimos a /signin?error=...
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession:', error.message)
    return NextResponse.redirect(`${origin}/signin?error=invalid_code`)
  }

  // Validar que next sea una path relativa (anti open-redirect)
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/home'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
