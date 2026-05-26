import type { NextConfig } from 'next'

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
}

export default config
