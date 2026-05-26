'use client'

import { AnimatePresence, motion } from 'motion/react'
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
    setTimeout(() => onComplete(), 1100)
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
            <CompleteFlash />
            <CompleteParticles />
            <CompleteAura />
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
 */
function CompleteFlash() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.1 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.1, 1, 1.2, 1.4],
      }}
      transition={{
        duration: 1.1,
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
 */
function CompleteAura() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.6, 0.4, 0] }}
      transition={{ duration: 1.1, times: [0, 0.3, 0.7, 1] }}
      className="fixed inset-0 z-20 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(212,169,60,0.4) 0%, rgba(107,185,255,0.1) 40%, transparent 70%)',
      }}
    />
  )
}

/**
 * 24 partículas doradas que explotan radialmente desde el centro.
 * Ángulos distribuidos en 360° con jitter para no quedar simétrico.
 */
function CompleteParticles() {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
      {Array.from({ length: 24 }).map((_, i) => {
        const baseAngle = (i / 24) * Math.PI * 2
        const angle = baseAngle + (Math.random() - 0.5) * 0.6
        const distance = 150 + Math.random() * 250
        const px = Math.cos(angle) * distance
        const py = Math.sin(angle) * distance
        const size = 4 + Math.random() * 6
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
              duration: 1.1,
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
