'use client'

import { Volume2Icon, VolumeXIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMuted, setMuted } from '@/lib/sound'

/**
 * Toggle de mute de los SFX del pack-opening. Persiste en
 * `localStorage['cromiks:muted']`, que sound.ts lee en cada play.
 *
 * Arranca en `false` (server siempre con sonido) y lee el estado real en mount
 * para evitar hydration mismatch.
 */
export function MuteToggle() {
  const [muted, setMutedState] = useState(false)

  useEffect(() => {
    setMutedState(getMuted())
  }, [])

  const toggle = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed top-6 left-6 z-50 p-2 rounded-full bg-(--color-surface-elevated)/80 backdrop-blur-md border border-white/10 text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-surface-raised) transition-colors"
      aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
      aria-pressed={muted}
    >
      {muted ? <VolumeXIcon className="size-5" /> : <Volume2Icon className="size-5" />}
    </button>
  )
}
