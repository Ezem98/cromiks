'use client'

import { useEffect, useState } from 'react'

/**
 * Hook que detecta si el usuario tiene `prefers-reduced-motion: reduce`.
 *
 * Lo usamos para hacer fallback automático a la versión 2D estática
 * en lugar de la versión 3D animada cuando el OS pide menos movimiento
 * (usuarios con motion sickness, accesibilidad, etc).
 *
 * Returns: `true` si el user pidió reduced motion, `false` por default.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mediaQuery.matches)

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  return reduced
}
