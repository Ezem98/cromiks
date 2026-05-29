// Compartido entre server (posthog-node) y client (posthog-js).
// Ver `docs/implementation-plan-pr6.md` §1.

import { env } from '@/env'

// Project key: viene de env. Es pública (se inlinea en el bundle igual con
// NEXT_PUBLIC_), pero la dejamos en env para poder rotarla / apuntar a otro
// proyecto sin redeploy. Setear en Railway Variables y en .env.local.
export const POSTHOG_PROJECT_KEY = env.NEXT_PUBLIC_POSTHOG_KEY ?? ''

// Host hardcoded: no cambia por entorno (el plan free vive en us.i.posthog.com).
// Para EU residency hay que crear un proyecto distinto (no se puede cambiar host
// por proyecto), no un toggle por env.
export const POSTHOG_HOST = 'https://us.i.posthog.com'

/** Kill switch server-side. Mismo patrón que SENTRY_DISABLED. */
export function isPosthogServerEnabled(): boolean {
  return process.env.POSTHOG_DISABLED !== 'true'
}

/** Kill switch client-side. Mismo patrón que NEXT_PUBLIC_SENTRY_DISABLED. */
export function isPosthogClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_POSTHOG_DISABLED !== 'true'
}
