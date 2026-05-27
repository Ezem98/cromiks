import 'server-only'

import * as Sentry from '@sentry/nextjs'
import { unstable_rethrow } from 'next/navigation'
import type { z } from 'zod'
import { getRateLimiter, type RateLimitName } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'

/**
 * Wrapper único para server actions: parse Zod → auth → ratelimit → fn,
 * con instrumentación de Sentry. Centraliza los cross-cuts.
 *
 * Ver `docs/implementation-plan-prelaunch.md` §"Diseño cruzado".
 */

export type ActionResult<TOk> =
  | { ok: true; data: TOk }
  | { ok: false; code: string; message?: string }

export type ActionContext = {
  userId: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

type DefineActionOpts<TSchema extends z.ZodType, TOk> = {
  name: string
  schema: TSchema
  rateLimit?: RateLimitName | false
  auth?: 'required' | 'optional'
  expectedErrors?: readonly string[]
  fn: (input: z.infer<TSchema>, ctx: ActionContext) => Promise<ActionResult<TOk>>
}

export function defineAction<TSchema extends z.ZodType, TOk>(
  opts: DefineActionOpts<TSchema, TOk>,
): (rawInput?: unknown) => Promise<ActionResult<TOk>> {
  return async (rawInput?: unknown): Promise<ActionResult<TOk>> => {
    // 1. Validar input
    const parsed = opts.schema.safeParse(rawInput)
    if (!parsed.success) {
      return {
        ok: false,
        code: 'invalid_input',
        message: parsed.error.issues[0]?.message,
      }
    }

    // 2. Auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && opts.auth !== 'optional') {
      return { ok: false, code: 'unauthenticated' }
    }

    // 3. Rate limit. El módulo `@/lib/ratelimit` ya hace fail-open si faltan
    // env vars o si RATELIMIT_DISABLED=true, así que no hace falta chequear acá.
    if (opts.rateLimit && user) {
      const rl = getRateLimiter(opts.rateLimit)
      const { success } = await rl.limit(`${opts.name}:${user.id}`)
      if (!success) return { ok: false, code: 'rate_limited' }
    }

    // 4. Ejecutar con instrumentación de Sentry. recordResponse:true incluye
    // el ActionResult en el span para debug.
    return Sentry.withServerActionInstrumentation(
      opts.name,
      { recordResponse: true },
      async (): Promise<ActionResult<TOk>> => {
        try {
          const result = await opts.fn(parsed.data, {
            // Si auth === 'optional' y no hay user, userId va vacío. Las
            // actions que opten por 'optional' deben re-chequear en su fn
            // antes de usarlo.
            userId: user?.id ?? '',
            supabase,
          })
          // Fallo de negocio: si el code NO está marcado como esperado,
          // reportamos como warning (no ruido en dashboard).
          // El beforeSend de sentry.*.config.ts dropea events con codes
          // conocidos por las dudas, como segunda red.
          if (!result.ok && !opts.expectedErrors?.includes(result.code)) {
            Sentry.captureMessage(`[action:${opts.name}] ${result.code}`, {
              level: 'warning',
              tags: { action: opts.name, code: result.code },
            })
          }
          return result
        } catch (err) {
          // redirect()/notFound() emiten errores especiales que Next.js usa
          // para control flow. NO los queremos capturar como "unknown" ni
          // reportar a Sentry — hay que re-emitirlos.
          unstable_rethrow(err)
          Sentry.captureException(err, { tags: { action: opts.name } })
          return { ok: false, code: 'unknown' }
        }
      },
    )
  }
}
