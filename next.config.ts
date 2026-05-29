import { withSentryConfig } from '@sentry/nextjs'
import { createJiti } from 'jiti'
import type { NextConfig } from 'next'

// Valida src/env.ts en build-time, antes de compilar. Si falta una var
// requerida, el build aborta acá con un error legible (en vez de romper en
// runtime). Next ya cargó las .env antes de evaluar este config, así que
// process.env está poblado. jiti permite importar el TS con alias sin pasar
// por el bundler. Se saltea con SKIP_ENV_VALIDATION=1 (ver src/env.ts).
const jiti = createJiti(import.meta.url)
jiti('./src/env')

const config: NextConfig = {
  reactStrictMode: true,
  // typedRoutes desactivado por ahora.
  // Razones:
  //   - Tenemos rutas planificadas que aún no existen (/album, /missions, /settings, /about, /u/[username])
  //   - Cuando todas estén implementadas, lo podemos re-activar para validación estricta de URLs.
  typedRoutes: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Cloudflare R2 (configurar cuando esté el bucket)
      // { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  // Exponer envs de Railway al cliente. Railway no las auto-injecta como
  // NEXT_PUBLIC_ (Vercel sí). Esto inlinea los valores en el bundle client al
  // momento del `next build`, así Sentry client-side puede taggear environment
  // + release igual que el server.
  env: {
    NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME ?? '',
    NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA: process.env.RAILWAY_GIT_COMMIT_SHA ?? '',
  },
}

export default withSentryConfig(config, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'ezequiel-machado',

  project: 'cromiks-web',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // automaticVercelMonitors está OFF: feature Vercel-specific, no aplica
    // a Railway. Si más adelante usamos crons, los instrumentamos a mano.
    automaticVercelMonitors: false,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
})
