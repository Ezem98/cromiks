'use client'

import { motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { Sobre } from '@/components/domain/sobre'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'

// Lazy load del 3D scene — solo se carga en cliente, no en SSR.
// Esto evita errores tipo "window is not defined" al renderizar server-side.
const SobreScene = dynamic(() => import('./3d/sobre-scene').then((mod) => mod.SobreScene), {
  ssr: false,
})

/**
 * Fase 1 — Anticipación.
 *
 * Muestra el sobre 3D flotando, con tilt al mouse.
 *
 * Si el user tiene `prefers-reduced-motion: reduce`, hace fallback a la
 * versión 2D del componente <Sobre/> sin animaciones agresivas.
 *
 * Auto-avanza a la fase 'tear' después de 2.5s (manejado por el orquestador).
 */

type PhaseAnticipationProps = {
  currentStreak: number
  packType: string
}

const typeMessages: Record<string, string> = {
  daily: 'Tu sobre diario',
  mission: 'Recompensa de misión',
  match: 'Sobre del partido',
  welcome: 'Sobre de bienvenida',
  premium: 'Sobre premium',
  referral: 'Sobre de referido',
}

export function PhaseAnticipation({ currentStreak, packType }: PhaseAnticipationProps) {
  const reducedMotion = useReducedMotion()
  const message = typeMessages[packType] ?? 'Sobre'

  return (
    <motion.div
      key="anticipation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col items-center justify-center min-h-screen px-6"
    >
      {/* Header text (overlay sobre el canvas 3D) */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
        className="absolute top-24 left-0 right-0 z-10 text-center space-y-2 pointer-events-none"
      >
        <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-(--color-gold)">
          {currentStreak > 0 ? `Día ${currentStreak} de tu racha` : 'Argentina campeón mundial'}
        </p>
        <h1 className="text-display text-4xl sm:text-5xl leading-[0.95]">{message}</h1>
      </motion.div>

      {/* Sobre — 3D o fallback CSS */}
      {reducedMotion ? (
        <Sobre type="daily" state="closed" size="lg" showTypeLabel={false} />
      ) : (
        <div className="w-full h-screen absolute inset-0">
          <SobreScene idle />
        </div>
      )}

      {/* Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-24 left-0 right-0 text-center text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) z-10 pointer-events-none"
      >
        Abriendo...
      </motion.p>
    </motion.div>
  )
}
