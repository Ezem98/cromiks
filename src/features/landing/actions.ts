'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'
import { track } from '@/lib/analytics'
import { getRateLimiter } from '@/lib/ratelimit'
import { addWaitlistContact } from '@/lib/resend'

/**
 * Server action de la landing pública (PR7 marketing, 11.4b).
 *
 *  - joinWaitlist: guarda un email en public.waitlist para la beta de junio 2026.
 *
 * Es pública (auth: 'optional') — el visitante NO está logueado. Por eso el
 * rate-limit del wrapper `defineAction` (que es por user_id) no aplica acá:
 * limitamos por IP a mano, igual que el endpoint OG. Ver `src/lib/ratelimit.ts`.
 *
 * El insert va por el server client con anon key. La policy de la tabla permite
 * insert anónimo pero NO select, así que no encadenamos .select(). La unicidad
 * de email se traduce a code 'already_subscribed' (mensaje amable, no Sentry).
 */

const joinWaitlistSchema = z.object({
  email: z.email().transform((e) => e.trim().toLowerCase()),
  locale: z.string().max(10).optional(),
})

export const joinWaitlist = defineAction({
  name: 'joinWaitlist',
  schema: joinWaitlistSchema,
  auth: 'optional',
  // El rate-limit por user del wrapper no sirve para un endpoint anónimo.
  // Lo hacemos por IP dentro del fn.
  rateLimit: false,
  expectedErrors: ['already_subscribed', 'rate_limited', 'insert_failed'],
  fn: async ({ email, locale }, { supabase }) => {
    // Rate-limit por IP (público, sin user). Mismo patrón que el OG endpoint.
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { success } = await getRateLimiter('waitlist').limit(`waitlist:${ip}`)
    if (!success) return { ok: false, code: 'rate_limited' }

    const { error } = await supabase.from('waitlist').insert({ email, locale, source: 'landing' })

    if (error) {
      // 23505 = unique_violation → ya estaba anotado.
      if (error.code === '23505') return { ok: false, code: 'already_subscribed' }
      return { ok: false, code: 'insert_failed', message: error.message }
    }

    // Sync a Resend para el broadcast de lanzamiento. Best-effort: la fuente de
    // verdad es la tabla `waitlist`; si Resend falla no rompemos el alta.
    await addWaitlistContact(email)

    await track('waitlist_joined', { locale: locale ?? 'unknown', source: 'landing' })

    return { ok: true, data: undefined }
  },
})
