// Compartido entre server (posthog-node) y client (posthog-js).
// Ver `docs/implementation-plan-pr6.md` §1.

// NEXT_PUBLIC_POSTHOG_KEY se lee con process.env (no con el `env` de t3-oss): este
// módulo se importa desde client components y el guard client de @t3-oss/env-nextjs
// rompería la hidratación. Next inlinea las NEXT_PUBLIC_* igual. La validación de
// presencia sigue cubierta en build/server por src/env.ts. Ver PR7.
export const POSTHOG_PROJECT_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''

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
