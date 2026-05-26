'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Phase } from './types'

/**
 * State machine de la apertura de sobre.
 *
 * Flow:
 *  1. anticipation (auto, 2.5s): sobre flotando + intro
 *  2. tear (manual gesture): drag horizontal para rasgar el sobre
 *  3. stack (manual gestures): swipe lateral en cada card del stack
 *  4. summary (manual, botón): grid 2x2 de resumen
 *  5. outro (final): CTA volver al inicio
 *
 * El user puede skippear desde anticipation/tear/stack directo al summary.
 */

type PackOpeningState = {
  phase: Phase
  /** Cuántas cards ya fueron sacadas del stack (0..N). N = todas reveladas. */
  cardsRevealed: number
  /** True si el user clickeó Skip */
  isSkipped: boolean
}

type Actions = {
  /** Avanza a la siguiente fase (uso interno del flow) */
  next: () => void
  /** Salta directo al summary */
  skip: () => void
  /** Avanza de anticipation a tear (al terminar el delay) */
  startTear: () => void
  /** Marca que el tear se completó, va a stack */
  completeTear: () => void
  /** Marca que una card fue sacada del stack */
  revealNextCard: (totalCards: number) => void
  /** Inicia desde anticipation (para "abrir otro" en futuro) */
  restart: () => void
}

export function usePackOpening(autoStart = true): PackOpeningState & Actions {
  const [phase, setPhase] = useState<Phase>('anticipation')
  const [cardsRevealed, setCardsRevealed] = useState(0)
  const [isSkipped, setIsSkipped] = useState(false)

  // Avance automático de anticipation → tear
  useEffect(() => {
    if (!autoStart || phase !== 'anticipation') return

    const timer = setTimeout(() => {
      setPhase('tear')
    }, 2500)

    return () => clearTimeout(timer)
  }, [phase, autoStart])

  const next = useCallback(() => {
    setPhase((current) => {
      const sequence: Phase[] = ['anticipation', 'tear', 'stack', 'summary', 'outro']
      const idx = sequence.indexOf(current)
      if (idx === -1 || idx === sequence.length - 1) return current
      return sequence[idx + 1]
    })
  }, [])

  const skip = useCallback(() => {
    setIsSkipped(true)
    setPhase('summary')
  }, [])

  const startTear = useCallback(() => {
    setPhase('tear')
  }, [])

  const completeTear = useCallback(() => {
    setPhase('stack')
  }, [])

  const revealNextCard = useCallback((totalCards: number) => {
    setCardsRevealed((current) => {
      const next = current + 1
      // Si revelamos todas → ir al summary tras un pequeño delay
      if (next >= totalCards) {
        setTimeout(() => setPhase('summary'), 600)
      }
      return next
    })
  }, [])

  const restart = useCallback(() => {
    setPhase('anticipation')
    setCardsRevealed(0)
    setIsSkipped(false)
  }, [])

  return {
    phase,
    cardsRevealed,
    isSkipped,
    next,
    skip,
    startTear,
    completeTear,
    revealNextCard,
    restart,
  }
}
