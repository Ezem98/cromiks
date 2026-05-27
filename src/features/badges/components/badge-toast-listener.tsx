'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { BadgeWithStatus } from '../queries'

/**
 * Detecta badges nuevas en el set actual vs. lo que el user ya vio
 * (persistido en localStorage) y dispara un toast por cada una. Después
 * persiste el set actual para no volver a notificar.
 *
 * Diseño:
 *  - Solo notifica badges con `unlockedAt`. Las locked se ignoran.
 *  - Una badge es "nueva" si su id no está en `cromiks_seen_badges`.
 *  - Si el localStorage está vacío (primer load), igual marcamos todas las
 *    actuales como vistas SIN disparar toasts. Esto evita spam para users
 *    que ya tenían badges desbloqueadas antes de este feature.
 *  - `useRef` para que el efecto solo corra una vez por mount, no por
 *    cada re-render con el mismo set.
 */

const STORAGE_KEY = 'cromiks_seen_badges'

type BadgeToastListenerProps = {
  badges: BadgeWithStatus[]
}

export function BadgeToastListener({ badges }: BadgeToastListenerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    if (typeof window === 'undefined') return
    fired.current = true

    const unlocked = badges.filter((b) => b.unlockedAt).map((b) => b.id)
    if (unlocked.length === 0) return

    let seen: string[] = []
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      seen = raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      seen = []
    }

    const isFirstTime = seen.length === 0
    const newOnes = unlocked.filter((id) => !seen.includes(id))

    if (!isFirstTime && newOnes.length > 0) {
      // Disparar toast por cada badge nueva, con pequeño stagger.
      newOnes.forEach((id, idx) => {
        const badge = badges.find((b) => b.id === id)
        if (!badge) return
        window.setTimeout(() => {
          toast.success('¡Logro desbloqueado!', {
            description: badge.name,
            duration: 4500,
          })
        }, idx * 350)
      })
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked))
    } catch {
      // Storage lleno o blocked — no es bloqueante.
    }
  }, [badges])

  return null
}
