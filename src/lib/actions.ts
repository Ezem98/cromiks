import 'server-only'

import { unstable_rethrow } from 'next/navigation'
import type { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Wrapper único para server actions: parse Zod → auth → ratelimit → fn,
 * con instrumentación de errores. Centraliza los cross-cuts de PR1/PR2/PR3.
 *
 * Stubs intencionales (TP-01 y TP-08 los reemplazan):
 *  - `withInstrumentation`: no-op hasta que PR2 (Sentry) lo conecte.
 *  - Ratelimit: el chequeo se saltea hasta que PR3 (Upstash) provea
 *    `getRateLimiter` y `RateLimitName` en `@/lib/ratelimit`.
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

// Placeholder hasta que PR3 cree `src/lib/ratelimit.ts` con la unión real.
type RateLimitName = string

type DefineActionOpts<TSchema extends z.ZodType, TOk> = {
  name: string
  schema: TSchema
  rateLimit?: RateLimitName | false
  auth?: 'required' | 'optional'
  expectedErrors?: readonly string[]
  fn: (input: z.infer<TSchema>, ctx: ActionContext) => Promise<ActionResult<TOk>>
}

// TODO(TP-01): reemplazar por Sentry.withServerActionInstrumentation
async function withInstrumentation<T>(_name: string, fn: () => Promise<T>): Promise<T> {
  return fn()
}

// TODO(TP-01): reemplazar por Sentry.captureException
function captureException(err: unknown, _ctx: { action: string }): void {
  console.error(`[action:${_ctx.action}]`, err)
}

// TODO(TP-01): reemplazar por Sentry.captureMessage con tags
function captureExpectedFailure(action: string, code: string): void {
  console.warn(`[action:${action}] ${code}`)
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

    // 3. Rate limit (stub hasta TP-08)
    // TODO(TP-08): if (opts.rateLimit && user && process.env.RATELIMIT_DISABLED !== 'true') {
    //   const rl = getRateLimiter(opts.rateLimit)
    //   const { success } = await rl.limit(`${opts.name}:${user.id}`)
    //   if (!success) return { ok: false, code: 'rate_limited' }
    // }

    // 4. Ejecutar con instrumentación
    return withInstrumentation(opts.name, async () => {
      try {
        const result = await opts.fn(parsed.data, {
          // Si auth === 'optional' y no hay user, userId va vacío. Las actions
          // que opten por 'optional' deben re-chequear en su fn antes de usarlo.
          userId: user?.id ?? '',
          supabase,
        })
        if (!result.ok && !opts.expectedErrors?.includes(result.code)) {
          captureExpectedFailure(opts.name, result.code)
        }
        return result
      } catch (err) {
        // redirect()/notFound() emiten errores especiales que Next.js usa para
        // control flow. NO los queremos capturar como "unknown" ni reportar a
        // Sentry — hay que re-emitirlos para que Next los procese.
        unstable_rethrow(err)
        captureException(err, { action: opts.name })
        return { ok: false, code: 'unknown' }
      }
    })
  }
}
