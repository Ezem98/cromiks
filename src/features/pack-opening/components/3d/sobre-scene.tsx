'use client'

import { Canvas } from '@react-three/fiber'
import { motion } from 'motion/react'
import { useState } from 'react'
import * as THREE from 'three'
import { SobreMesh } from './sobre-mesh'

/**
 * Escena 3D del sobre.
 *
 * Configura el canvas R3F, las luces, la cámara y el tracking del mouse.
 *
 * El drag para rasgar el sobre se hace DIRECTO sobre el mesh del techo
 * usando el raycaster de R3F (no hay HUD HTML overlay).
 *
 * Renderer config:
 *  - antialias + alpha (transparent canvas)
 *  - ACESFilmicToneMapping: contraste cinematográfico (perfecto para apertura)
 *  - SRGBColorSpace: colores correctos en el output
 *  - dpr cap a [1, 2]: balance entre nitidez (retina) y performance (mobile)
 *
 * Props:
 *  - idle: si está en modo idle (sobre flotando sin tear). Default true.
 *  - tearProgress: 0..1, cuán abierto está el sobre. Default 0.
 *  - draggable: si el techo es draggable (true en fase tear).
 *  - onTearProgressChange: callback cuando el drag cambia el progreso.
 *  - onTearComplete: callback cuando supera el threshold.
 */

type SobreSceneProps = {
  idle?: boolean
  tearProgress?: number
  draggable?: boolean
  onTearProgressChange?: (progress: number) => void
  onTearComplete?: () => void
}

export function SobreScene({
  idle = true,
  tearProgress = 0,
  draggable = false,
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
      // touchAction: 'none' evita que el browser interprete el drag como scroll
      // de la página en mobile. Crítico para que el raycaster del techo funcione bien.
      style={{ touchAction: 'none' }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        // Cap dpr para evitar pesadez en retinas con dpr=3
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          // Tone mapping cinematográfico — más contraste, look "premium"
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          // Output color space correcto (post r152)
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ background: 'transparent' }}
      >
        {/* === Lights === */}
        <ambientLight intensity={0.4} color="#1a2540" />
        <directionalLight position={[-3, 5, 4]} intensity={1.2} color="#fff5e0" castShadow />
        <directionalLight position={[2, -2, -3]} intensity={0.6} color="#D4A93C" />

        {/* === Mesh del sobre — incluye el techo draggable === */}
        <SobreMesh
          mousePosition={mousePosition}
          tearProgress={tearProgress}
          idleFloat={idle && tearProgress < 0.05}
          draggable={draggable}
          onTearProgressChange={onTearProgressChange}
          onTearComplete={onTearComplete}
        />
      </Canvas>
    </motion.div>
  )
}
