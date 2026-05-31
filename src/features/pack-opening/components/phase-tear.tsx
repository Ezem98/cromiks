'use client'

import { AnimatePresence, motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Sobre } from '@/components/domain/sobre'
import { vibrate } from '@/lib/haptics'
import { useRenderTier } from '@/lib/hooks/use-render-tier'
import { type Tier, tierRank } from '../types'

// Lazy load del 3D scene
const SobreScene = dynamic(() => import('./3d/sobre-scene').then((mod) => mod.SobreScene), {
  ssr: false,
})

/**
 * Fase 2 — Tear (rasgar el sobre con drag horizontal sobre canvas 3D).
 *
 * Layout:
 *  - Canvas 3D fullscreen con el sobre al centro
 *  - La tira de tear vive DENTRO del canvas (anclada al sobre vía drei <Html>)
 *  - Hint text arriba como overlay HTML
 *
 * Fallback (tier 'lite'): sobre CSS con botón "Abrir sobre".
 */

type PhaseTearProps = {
  onComplete: () => void
  /** Rareza más alta del sobre — escala el estallido del "complete". */
  maxTier?: Tier
}

/**
 * Patrones de vibración del tear-complete por rank de rareza (0..4).
 * Mejor rareza → patrón más largo e intenso.
 */
const TEAR_HAPTICS: Record<number, number | number[]> = {
  0: 30,
  1: 45,
  2: [0, 40, 40, 40],
  3: [0, 50, 30, 50, 30, 60],
  4: [0, 70, 40, 70, 40, 90],
}

export function PhaseTear({ onComplete, maxTier = 'common' }: PhaseTearProps) {
  const { tier, degradeToLite } = useRenderTier()

  if (tier === 'lite') {
    return <PhaseTearFallback onComplete={onComplete} maxTier={maxTier} />
  }

  return <PhaseTear3D onComplete={onComplete} onDegrade={degradeToLite} maxTier={maxTier} />
}

function PhaseTear3D({
  onComplete,
  onDegrade,
  maxTier = 'common',
}: PhaseTearProps & { onDegrade: () => void }) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [tearProgress, setTearProgress] = useState(0)

  const rank = tierRank(maxTier)
  // El estallido dura más cuanto mejor la rareza (1.1s común … 1.7s legendary).
  const completeMs = 1100 + rank * 150
  const completeS = completeMs / 1000

  const handleProgressChange = (progress: number) => {
    setTearProgress(progress)
  }

  const handleTearComplete = () => {
    setIsCompleted(true)
    setTearProgress(1)
    vibrate(TEAR_HAPTICS[rank] ?? 30)
    // TODO(3.10): disparar sonido del "complete" acá cuando exista el asset.
    setTimeout(() => onComplete(), completeMs)
  }

  return (
    <motion.div
      key="tear-3d"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative min-h-screen select-none overflow-hidden"
    >
      {/* Canvas 3D fullscreen */}
      <div className="fixed inset-0">
        <SobreScene
          idle={!isCompleted}
          tearProgress={tearProgress}
          draggable={!isCompleted}
          isCompleting={isCompleted}
          onTearProgressChange={handleProgressChange}
          onTearComplete={handleTearComplete}
          onContextLost={onDegrade}
        />
      </div>

      {/* Hint — overlay HTML arriba */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: isCompleted || tearProgress > 0.2 ? 0 : 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute top-24 left-0 right-0 z-20 text-center space-y-1 pointer-events-none px-6"
      >
        <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-(--color-gold)">
          Tocá el techo y tirá
        </p>
        <p className="text-(--color-text-muted) text-xs">→ Arrastrá hacia la derecha para abrir</p>
      </motion.div>

      {/* === Secuencia "complete" === */}
      <AnimatePresence>
        {isCompleted && (
          <>
            <CompleteFlash rank={rank} durationS={completeS} />
            <CompleteParticles rank={rank} durationS={completeS} />
            <CompleteAura rank={rank} durationS={completeS} />
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Flash radial dorado fullscreen.
 * Empieza pequeño y se expande hasta cubrir toda la pantalla.
 * Gradient: blanco → dorado → transparente. Sensación de luz cegadora.
 * `rank` escala el pico de expansión (legendary llena más la pantalla).
 */
function CompleteFlash({ rank, durationS }: { rank: number; durationS: number }) {
  const peak = 1.4 * (1 + rank * 0.08) // common 1.4 … legendary ~1.85
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.1 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.1, 1, peak * 0.85, peak],
      }}
      transition={{
        duration: durationS,
        times: [0, 0.35, 0.8, 1],
        ease: 'easeOut',
      }}
      className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center"
    >
      <div
        style={{
          width: '200vmax',
          height: '200vmax',
          background:
            'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,232,150,0.95) 15%, rgba(212,169,60,0.7) 35%, rgba(212,169,60,0.2) 60%, transparent 80%)',
        }}
      />
    </motion.div>
  )
}

/**
 * Aura dorada sutil que perdura más tiempo que el flash. Da continuidad
 * visual mientras el sobre desaparece y antes de que aparezcan las cards.
 * `rank` sube el pico de opacidad (legendary se siente más cargado).
 */
function CompleteAura({ rank, durationS }: { rank: number; durationS: number }) {
  const peakOpacity = Math.min(0.6 + rank * 0.08, 0.95)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, peakOpacity, peakOpacity * 0.66, 0] }}
      transition={{ duration: durationS, times: [0, 0.3, 0.7, 1] }}
      className="fixed inset-0 z-20 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(212,169,60,0.4) 0%, rgba(107,185,255,0.1) 40%, transparent 70%)',
      }}
    />
  )
}

/**
 * Partículas doradas que explotan radialmente desde el centro.
 * Ángulos distribuidos en 360° con jitter para no quedar simétrico.
 * `rank` escala cantidad, distancia y tamaño (legendary = estallido más denso).
 */
function CompleteParticles({ rank, durationS }: { rank: number; durationS: number }) {
  const count = 20 + rank * 7 // común 20 … legendary 48
  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
      {Array.from({ length: count }).map((_, i) => {
        const baseAngle = (i / count) * Math.PI * 2
        const angle = baseAngle + (Math.random() - 0.5) * 0.6
        const distance = 150 + rank * 30 + Math.random() * 250
        const px = Math.cos(angle) * distance
        const py = Math.sin(angle) * distance
        const size = 4 + rank * 0.8 + Math.random() * 6
        const delay = Math.random() * 0.1

        return (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: posición es identidad
            key={i}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: px,
              y: py,
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0.5],
            }}
            transition={{
              duration: durationS,
              delay,
              times: [0, 0.15, 0.7, 1],
              ease: 'easeOut',
            }}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: 'rgba(255, 232, 150, 1)',
              boxShadow: '0 0 8px rgba(212,169,60,0.9), 0 0 16px rgba(212,169,60,0.5)',
            }}
          />
        )
      })}
    </div>
  )
}

function PhaseTearFallback({ onComplete, maxTier = 'common' }: PhaseTearProps) {
  const handleOpen = () => {
    vibrate(TEAR_HAPTICS[tierRank(maxTier)] ?? 30)
    onComplete()
  }

  return (
    <motion.div
      key="tear-fallback"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-6"
    >
      <Sobre type="daily" state="closed" size="lg" showTypeLabel={false} />
      <button
        type="button"
        onClick={handleOpen}
        className="px-6 py-3 rounded-md bg-(--color-argentina-glow) text-(--color-surface-deep) font-medium"
      >
        Abrir sobre
      </button>
    </motion.div>
  )
}
