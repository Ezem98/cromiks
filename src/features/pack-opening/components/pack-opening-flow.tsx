'use client'

import { XIcon } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useEffect } from 'react'
import { revalidateHomeAfterOpen } from '../actions'
import type { OpenPackResult } from '../types'
import { usePackOpening } from '../use-pack-opening'
import { PhaseAnticipation } from './phase-anticipation'
import { PhaseStack } from './phase-stack'
import { PhaseOutro, PhaseSummary } from './phase-summary'
import { PhaseTear } from './phase-tear'

/**
 * Orquestador del flow de apertura.
 *
 * Recibe el resultado del open ya hecho (cards reveladas + metadata).
 * Maneja la state machine y renderiza la fase actual con AnimatePresence.
 *
 * El botón Skip está fijo arriba a la derecha, visible durante las fases
 * interactivas (no en summary/outro).
 */

type PackOpeningFlowProps = {
  result: OpenPackResult
  currentStreak: number
}

export function PackOpeningFlow({ result, currentStreak }: PackOpeningFlowProps) {
  const { phase, cardsRevealed, skip, completeTear, revealNextCard, next } = usePackOpening(true)

  // Cuando llegamos al outro, revalidamos el home en background
  useEffect(() => {
    if (phase === 'outro') {
      revalidateHomeAfterOpen()
    }
  }, [phase])

  const handleCardRevealed = () => {
    revealNextCard(result.cards.length)
  }

  return (
    <div className="relative">
      {/* Skip button — fijo arriba derecha durante fases interactivas */}
      {phase !== 'outro' && phase !== 'summary' && (
        <button
          type="button"
          onClick={skip}
          className="fixed top-6 right-6 z-50 p-2 rounded-full bg-(--color-surface-elevated)/80 backdrop-blur-md border border-white/10 text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-surface-raised) transition-colors"
          aria-label="Saltar animación"
        >
          <XIcon className="size-5" />
        </button>
      )}

      <AnimatePresence mode="wait">
        {phase === 'anticipation' && (
          <PhaseAnticipation currentStreak={currentStreak} packType={result.packType} />
        )}

        {phase === 'tear' && <PhaseTear onComplete={completeTear} />}

        {phase === 'stack' && (
          <PhaseStack
            cards={result.cards}
            cardsRevealed={cardsRevealed}
            onCardReveal={handleCardRevealed}
          />
        )}

        {phase === 'summary' && <PhaseSummary result={result} onContinue={next} />}

        {phase === 'outro' && <PhaseOutro currentStreak={currentStreak} />}
      </AnimatePresence>
    </div>
  )
}
