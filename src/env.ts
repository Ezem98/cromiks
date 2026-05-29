import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Validación central de env vars (TP-11). Falla el build si falta una requerida.
 *
 * --- Vars que NO viven acá (a propósito) ---
 * Guard externo (consumido por Supabase/servicios, no por Next): incluido abajo
 *   como server requerido → RESEND_API_KEY, RESEND_FROM_EMAIL.
 * Kill switches (opt-in `!== 'true'`, leídos crudos en sus helpers):
 *   POSTHOG_DISABLED, NEXT_PUBLIC_POSTHOG_DISABLED, SENTRY_DISABLED,
 *   NEXT_PUBLIC_SENTRY_DISABLED, RATELIMIT_DISABLED.
 * Tooling (fuera del runtime de la app, crudos): PLAYWRIGHT_*, CI, NEXT_RUNTIME,
 *   SENTRY_AUTH_TOKEN (webpack plugin).
 * No wired / dashboard-configured (fuera de scope): R2_*, GOOGLE_CLIENT_*,
 *   APPLE_*, NEXT_PUBLIC_APP_NAME.
 */
export const env = createEnv({
  server: {
    SUPABASE_SECRET_KEY: z.string().min(1),
    // Guard de presencia: lo consume Supabase Auth SMTP, no Next. Requerido
    // para que un Railway sin la var falle el build (mails OTP).
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.email().default('hola@cromiks.com'),
    // Fail-open en dev/preview; el refine de abajo los exige en producción.
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Platform-injected por Railway (pueden faltar en local).
    RAILWAY_ENVIRONMENT_NAME: z.string().optional(),
    RAILWAY_GIT_COMMIT_SHA: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.url(),
    // PostHog: opcional (SDK no manda eventos si está vacía). Mantiene el
    // comportamiento actual (`?? ''` en config.ts).
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    // Inyectadas por next.config.ts desde las RAILWAY_* server-side.
    NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME: z.string().optional(),
    NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA: z.string().optional(),
  },
  shared: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  // Next inlinea NEXT_PUBLIC_* → hay que mapear cada var explícitamente.
  runtimeEnv: {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_GIT_COMMIT_SHA: process.env.RAILWAY_GIT_COMMIT_SHA,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME: process.env.NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME,
    NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA,
    NODE_ENV: process.env.NODE_ENV,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})

// Upstash es fail-open en dev/preview, pero en producción queremos garantía de
// que el ratelimit está activo. Gateamos por RAILWAY_ENVIRONMENT_NAME (no
// NODE_ENV) para que preview/staging no lo exijan.
if (
  !process.env.SKIP_ENV_VALIDATION &&
  env.RAILWAY_ENVIRONMENT_NAME === 'production' &&
  (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
) {
  throw new Error(
    '❌ UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN son requeridas en producción (ratelimit fail-open no permitido en prod).',
  )
}
