import 'server-only'

import { PostHog } from 'posthog-node'
import { isPosthogServerEnabled, POSTHOG_HOST, POSTHOG_PROJECT_KEY } from '@/lib/posthog/config'

/**
 * Wrapper único de PostHog server-side. Las server actions llaman `track()`
 * para emitir eventos de producto (no errores — eso es Sentry).
 *
 * Kill switch: si POSTHOG_DISABLED=true, _client queda null y track() es no-op.
 * El SDK batchea internamente (flushAt: 20 / flushInterval: 10s). En Railway
 * el proceso es persistente, así que no hace falta await flush() por call.
 *
 * Ver `docs/implementation-plan-pr6.md` §3.
 */

let _client: PostHog | null = null

function getClient(): PostHog | null {
  if (!isPosthogServerEnabled()) return null
  if (_client) return _client

  _client = new PostHog(POSTHOG_PROJECT_KEY, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 10_000,
  })

  return _client
}

type TrackOpts = {
  /** Supabase user.id. Si está ausente, va como anónimo distinct_id generado. */
  distinctId?: string
}

/**
 * Emite un evento a PostHog desde el server. Fail-silent: nunca tira al caller.
 */
export async function track(
  event: string,
  properties: Record<string, unknown> = {},
  { distinctId }: TrackOpts = {},
): Promise<void> {
  const client = getClient()
  if (!client) return

  try {
    client.capture({
      distinctId: distinctId ?? `anon_${crypto.randomUUID()}`,
      event,
      properties: {
        ...properties,
        environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV,
        release: process.env.RAILWAY_GIT_COMMIT_SHA,
      },
    })
  } catch (err) {
    // Defensivo: posthog-node ya es fail-safe, pero analytics nunca debe
    // propagar errores al user.
    console.warn('[analytics] track failed', { event, err })
  }
}

/**
 * Flush manual. Útil para scripts standalone que terminan rápido. En server
 * actions normales no hace falta — el batch interno se encarga.
 */
export async function flushAnalytics(): Promise<void> {
  if (_client) await _client.flush()
}
