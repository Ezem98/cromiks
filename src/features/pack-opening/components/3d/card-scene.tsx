'use client'

import { Canvas } from '@react-three/fiber'
import { motion } from 'motion/react'
import { Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'
import type { RevealedCard } from '../../types'
import { Canvas3DErrorBoundary, Canvas3DSkeleton } from './canvas-fallback'
import { CARD_TILT_X_RAD, CARD_TILT_Y_RAD, CardMesh3D } from './card-mesh'

const RAD_TO_DEG = 180 / Math.PI

/**
 * Escena 3D para una card individual revelada.
 *
 * Estrategia híbrida 3D + HTML:
 *  - El Canvas R3F renderea la card 3D (box + border + avatar + flip)
 *  - HTML overlay positioned absolute MUESTRA el texto del cromo
 *    (nombre, número, posición). Razón: drei <Text> tiene incompat con
 *    three r0.184 (renderea quad blanco gigante en lugar del texto).
 *
 * Cuando cambia el prop `card`:
 *  - El Canvas NO se desmonta (mantiene WebGL context, evita "context lost")
 *  - El mesh interno cambia (CardMesh3D reacciona al nuevo card)
 *  - El flip 3D vuelve a correr (rotateY: π → 0)
 *  - El HTML overlay actualiza el texto
 */

type CardScene3DProps = {
  card: RevealedCard
  autoFlip?: boolean
}

export function CardScene3D({ card, autoFlip = true }: CardScene3DProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [rotateY, setRotateY] = useState(autoFlip ? Math.PI : 0)

  // Flip automático cuando cambia la card (incluyendo primer mount)
  // biome-ignore lint/correctness/useExhaustiveDependencies: card.cardId dispara el flip al cambiar de cromo
  useEffect(() => {
    if (!autoFlip) return
    setRotateY(Math.PI)
    const timer = setTimeout(() => setRotateY(0), 100)
    return () => clearTimeout(timer)
  }, [autoFlip, card.cardId])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    setMousePosition({ x, y })
  }

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full flex items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <Canvas3DErrorBoundary>
        <Suspense fallback={<Canvas3DSkeleton />}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 45 }}
            dpr={[1, 2]}
            gl={{
              antialias: true,
              alpha: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0,
              outputColorSpace: THREE.SRGBColorSpace,
            }}
            style={{ background: 'transparent' }}
            // Si WebGL pierde el contexto (GPU pressure, otro WebGL en otra app),
            // tiramos el error para que lo capture el ErrorBoundary y muestre
            // el fallback en lugar de canvas en blanco (B-14).
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault()
                throw new Error('webgl_context_lost')
              })
            }}
          >
            <ambientLight intensity={0.5} color="#ffffff" />
            <directionalLight position={[-3, 5, 4]} intensity={1.0} color="#fff5e0" />
            <directionalLight position={[2, -2, -3]} intensity={0.4} color="#D4A93C" />

            <CardMesh3D
              card={card}
              mousePosition={mousePosition}
              tiltStrength={1}
              rotateY={rotateY}
              size={1.2}
            />
          </Canvas>
        </Suspense>
      </Canvas3DErrorBoundary>

      {/* HTML overlay con el texto del cromo, positioned encima del canvas.
          Recibe mousePosition para inclinarse en sync con la card 3D — sino
          parecería "flotando" sobre el 3D que se mueve. */}
      <CardTextOverlay card={card} mousePosition={mousePosition} />
    </motion.div>
  )
}

/**
 * Overlay HTML con el texto del cromo (nombre, número, posición).
 *
 * Positioned absolute sobre el canvas, dentro del contenedor padre.
 * El layout matchea la posición visual de los elementos en la card 3D.
 *
 * Tilt sync: aplica un transform CSS perspective + rotateX + rotateY usando el
 * mismo mousePosition que la card 3D, pero con valores escalados a CSS
 * (CardMesh3D usa 0.2 y 0.3 radianes — acá los convertimos a degrees: ~11.5° y ~17°).
 * Así el HTML overlay se inclina junto con la card y no queda flotando.
 *
 * pointer-events: none para no bloquear el mouse del canvas (tilt).
 */
function CardTextOverlay({
  card,
  mousePosition,
}: {
  card: RevealedCard
  mousePosition: { x: number; y: number }
}) {
  // Matchear el tilt del 3D usando las mismas constantes que CardMesh3D,
  // convertidas a degrees. Así si alguien tunea el tilt del mesh el overlay
  // se actualiza solo (B-17).
  const tiltX = -mousePosition.y * CARD_TILT_X_RAD * RAD_TO_DEG
  const tiltY = mousePosition.x * CARD_TILT_Y_RAD * RAD_TO_DEG

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        padding: '8%',
        perspective: '1000px',
        // El transform se aplica al wrapper completo, igual que el group del 3D
        transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        transformStyle: 'preserve-3d',
        // Transition suave para que no se vea robotic con cada pixel del mouse
        transition: 'transform 0.1s ease-out',
      }}
    >
      {/* Número arriba a la derecha */}
      <div
        className="absolute text-display leading-none"
        style={{
          top: '14%',
          right: '14%',
          fontSize: 'clamp(28px, 7vw, 40px)',
          color: '#ffffff',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {card.number ?? ''}
      </div>

      {/* Nombre + posición/club abajo a la izquierda */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: '14%',
          paddingLeft: '12%',
          paddingRight: '12%',
        }}
      >
        <div
          className="text-display uppercase leading-tight"
          style={{
            fontSize: 'clamp(16px, 4vw, 22px)',
            color: '#ffffff',
            textShadow: '0 2px 6px rgba(0,0,0,0.8)',
            letterSpacing: '0.04em',
          }}
        >
          {card.name}
        </div>
        {card.playerRole && (
          <div
            className="text-mono uppercase mt-1"
            style={{
              fontSize: 'clamp(9px, 2.2vw, 11px)',
              color: 'rgba(255,255,255,0.7)',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              letterSpacing: '0.15em',
            }}
          >
            {card.playerRole}
          </div>
        )}
      </div>
    </div>
  )
}
