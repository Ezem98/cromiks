'use client'

import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { motion } from 'motion/react'
import { Suspense, useState } from 'react'
import * as THREE from 'three'
import { Canvas3DErrorBoundary, Canvas3DSkeleton } from './canvas-fallback'
import { PackModel3D } from './pack-model'

/**
 * Escena 3D del sobre.
 *
 * Usa el modelo GLTF real (Trading Card Pack by goonmize1, CC-BY-4.0).
 *
 * Configura:
 *  - Environment HDRI "warehouse": CRÍTICO. Material metálico 0.84 +
 *    roughness 0.15. Sin HDRI no tiene nada para reflejar → se vería negro.
 *  - Lights: ambient + key + rim dorada + fill azul. La rim light desde
 *    atrás perfila los bordes del sobre, dando el "foil shine" típico TCG.
 *  - Background: radial gradient sutil que da atmósfera al canvas (sino
 *    el sobre flota en negro plano sin contexto).
 *
 * Como el modelo es un solo mesh (no hay techo separable), el feedback
 * visual del tear se logra con scale + glow + emissive + shake en lugar
 * de "abrir físicamente" el techo.
 */

type SobreSceneProps = {
  idle?: boolean
  tearProgress?: number
  draggable?: boolean
  /** Dispara la secuencia explosiva final del modelo. */
  isCompleting?: boolean
  onTearProgressChange?: (progress: number) => void
  onTearComplete?: () => void
}

export function SobreScene({
  idle = true,
  tearProgress = 0,
  draggable = false,
  isCompleting = false,
  onTearProgressChange,
  onTearComplete,
}: SobreSceneProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

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
      transition={{ duration: 0.6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-full flex items-center justify-center"
      style={{
        touchAction: 'none',
        // Radial gradient para dar atmósfera (el canvas es transparent).
        // Centro azul oscuro → bordes casi negros (vignette natural).
        background: 'radial-gradient(ellipse at center, #1a2540 0%, #0a0e14 60%, #050709 100%)',
      }}
    >
      <Canvas3DErrorBoundary>
        <Suspense fallback={<Canvas3DSkeleton />}>
          <Canvas
            camera={{ position: [0, 0, 8], fov: 45 }}
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
            {/* Environment HDRI — reflejos warehouse cálidos */}
            <Suspense fallback={null}>
              <Environment preset="warehouse" background={false} />
            </Suspense>

            {/* Lights: ambient + key + rim dorada + fill azul */}
            <ambientLight intensity={0.3} color="#ffffff" />
            {/* Key light blanca cálida desde arriba-izquierda */}
            <directionalLight position={[-3, 5, 4]} intensity={0.6} color="#fff5e0" castShadow />
            {/* Rim light dorada desde atrás — perfila bordes (foil shine TCG) */}
            <directionalLight position={[3, 2, -5]} intensity={1.2} color="#D4A93C" />
            {/* Fill azul desde abajo para que la base no quede muerta */}
            <pointLight
              position={[0, -3, 2]}
              intensity={0.3}
              color="#6BB9FF"
              distance={8}
              decay={2}
            />

            {/* Modelo GLTF del sobre */}
            <Suspense fallback={null}>
              <PackModel3D
                mousePosition={mousePosition}
                tearProgress={tearProgress}
                idleFloat={idle && tearProgress < 0.05}
                draggable={draggable}
                isCompleting={isCompleting}
                onTearProgressChange={onTearProgressChange}
                onTearComplete={onTearComplete}
              />
            </Suspense>
          </Canvas>
        </Suspense>
      </Canvas3DErrorBoundary>
    </motion.div>
  )
}
