import { type NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { createClient } from '@/lib/supabase/server'

/**
 * Inicia el flow de OAuth desde un Route Handler (no desde un server action).
 *
 * Por qué un Route Handler y no `signInWithOAuth` dentro de un server action:
 *  - El browser navega acá con un GET normal → la cookie `code-verifier` (PKCE)
 *    se setea en una respuesta HTTP real que el browser sigue, sin las carreras
 *    de cookie ni el doble-invoke que puede tener un server action que hace
 *    redirect().
 *  - Un doble-click solo recarga la página (idempotente), en vez de disparar
 *    dos `/authorize` que dejan flow_states huérfanos → `bad_oauth_state`.
 *
 * Es el patrón que recomienda Supabase para App Router. El botón navega acá
 * con `window.location` (full-page, sin <Link>/prefetch), ver oauth-buttons.tsx.
 *
 * Google vuelve a /auth/callback?code=... que intercambia el code por sesión.
 */

const ALLOWED_PROVIDERS = ['google'] as const
type AllowedProvider = (typeof ALLOWED_PROVIDERS)[number]

function isAllowedProvider(p: string | null): p is AllowedProvider {
  return p !== null && (ALLOWED_PROVIDERS as readonly string[]).includes(p)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')

  if (!isAllowedProvider(provider)) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/signin?error=oauth_failed`)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    console.error('[auth/login] signInWithOAuth:', error?.message ?? 'no url returned')
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/signin?error=oauth_failed`)
  }

  // Redirige a Supabase /authorize (que crea el flow_state y manda a Google).
  // Las cookies seteadas por signInWithOAuth viajan en este response.
  return NextResponse.redirect(data.url)
}
