import 'server-only'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Anti-abuso para endpoints calientes via Upstash Ratelimit (HTTP-based, edge-safe).
 *
 * Fail-open: si faltan las env vars de Upstash o `RATELIMIT_DISABLED=true`, el
 * limiter retorna `{ success: true }` y la action continúa. Esto evita romper
 * el flow del usuario si Redis está caído o si no hay credenciales en dev.
 *
 * Wire:
 *  - Server actions: `defineAction({ rateLimit: 'openPack' })` enchufa el chequeo
 *    automáticamente en el wrapper. Key = `<name>:<userId>`.
 *  - OG endpoint (sin user): `getRateLimiter('ogCard')` + key por IP.
 *
 * Decisiones de ventana (todas conservadoras, sliding window):
 *  - `openPack`       10/min · uso real ~1 cada 30s
 *  - `claimMission`   20/min · típico 3 claims/día
 *  - `recordShare`    30/min · tracking, no destructivo
 *  - `claimDailyPack` 5/min  · 1 vez al día
 *  - `ogCard`         60/min · por IP (público, sin user)
 *
 * Si vemos abuso después de launch, bajar los números o agregar tiers. Si vemos
 * falsos positivos, subir o desactivar el limiter de esa action.
 */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : undefined

const LIMITS = {
  openPack: { tokens: 10, window: '1 m' },
  claimMission: { tokens: 20, window: '1 m' },
  recordShare: { tokens: 30, window: '1 m' },
  claimDailyPack: { tokens: 5, window: '1 m' },
  ogCard: { tokens: 60, window: '1 m' },
} as const satisfies Record<string, { tokens: number; window: `${number} ${'s' | 'm' | 'h'}` }>

export type RateLimitName = keyof typeof LIMITS

// Limiter que siempre permite. Se usa cuando no hay Redis (dev sin env vars) o
// cuando RATELIMIT_DISABLED=true. Tipado para que la firma matchee `Ratelimit`.
const NOOP_LIMITER = {
  limit: async () => ({ success: true, limit: 0, remaining: 0, reset: 0 }),
} as unknown as Ratelimit

const limiters = new Map<RateLimitName, Ratelimit>()

export function getRateLimiter(name: RateLimitName): Ratelimit {
  if (!redis || process.env.RATELIMIT_DISABLED === 'true') {
    return NOOP_LIMITER
  }

  const cached = limiters.get(name)
  if (cached) return cached

  const cfg = LIMITS[name]
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
    analytics: true,
    prefix: `cromiks:rl:${name}`,
  })
  limiters.set(name, limiter)
  return limiter
}
