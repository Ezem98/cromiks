'use client'

import { motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Sobre } from '@/components/domain/sobre'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'

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
 * Fallback (reduced-motion): sobre CSS con botón "Abrir sobre".
 */

type PhaseTearProps = {
  onComplete: () => void
}

export function PhaseTear({ onComplete }: PhaseTearProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <PhaseTearFallback onComplete={onComplete} />
  }

  return <PhaseTear3D onComplete={onComplete} />
}

function PhaseTear3D({ onComplete }: PhaseTearProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [tearProgress, setTearProgress] = useState(0)

  const handleProgressChange = (progress: number) => {
    setTearProgress(progress)
  }

  const handleTearComplete = () => {
    setIsCompleted(true)
    setTearProgress(1)
    setTimeout(() => onComplete(), 800)
  }

  return (
    <motion.div
      key="tear-3d"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative min-h-screen select-none"
    >
      {/* Canvas 3D fullscreen */}
      <div className="fixed inset-0">
        <SobreScene
          idle={!isCompleted}
          tearProgress={tearProgress}
          draggable={!isCompleted}
          onTearProgressChange={handleProgressChange}
          onTearComplete={handleTearComplete}
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

      {/* Particles cuando completa */}
      {isCompleted &&
        Array.from({ length: 16 }).map((_, i) => {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2
          const distance = 80 + Math.random() * 120
          const px = Math.cos(angle) * distance
          const py = Math.sin(angle) * distance

          return (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: posición es identidad
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: px, y: py, opacity: 0, scale: 1.5 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute size-1.5 rounded-full pointer-events-none"
              style={{
                top: '40%',
                left: '50%',
                marginLeft: -3,
                background: 'var(--color-gold)',
                boxShadow: '0 0 6px rgba(212,169,60,0.8)',
                zIndex: 20,
              }}
            />
          )
        })}
    </motion.div>
  )
}

function PhaseTearFallback({ onComplete }: PhaseTearProps) {
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
        onClick={onComplete}
        className="px-6 py-3 rounded-md bg-(--color-argentina-glow) text-(--color-surface-deep) font-medium"
      >
        Abrir sobre
      </button>
    </motion.div>
  )
}
