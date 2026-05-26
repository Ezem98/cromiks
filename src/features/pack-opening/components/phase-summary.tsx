'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { Cromo } from '@/components/domain/cromo'
import { Button } from '@/components/ui/button'
import type { OpenPackResult } from '../types'

/**
 * Fase 5 — Summary.
 *
 * Grid 2x2 con los 4 cromos. Resumen abajo: cuántos nuevos vs repetidas + monedas.
 * CTAs: "Ver en el álbum" y "Compartir el mejor" (compartir queda para Fase E3).
 */

type PhaseSummaryProps = {
  result: OpenPackResult
  onContinue: () => void
}

export function PhaseSummary({ result, onContinue }: PhaseSummaryProps) {
  const newCount = result.cards.filter((c) => c.isNew).length
  const repeatedCount = result.cards.length - newCount

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-8 max-w-md mx-auto"
    >
      {/* Heading */}
      <div className="text-center space-y-2">
        <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-(--color-gold)">
          Resultado
        </p>
        <h2 className="text-display text-4xl leading-[0.95]">
          {newCount > 0
            ? `Sumaste ${newCount} ${newCount === 1 ? 'cromo nuevo' : 'cromos nuevos'}`
            : 'Buen sobre'}
        </h2>
        <p className="text-(--color-text-secondary) text-sm">
          {repeatedCount > 0 && `${repeatedCount} repetida${repeatedCount === 1 ? '' : 's'} · `}+
          {result.coinsEarned} monedas
        </p>
      </div>

      {/* Grid 2x2 de cromos */}
      <div className="grid grid-cols-2 gap-3">
        {result.cards.map((card, i) => (
          <motion.div
            key={card.cardId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
          >
            <Cromo
              tier={card.tier}
              name={card.name}
              playerRole={card.playerRole}
              number={card.number}
              seed={card.seed}
              imageUrl={card.imageUrl ?? undefined}
              size="sm"
              state={card.isNew ? 'new' : 'repeated'}
            />
          </motion.div>
        ))}
      </div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="flex flex-col gap-2 w-full"
      >
        <Button variant="primary" size="lg" onClick={onContinue}>
          Continuar
        </Button>
        <Button variant="ghost" size="md" asChild>
          <Link href="/album">Ver en el álbum</Link>
        </Button>
      </motion.div>
    </motion.div>
  )
}

/**
 * Fase 6 — Outro.
 *
 * Cierre con mensaje sobre la racha y CTA al home.
 */

type PhaseOutroProps = {
  currentStreak: number
}

export function PhaseOutro({ currentStreak }: PhaseOutroProps) {
  return (
    <motion.div
      key="outro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 max-w-md mx-auto text-center"
    >
      <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-(--color-gold)">
        Bien hecho
      </p>
      <h2 className="text-display text-4xl leading-[0.95]">Tu próximo sobre llega mañana</h2>

      {currentStreak > 0 && (
        <p className="text-(--color-text-secondary) text-base">
          Tu racha quedó en{' '}
          <span className="text-(--color-gold) font-medium">{currentStreak} días</span>. Volvé
          mañana para no cortarla.
        </p>
      )}

      <Button variant="primary" size="lg" asChild className="mt-4">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </motion.div>
  )
}
