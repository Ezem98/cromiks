// Compartido entre server (posthog-node) y client (posthog-js).
// Project key es pública (mismo criterio que el DSN de Sentry: `sentry.server.config.ts`).
// Ver `docs/implementation-plan-pr6.md` §1.

// TODO: reemplazar con la key real del proyecto en PostHog Cloud post-signup.
export const POSTHOG_PROJECT_KEY = 'phc_REPLACE_ME_FROM_DASHBOARD'

// US tiene la cuota gratuita más alta. Para EU residency hay que crear un
// proyecto distinto (no se puede cambiar host por proyecto).
export const POSTHOG_HOST = 'https://us.i.posthog.com'

/** Kill switch server-side. Mismo patrón que SENTRY_DISABLED. */
export function isPosthogServerEnabled(): boolean {
  return process.env.POSTHOG_DISABLED !== 'true'
}

/** Kill switch client-side. Mismo patrón que NEXT_PUBLIC_SENTRY_DISABLED. */
export function isPosthogClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_POSTHOG_DISABLED !== 'true'
}
