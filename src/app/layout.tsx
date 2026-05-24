import type { Metadata, Viewport } from 'next'
import { fontVariables } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Cromiks — El álbum eterno',
    template: '%s · Cromiks',
  },
  description:
    'El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el momento original. Argentina campeón mundial 2022.',
  keywords: [
    'álbum digital',
    'figuritas',
    'cromos',
    'fútbol',
    'Argentina',
    'Mundial 2022',
    'Qatar',
    'Messi',
    'coleccionable',
  ],
  authors: [{ name: 'Cromiks' }],
  creator: 'Cromiks',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Cromiks',
    title: 'Cromiks — El álbum eterno',
    description:
      'El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el momento original.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cromiks — El álbum eterno',
    description:
      'El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el momento original.',
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0E14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={fontVariables}>
      <body>{children}</body>
    </html>
  )
}
