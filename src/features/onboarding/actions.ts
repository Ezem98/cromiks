'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'

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

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, { message: 'invalid_format' })

/**
 * Verifica si un username está disponible.
 *
 * Devuelve `{ available: boolean }` en data. Si el formato es inválido o el
 * username está tomado por otro user, devuelve `ok: false` con el code
 * correspondiente.
 */
export const checkUsernameAvailable = defineAction({
  name: 'checkUsernameAvailable',
  schema: z.object({ username: z.string() }),
  expectedErrors: ['empty', 'invalid_format', 'username_taken'],
  fn: async ({ username }, { userId, supabase }) => {
    const cleaned = username.trim().toLowerCase()
    if (!cleaned) return { ok: false, code: 'empty' }
    if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) return { ok: false, code: 'invalid_format' }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .neq('id', userId)
      .maybeSingle()

    if (error) {
      return { ok: false, code: 'unknown', message: error.message }
    }
    if (data) {
      return { ok: false, code: 'username_taken' }
    }
    return { ok: true, data: { available: true } }
  },
})

/**
 * Completa el onboarding: actualiza profile y redirige a /home.
 *
 * El redirect se hace dentro del fn — Next emite NEXT_REDIRECT que el wrapper
 * re-throwea vía `unstable_rethrow` en defineAction. La función nunca retorna
 * en el happy path.
 */
const completeOnboardingSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(50).optional(),
  language: z.enum(['es', 'en', 'pt', 'it']),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(2)
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export const completeOnboarding = defineAction({
  name: 'completeOnboarding',
  schema: completeOnboardingSchema,
  expectedErrors: ['username_taken'],
  fn: async (input, { userId, supabase }) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: input.username,
        display_name: input.displayName ?? null,
        language: input.language,
        country_code: input.countryCode ?? null,
      })
      .eq('id', userId)

    if (error) {
      if (error.code === '23505') {
        return { ok: false, code: 'username_taken' }
      }
      return { ok: false, code: 'unknown', message: error.message }
    }

    // Marcar onboarding completo en el metadata del user.
    await supabase.auth.updateUser({ data: { onboarded: true } })

    revalidatePath('/', 'layout')
    redirect('/')
  },
})
