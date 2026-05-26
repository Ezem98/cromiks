'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server actions del onboarding.
 *
 * El user llega acá apenas creó su cuenta. Le pedimos:
 *  - username (con validación de unicidad)
 *  - idioma preferido
 *  - country code (opcional)
 *
 * Cuando completa, marcamos el profile como "onboarded" agregando un metadata.
 * En el futuro podríamos tener una columna boolean dedicada.
 */

type OnboardingResult = {
  ok: boolean
  error?: string
}

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

/**
 * Verifica si un username está disponible.
 * Excluye el username actual del user (para no marcar como "tomado" su propio username).
 */
export async function checkUsernameAvailable(username: string): Promise<{
  available: boolean
  error?: string
}> {
  const cleaned = username.trim().toLowerCase()

  if (!cleaned) {
    return { available: false, error: 'empty' }
  }

  if (!USERNAME_REGEX.test(cleaned)) {
    return { available: false, error: 'invalid_format' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { available: false, error: 'unauthenticated' }
  }

  // Buscar si alguien más lo tiene
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', cleaned)
    .neq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[onboarding] checkUsernameAvailable:', error.message)
    return { available: false, error: 'unknown' }
  }

  return { available: !data }
}

/**
 * Completa el onboarding: actualiza profile y redirige a /home.
 */
export async function completeOnboarding(data: {
  username: string
  displayName?: string
  language: 'es' | 'en' | 'pt' | 'it'
  countryCode?: string
}): Promise<OnboardingResult> {
  const cleanedUsername = data.username.trim().toLowerCase()
  const cleanedCountry = data.countryCode?.trim().toUpperCase()

  if (!USERNAME_REGEX.test(cleanedUsername)) {
    return { ok: false, error: 'invalid_username' }
  }

  if (cleanedCountry && cleanedCountry.length !== 2) {
    return { ok: false, error: 'invalid_country' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'unauthenticated' }
  }

  // Update del profile
  const { error } = await supabase
    .from('profiles')
    .update({
      username: cleanedUsername,
      display_name: data.displayName?.trim() || null,
      language: data.language,
      country_code: cleanedCountry || null,
    })
    .eq('id', user.id)

  if (error) {
    // Username tomado a último momento (race condition)
    if (error.code === '23505') {
      return { ok: false, error: 'username_taken' }
    }
    console.error('[onboarding] completeOnboarding:', error.message)
    return { ok: false, error: 'unknown' }
  }

  // Marcar onboarding completo en el metadata del user
  // (Lo usamos para detectar si necesita onboarding o no en futuros logins.)
  await supabase.auth.updateUser({
    data: { onboarded: true },
  })

  revalidatePath('/', 'layout')
  redirect('/')
}
