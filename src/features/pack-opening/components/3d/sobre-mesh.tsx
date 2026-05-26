'use client'

import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import * as THREE from 'three'

/**
 * Mesh del sobre 3D — geometría procedural con drag interactivo.
 *
 * Compuesto por 2 sub-meshes:
 *  - SobreBase: cuerpo principal del sobre (parte de abajo, estática)
 *  - SobreTecho: la franja superior que el user agarra y rasga con drag
 *
 * El drag del techo es directo via raycaster de R3F:
 *  - onPointerDown captura el inicio del drag
 *  - onPointerMove (mientras está agarrado) calcula el progreso
 *  - onPointerUp evalúa si superó el threshold
 *
 * Optimizaciones aplicadas:
 *  - polygonOffset en los planos frontales para evitar z-fighting con el body
 *  - ringGeometry/circleGeometry con 32 segments (en lugar de 64) — suficiente
 *    para un círculo chico en pantalla, ahorra memoria
 *  - cleanup del cursor al desmontar (por si el componente se va mid-drag)
 *
 * Props:
 *  - mousePosition: tilt al cursor durante idle (cuando no hay drag activo)
 *  - tearProgress: 0..1, valor visual del tear (controlado externamente o por drag)
 *  - idleFloat: si el sobre flota durante idle
 *  - draggable: si el techo es draggable (true en fase tear, false en anticipation)
 *  - onTearProgressChange: callback cuando cambia el progreso por drag
 *  - onTearComplete: callback cuando el drag supera el threshold
 */

type SobreMeshProps = {
  mousePosition: { x: number; y: number }
  tearProgress?: number
  idleFloat?: boolean
  draggable?: boolean
  onTearProgressChange?: (progress: number) => void
  onTearComplete?: () => void
}

const SOBRE_WIDTH = 2.8
const SOBRE_HEIGHT = 3.7
const SOBRE_DEPTH = 0.15

const TECHO_RATIO = 0.16
const TECHO_HEIGHT = SOBRE_HEIGHT * TECHO_RATIO
const BASE_HEIGHT = SOBRE_HEIGHT - TECHO_HEIGHT

const TECHO_Y = SOBRE_HEIGHT / 2 - TECHO_HEIGHT / 2
const BASE_Y = -TECHO_HEIGHT / 2

const SURFACE_DEEP = '#1a1f28'
const SURFACE_BASE = '#0f131a'
const GOLD = '#D4A93C'

// Threshold de drag para completar el tear (en pixels de pantalla)
const COMPLETE_THRESHOLD_PX = 180

// Segments para geometrías circulares (32 es suficiente para nuestros círculos chicos)
const CIRCLE_SEGMENTS = 32

export function SobreMesh({
  mousePosition,
  tearProgress = 0,
  idleFloat = true,
  draggable = false,
  onTearProgressChange,
  onTearComplete,
}: SobreMeshProps) {
  const groupRef = useRef<Group>(null)
  const techoRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return

    const time = state.clock.elapsedTime

    // Idle float (solo si no estamos en tear activo)
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

    // Tear animation — el techo se levanta y rota
    if (techoRef.current) {
      const targetLift = tearProgress * 1.5
      techoRef.current.position.y = THREE.MathUtils.lerp(
        techoRef.current.position.y,
        TECHO_Y + targetLift,
        0.15,
      )

      const targetRotXTecho = tearProgress * -0.6
      const targetRotZTecho = tearProgress * 0.2
      techoRef.current.rotation.x = THREE.MathUtils.lerp(
        techoRef.current.rotation.x,
        targetRotXTecho,
        0.15,
      )
      techoRef.current.rotation.z = THREE.MathUtils.lerp(
        techoRef.current.rotation.z,
        targetRotZTecho,
        0.15,
      )
    }
  })

  return (
    <group ref={groupRef}>
      {/* === BASE del sobre === */}
      <SobreBase />

      {/* === TECHO del sobre — draggable === */}
      <group ref={techoRef} position={[0, TECHO_Y, 0]}>
        <SobreTecho
          draggable={draggable}
          onTearProgressChange={onTearProgressChange}
          onTearComplete={onTearComplete}
        />
      </group>

      {/* Glow ambient en el sello */}
      <pointLight position={[0, 0, 1]} color={GOLD} intensity={0.5} distance={3} decay={2} />

      {/* Glow interior creciente al rasgar (preview del interior) */}
      {tearProgress > 0.1 && (
        <pointLight
          position={[0, 0, 0.5]}
          color={GOLD}
          intensity={tearProgress * 2}
          distance={3}
          decay={2}
        />
      )}
    </group>
  )
}

/**
 * Base del sobre — estática, no draggable.
 */
function SobreBase() {
  return (
    <group position={[0, BASE_Y, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[SOBRE_WIDTH, BASE_HEIGHT, SOBRE_DEPTH]} />
        <meshStandardMaterial color={SURFACE_DEEP} metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Fondo lateral con polygonOffset para evitar z-fighting */}
      <mesh position={[0, 0, -SOBRE_DEPTH / 2 - 0.001]}>
        <planeGeometry args={[SOBRE_WIDTH * 1.01, BASE_HEIGHT * 1.01]} />
        <meshBasicMaterial
          color={SURFACE_BASE}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Capa frontal con polygonOffset */}
      <mesh position={[0, 0, SOBRE_DEPTH / 2 + 0.001]}>
        <planeGeometry args={[SOBRE_WIDTH * 0.98, BASE_HEIGHT * 0.98]} />
        <meshStandardMaterial
          color={SURFACE_DEEP}
          metalness={0.1}
          roughness={0.7}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      <SelloDorado position={[0, 0.1, SOBRE_DEPTH / 2 + 0.005]} />

      <CornerBracket
        position={[SOBRE_WIDTH / 2 - 0.15, -BASE_HEIGHT / 2 + 0.15, SOBRE_DEPTH / 2 + 0.005]}
        rotation={[0, 0, Math.PI]}
      />
      <CornerBracket
        position={[-SOBRE_WIDTH / 2 + 0.15, -BASE_HEIGHT / 2 + 0.15, SOBRE_DEPTH / 2 + 0.005]}
        rotation={[0, 0, Math.PI / 2]}
      />
    </group>
  )
}

