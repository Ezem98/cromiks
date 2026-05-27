// Sentry client-side init. Se carga automáticamente por @sentry/nextjs
// cuando el bundle del cliente boota.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

// Codes de negocio que NO queremos en Sentry (consumen cuota free + ruido).
// Mantener sincronizado con `sentry.server.config.ts`.
const EXPECTED_BUSINESS_CODES = new Set([
  'invalid_input',
  'unauthenticated',
  'rate_limited',
  'not_owner',
  'already_opened',
  'not_found',
  'invalid_count',
  'card_not_found',
  'legendary_not_dismantlable',
  'card_not_owned',
  'must_keep_one',
  'mission_not_completed',
  'mission_not_found',
  'template_not_found',
  // Home / daily pack
  'already_claimed',
  'no_streak',
  // Onboarding
  'username_taken',
])

Sentry.init({
  dsn: 'https://cf8810e1066dc099e235b2aeaed21f2d@o4511446656286720.ingest.us.sentry.io/4511459597352960',

  enabled: process.env.NEXT_PUBLIC_SENTRY_DISABLED !== 'true',
  environment: process.env.NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME || 'development',
  release: process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA || undefined,

  tracesSampleRate: 0.1,

  // Logs estructurados — off para ahorrar cuota.
  enableLogs: false,

  // Replays — off por bundle (+ ~50kb) + privacidad pre-launch.
  // Si querés activarlos después: `integrations: [Sentry.replayIntegration()]`
  // + `replaysSessionSampleRate`/`replaysOnErrorSampleRate`.
  integrations: [],

  sendDefaultPii: true,

  beforeSend(event) {
    const code = event.tags?.code
    if (typeof code === 'string' && EXPECTED_BUSINESS_CODES.has(code)) {
      return null
    }
    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
