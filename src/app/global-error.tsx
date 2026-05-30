'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * Global error boundary — captura errores fatales del root layout.
 *
 * No hay garantía de que el CSS de la app cargue acá (el error puede romper
 * el render del layout que inyecta los estilos), así que usamos estilos inline
 * con los hex de marca directos. Copy on-brand per DESIGN.md §3.2.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es-AR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#0A0E14',
          color: '#F0F4F8',
          fontFamily:
            'Geist, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '28rem' }}>
          <p
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#D4A93C',
              margin: '0 0 16px',
            }}
          >
            Error
          </p>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              lineHeight: 1.2,
              margin: '0 0 12px',
            }}
          >
            Se nos rompió el caño
          </h1>
          <p
            style={{
              fontSize: '15px',
              lineHeight: 1.6,
              color: '#B0BAC8',
              margin: '0 0 32px',
            }}
          >
            Estamos arreglándolo. Volvé en un rato y te mandamos un sobre extra de regalo.
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                width: '100%',
                maxWidth: '16rem',
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: '#D4A93C',
                color: '#0A0E14',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              Reintentar
            </button>
            <a
              href="/"
              style={{
                fontSize: '13px',
                color: '#B0BAC8',
                textDecoration: 'none',
              }}
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
