'use client'

import { useGLTF } from '@react-three/drei'
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import * as THREE from 'three'

/**
 * Pack Model 3D — carga el modelo GLTF real del sobre.
 *
 * Reemplaza el SobreMesh procedural por un modelo real con materiales PBR
 * (baseColor + normalMap, metalness 0.84, roughness 0.15).
 *
 * Crédito requerido (CC-BY-4.0):
 *  "Trading Card Pack" by goonmize1
 *  https://sketchfab.com/3d-models/trading-card-pack-26d1a87e47814d0ea3a710d169e3a671
 *
 * Mantiene el MISMO contrato de props que SobreMesh para ser drop-in.
 *
 * Como el modelo es un solo mesh, el feedback visual de `tearProgress` cambia:
 *  - 0..1: scale up sutil + glow + emissive + shake (intensifica con progreso)
 *  - Al completarse: flash + scale explosivo (manejado externamente)
 *
 * Responsive: scale se ajusta según viewport — más chico en mobile para
 * que no se corte por arriba/abajo en pantallas angostas.
 */

const MODEL_PATH = '/models/pack/scene.gltf'
const GOLD = '#D4A93C'

// Threshold de drag (pixels)
const COMPLETE_THRESHOLD_PX = 180

// Scale base por viewport.
// Desktop: ancho >= 1024px
// Tablet: 600..1023px
// Mobile: < 600px (el más restrictivo, el sobre era demasiado grande con 1.5)
const MODEL_SCALE_DESKTOP = 2.2
const MODEL_SCALE_TABLET = 1.7
const MODEL_SCALE_MOBILE = 1.15

// Rotación inicial — grupos anidados para evitar el efecto de orden Euler XYZ.
// Outer Z (π/2): rota en plano de pantalla → portrait
// Inner X (π/2): para el pack vertical frente a la cámara
const MODEL_ROTATION_OUTER_Z = Math.PI / 2
const MODEL_ROTATION_INNER_X = Math.PI / 2

type PackModel3DProps = {
  mousePosition: { x: number; y: number }
  tearProgress?: number
  idleFloat?: boolean
  draggable?: boolean
  /**
   * Si true, dispara la secuencia explosiva final:
   *  - Scale explota (× 3.5 instantáneo, luego lerp suave)
   *  - Spin rápido en Y (rotación libre, ignora el tilt al mouse)
   *  - Position.z hacia adelante (parece venir a la cámara)
   *  - Emissive al máximo (el sobre brilla dorado intenso)
   *
   * Mientras esto sucede, el flash blanco del overlay tapa todo,
   * así que no necesitamos animar transparency del material (área de bugs).
   */
  isCompleting?: boolean
  onTearProgressChange?: (progress: number) => void
  onTearComplete?: () => void
}

