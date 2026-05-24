import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Cloudflare R2 (configurar cuando esté el bucket)
      // { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
}

export default config