/**
 * Techo del sobre — draggable cuando `draggable=true`.
 *
 * El user hace pointer-down sobre el mesh (el raycaster de R3F lo detecta),
 * arrastra hacia la derecha, y al soltar evaluamos el threshold.
 *
 * Hint visual cuando draggable:
 *  - Glow dorado pulsante adicional en el techo
 *  - Cursor "grab" / "grabbing"
 *
 * Cleanup: si el componente se desmonta mid-drag, el useEffect cleanup
 * resetea el cursor para evitar que quede en "grabbing" forever.
 */
function SobreTecho({
  draggable = false,
  onTearProgressChange,
  onTearComplete,
}: {
  draggable?: boolean
  onTearProgressChange?: (progress: number) => void
  onTearComplete?: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Refs para el drag (no usamos state para evitar re-renders por movimiento)
  const dragStartX = useRef(0)
  const lastProgress = useRef(0)

  // Cleanup: si el componente se desmonta a mitad de un drag (ej. user clickea Skip),
  // restauramos el cursor del body para que no quede en "grabbing" forever.
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [])

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!draggable) return
    e.stopPropagation()
    setIsDragging(true)
    dragStartX.current = e.clientX
    document.body.style.cursor = 'grabbing'

    // Capturar el pointer al canvas para que el move funcione fuera del mesh también
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
      // Volver a 0 — el progreso se resetea
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
    <group>
      {/* Body del techo — con los handlers de drag */}
      <mesh
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[SOBRE_WIDTH, TECHO_HEIGHT, SOBRE_DEPTH]} />
        <meshStandardMaterial
          color={SURFACE_DEEP}
          metalness={0.2}
          roughness={0.6}
          // Highlight sutil al hover (indica que es draggable)
          emissive={isHovered && draggable ? GOLD : '#000000'}
          emissiveIntensity={isHovered && draggable ? 0.15 : 0}
        />
      </mesh>

      {/* Fondo lateral del techo */}
      <mesh position={[0, 0, -SOBRE_DEPTH / 2 - 0.001]}>
        <planeGeometry args={[SOBRE_WIDTH * 1.01, TECHO_HEIGHT * 1.01]} />
        <meshBasicMaterial
          color={SURFACE_BASE}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Capa frontal del techo */}
      <mesh position={[0, 0, SOBRE_DEPTH / 2 + 0.001]}>
        <planeGeometry args={[SOBRE_WIDTH * 0.98, TECHO_HEIGHT * 0.98]} />
        <meshStandardMaterial
          color={SURFACE_DEEP}
          metalness={0.1}
          roughness={0.7}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Línea perforada dorada (visible siempre cuando es draggable) */}
      {draggable && (
        <mesh position={[0, -TECHO_HEIGHT / 2, SOBRE_DEPTH / 2 + 0.01]}>
          <planeGeometry args={[SOBRE_WIDTH * 0.95, 0.02]} />
          <meshBasicMaterial color={GOLD} />
        </mesh>
      )}

      {/* Glow dorado pulsante en el techo cuando draggable (hint visual) */}
      {draggable && <TechoPulseHint />}

      {/* Corner brackets superiores */}
      <CornerBracket
        position={[-SOBRE_WIDTH / 2 + 0.15, TECHO_HEIGHT / 2 - 0.15, SOBRE_DEPTH / 2 + 0.005]}
        rotation={[0, 0, 0]}
      />
      <CornerBracket
        position={[SOBRE_WIDTH / 2 - 0.15, TECHO_HEIGHT / 2 - 0.15, SOBRE_DEPTH / 2 + 0.005]}
        rotation={[0, 0, -Math.PI / 2]}
      />
    </group>
  )
}

/**
 * Pulse hint del techo — point light dorado que respira.
 *
 * Indica visualmente "agarrame y tirá".
 */
function TechoPulseHint() {
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    if (!lightRef.current) return
    const time = state.clock.elapsedTime
    // Respiración: intensidad oscila entre 0.3 y 0.8
    lightRef.current.intensity = 0.5 + Math.sin(time * 2) * 0.3
  })

  return (
    <pointLight
      ref={lightRef}
      position={[0, 0, 0.4]}
      color={GOLD}
      intensity={0.5}
      distance={1.5}
      decay={2}
    />
  )
}

/**
 * Sello dorado central.
 *
 * Usa CIRCLE_SEGMENTS=32 para el ring y círculo interior (en lugar de 64).
 * Es suficiente para un círculo chico en pantalla y ahorra memoria.
 */
function SelloDorado({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <ringGeometry args={[0.42, 0.5, CIRCLE_SEGMENTS]} />
        <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[0.35, CIRCLE_SEGMENTS]} />
        <meshStandardMaterial color={SURFACE_DEEP} metalness={0.1} roughness={0.8} />
      </mesh>
    </group>
  )
}

/**
 * Corner bracket decorativo (L de 2 líneas blancas).
 */
function CornerBracket({
  position,
  rotation,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0.15, 0, 0]}>
        <planeGeometry args={[0.3, 0.01]} />
        <meshBasicMaterial color="white" opacity={0.15} transparent />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <planeGeometry args={[0.01, 0.3]} />
        <meshBasicMaterial color="white" opacity={0.15} transparent />
      </mesh>
    </group>
  )
}