export function PackModel3D({
  mousePosition,
  tearProgress = 0,
  idleFloat = true,
  draggable = false,
  isCompleting = false,
  onTearProgressChange,
  onTearComplete,
}: PackModel3DProps) {
  const groupRef = useRef<Group>(null)
  const innerRef = useRef<Group>(null)

  // useThree devuelve el tamaño del canvas → calcula scale responsive
  const { size } = useThree()

  /**
   * Scale responsive según el ancho del canvas.
   * Memoizado para evitar recalcular en cada frame.
   * Mobile aún más chico (1.15 vs 1.5 anterior) porque el sobre se cortaba
   * verticalmente en pantallas tipo Samsung S20 Ultra (412×915).
   */
  const baseScale = useMemo(() => {
    if (size.width < 600) return MODEL_SCALE_MOBILE
    if (size.width < 1024) return MODEL_SCALE_TABLET
    return MODEL_SCALE_DESKTOP
  }, [size.width])

  // Cargamos el GLTF. drei cachea automáticamente.
  const { scene } = useGLTF(MODEL_PATH)

  // Clone para evitar mutaciones del cache compartido.
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  /**
   * Materiales emissive cacheados. Antes recorríamos TODO el scene graph con
   * `traverse()` dentro del useFrame (60×/seg) solo para animar el glow. Ahora
   * juntamos los MeshStandardMaterial una sola vez acá y en el frame loop
   * iteramos este array chico.
   */
  const emissiveMaterials = useRef<THREE.MeshStandardMaterial[]>([])

  useEffect(() => {
    const mats: THREE.MeshStandardMaterial[] = []
    clonedScene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.emissive = new THREE.Color(GOLD)
        obj.material.emissiveIntensity = 0
        mats.push(obj.material)
      }
    })
    emissiveMaterials.current = mats
  }, [clonedScene])

  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragStartX = useRef(0)
  const lastProgress = useRef(0)

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [])

  /**
   * useFrame — animation loop cada frame:
   *  - Idle float (sobre flotando)
   *  - Tilt al mouse
   *  - tearProgress: scale up + emissive buildup + shake
   */
  useFrame((state) => {
    if (!groupRef.current || !innerRef.current) return

    const time = state.clock.elapsedTime

    /**
     * =============================================================
     * MODO "COMPLETING" — secuencia explosiva final
     * =============================================================
     * Cuando isCompleting=true, el modelo deja de responder al mouse
     * y entra en "explosión controlada": scale grande, spin rápido,
     * z hacia adelante. El flash overlay tapa el resto.
     */
    if (isCompleting) {
      // Scale explosivo — lerp rápido a 3.5x del base
      const explodeScale = baseScale * 3.5
      innerRef.current.scale.x = THREE.MathUtils.lerp(innerRef.current.scale.x, explodeScale, 0.12)
      innerRef.current.scale.y = THREE.MathUtils.lerp(innerRef.current.scale.y, explodeScale, 0.12)
      innerRef.current.scale.z = THREE.MathUtils.lerp(innerRef.current.scale.z, explodeScale, 0.12)

      // Spin libre en Y (rotación constante por frame) — ignora el mouse
      groupRef.current.rotation.y += 0.18
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1)

      // Position Z hacia adelante (parece venir a la cámara)
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, 4, 0.08)

      // Emissive al máximo (todo brillando dorado)
      for (const mat of emissiveMaterials.current) {
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 1.5, 0.15)
      }

      return // Early return: ignoramos toda la lógica de tilt/idle
    }

    /**
     * =============================================================
     * MODO NORMAL — idle float + tilt + drag feedback
     * =============================================================
     */

    // Idle float (solo cuando no hay drag activo)
    if (idleFloat && tearProgress < 0.05) {
      groupRef.current.position.y = Math.sin(time * 0.8) * 0.08
    }

    // Tilt al mouse
    const targetRotX = -mousePosition.y * 0.15
    const targetRotY = mousePosition.x * 0.25

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.08,
    )
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY,
      0.08,
    )

    // Scale: base (responsive) × (1 + tearProgress × 0.08)
    const targetScale = baseScale * (1 + tearProgress * 0.08)
    innerRef.current.scale.x = THREE.MathUtils.lerp(innerRef.current.scale.x, targetScale, 0.15)
    innerRef.current.scale.y = THREE.MathUtils.lerp(innerRef.current.scale.y, targetScale, 0.15)
    innerRef.current.scale.z = THREE.MathUtils.lerp(innerRef.current.scale.z, targetScale, 0.15)

    // Emissive buildup (parece cargarse de luz por dentro)
    const targetEmissive = tearProgress * 0.6
    for (const mat of emissiveMaterials.current) {
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.15)
    }

    /**
     * Shake del modelo durante el drag — intensifica con tearProgress.
     */
    if (tearProgress > 0.1) {
      const shakeIntensity = tearProgress * 0.03
      innerRef.current.position.x = Math.sin(time * 40) * shakeIntensity
      innerRef.current.position.y = Math.cos(time * 35) * shakeIntensity
    } else {
      innerRef.current.position.x = 0
      innerRef.current.position.y = 0
    }
  })

  // Drag handlers
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!draggable) return
    e.stopPropagation()
    setIsDragging(true)
    dragStartX.current = e.clientX
    document.body.style.cursor = 'grabbing'
    ;(e.target as Element)?.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !draggable) return

    const deltaX = e.clientX - dragStartX.current
    const progress = Math.min(Math.max(deltaX / COMPLETE_THRESHOLD_PX, 0), 1)

    if (progress !== lastProgress.current) {
      lastProgress.current = progress
      onTearProgressChange?.(progress)
    }
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !draggable) return
    setIsDragging(false)
    document.body.style.cursor = 'auto'
    ;(e.target as Element)?.releasePointerCapture?.(e.pointerId)

    if (lastProgress.current >= 1) {
      onTearComplete?.()
    } else {
      onTearProgressChange?.(0)
      lastProgress.current = 0
    }
  }

  const handlePointerOver = () => {
    if (!draggable) return
    setIsHovered(true)
    document.body.style.cursor = 'grab'
  }

  const handlePointerOut = () => {
    if (!draggable) return
    setIsHovered(false)
    if (!isDragging) {
      document.body.style.cursor = 'auto'
    }
  }

  return (
    <group ref={groupRef}>
      {/* Outer rotation group (Z): rota en plano de pantalla para portrait.
          Inner rotation group (X): para el pack vertical. */}
      <group rotation={[0, 0, MODEL_ROTATION_OUTER_Z]}>
        <group
          ref={innerRef}
          rotation={[MODEL_ROTATION_INNER_X, 0, 0]}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <primitive object={clonedScene} />
        </group>
      </group>

      {/* Glow ambient sutil siempre */}
      <pointLight position={[0, 0, 1]} color={GOLD} intensity={0.5} distance={3} decay={2} />

      {/* Glow creciente durante tear (parece que se carga de energía) */}
      {tearProgress > 0.1 && (
        <pointLight
          position={[0, 0, 0.5]}
          color={GOLD}
          intensity={tearProgress * 3}
          distance={4}
          decay={2}
        />
      )}

      {/* Hover glow extra cuando draggable */}
      {isHovered && draggable && (
        <pointLight position={[0, 0, 1.5]} color={GOLD} intensity={0.8} distance={2} decay={2} />
      )}
    </group>
  )
}

useGLTF.preload(MODEL_PATH)
