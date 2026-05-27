// Sentry server-side init (Node runtime).
// Se carga desde `src/instrumentation.ts` cuando NEXT_RUNTIME === 'nodejs'.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

// Business errors esperados de las server actions. Los reportamos como
// `result.code = 'X'` al cliente, pero NO los queremos en Sentry: inflan el
// dashboard y consumen cuota del plan free.
const EXPECTED_BUSINESS_CODES = new Set([
  'invalid_input',
  'unauthenticated',
  'rate_limited',
  // Pack opening (B-23)
  'auth_required',
  'pack_not_found',
  'pack_not_pending',
  'pack_expired',
  // Album / dismantle
  'not_owned',
  'no_extra_copies',
  'not_dismantleable',
  'insufficient_copies',
  // Missions
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

  // Kill switch: setear SENTRY_DISABLED=true en Vercel apaga el init al
  // próximo deploy (sin desinstalar el paquete).
  enabled: process.env.SENTRY_DISABLED !== 'true',

  environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? 'development',
  release: process.env.RAILWAY_GIT_COMMIT_SHA,

  // Conservador: 10% de traces. Ajustar si vemos poco volumen real.
  tracesSampleRate: 0.1,

  // Logs estructurados de Sentry — off para no comerse cuota del free tier.
  enableLogs: false,

  // PII (IP, user-agent) — útil para debug. Sentry tiene scrubbing automático
  // de patrones sensibles (tokens, emails).
  sendDefaultPii: true,

  beforeSend(event) {
    // El helper defineAction agrega `tags.code` cuando una action falla con
    // un code conocido. Si el code está en la lista de business errors,
    // dropeamos el evento (return null).
    const code = event.tags?.code
    if (typeof code === 'string' && EXPECTED_BUSINESS_CODES.has(code)) {
      return null
    }
    return event
  },
})
