// Sentry edge-runtime init (middleware, edge route handlers).
// Se carga desde `src/instrumentation.ts` cuando NEXT_RUNTIME === 'edge'.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://cf8810e1066dc099e235b2aeaed21f2d@o4511446656286720.ingest.us.sentry.io/4511459597352960',

  enabled: process.env.SENTRY_DISABLED !== 'true',
  environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? 'development',
  release: process.env.RAILWAY_GIT_COMMIT_SHA,

  tracesSampleRate: 0.1,
  enableLogs: false,
  sendDefaultPii: true,
})
