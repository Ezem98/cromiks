import { type NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { createClient } from '@/lib/supabase/server'

/**
 * Callback de auth (magic link + OAuth).
 *
 * Supabase redirige acá con un `code` en la query. Lo intercambiamos por una
 * sesión y redirigimos a la URL destino (o /signin?error=... si falla).
 *
 * IMPORTANTE — NO usar el `origin` de `request.url` para construir el redirect.
 * Detrás del proxy de Railway, `request.url` refleja el host INTERNO del
 * contenedor (`localhost:8080`), no el dominio público → el login terminaba
 * mandando al usuario a `http://localhost:8080` tras un OAuth exitoso (la sesión
 * se seteaba pero el redirect final iba al puerto interno). Usamos la URL pública
 * canónica `NEXT_PUBLIC_APP_URL` (igual que `/auth/login`), que es de confianza.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const baseUrl = env.NEXT_PUBLIC_APP_URL
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // El provider (Supabase) puede redirigir acá con error en vez de code: p.ej.
  // ?error=invalid_request&error_code=bad_oauth_state cuando el state venció o
  // fue replayado (back, refresh, doble intento). Lo tratamos como "reintentá",
  // no como link inválido.
  const providerError = searchParams.get('error')
  if (providerError) {
    const errorCode = searchParams.get('error_code')
    console.error(
      '[auth/callback] provider error:',
      providerError,
      errorCode,
      searchParams.get('error_description'),
    )
    const signinError = errorCode === 'bad_oauth_state' ? 'oauth_retry' : 'oauth_failed'
    return NextResponse.redirect(`${baseUrl}/signin?error=${signinError}`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/signin?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession:', error.message)
    return NextResponse.redirect(`${baseUrl}/signin?error=invalid_code`)
  }

  // Validar que next sea una path relativa (anti open-redirect)
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  return NextResponse.redirect(`${baseUrl}${safeNext}`)
}
