'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Error boundary del route group (app).
 *
 * Captura errores no manejados en cualquier server component / fetch dentro de
 * `/home`, `/album`, etc. y muestra una pantalla con CTA de reintento.
 *
 * `reset()` re-renderiza el subtree del error, así que volvemos a correr el
 * server component que falló.
 *
 * Reporta a Sentry con el digest como tag para correlacionar con el server log.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { source: 'app-error-boundary', digest: error.digest ?? 'none' },
    })
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="max-w-md space-y-4">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          Algo salió mal
        </p>
        <h1 className="text-display text-3xl leading-[0.95] text-(--color-text-primary)">
          No pudimos cargar esta página
        </h1>
        <p className="text-(--color-text-secondary) text-sm">
          Puede ser un problema temporal de conexión. Probá de nuevo en un momento.
        </p>
        <div className="pt-4 flex gap-2 justify-center">
          <Button variant="primary" onClick={() => reset()}>
            Reintentar
          </Button>
        </div>
        {error.digest && (
          <p className="text-mono text-[10px] text-(--color-text-muted) pt-4">
            Código: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
