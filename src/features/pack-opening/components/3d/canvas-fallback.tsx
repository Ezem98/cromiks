'use client'

import { Component, type ReactNode } from 'react'

/**
 * Fallback compartido para escenas 3D: skeleton mientras carga (Suspense) y
 * error boundary cuando WebGL pierde el contexto o el render del Canvas tira.
 *
 * Por qué un boundary custom y no react-error-boundary: este es el único uso y
 * agregar la dep no aporta sobre el componente nativo de React.
 *
 * Por qué un skeleton en vez de fallback={null}: en 3G/4G el GLTF y el HDRI
 * tardan segundos y el usuario veía la pantalla con sólo el gradiente, "trabada"
 * (B-15).
 */

type State = { hasError: boolean }

type Props = {
  children: ReactNode
  /** Render del fallback de error. Default: mensaje genérico. */
  errorFallback?: ReactNode
}

export class Canvas3DErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[Canvas3DErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.errorFallback ?? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 py-12">
            <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-2">
              No pudimos renderizar la escena
            </p>
            <p className="text-(--color-text-secondary) text-sm max-w-sm">
              Tu navegador o GPU no pudo dibujar el sobre 3D. Probá recargar la página.
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}

/**
 * Skeleton con shimmer para mientras carga el Canvas / GLTF.
 * Matchea aspect ratio neutro para que no haga layout shift.
 */
export function Canvas3DSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="rounded-2xl bg-(--color-surface-raised)/60 animate-pulse"
        style={{
          width: 'min(70%, 280px)',
          aspectRatio: '3 / 4',
          boxShadow: '0 0 80px rgba(212, 169, 60, 0.08)',
        }}
      />
    </div>
  )
}
