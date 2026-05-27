'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import * as THREE from 'three'
import type { RevealedCard, Tier } from '../../types'

/**
 * Card 3D — geometría procedural pura.
 *
 * IMPORTANTE: NO usamos drei <Text> porque tiene incompatibilidad con
 * three r0.184 (genera planos blancos gigantes en lugar del texto).
 *
 * Estrategia: la card 3D solo renderiza el VISUAL (box + border + avatar).
 * El texto (nombre, número, posición) se renderea como HTML overlay sobre
 * el canvas en el componente parent (CardScene3D).
 *
 * Esto es híbrido:
 *  - 3D: box con grosor, border tier-colored, avatar placeholder, glow,
 *    flip 3D, tilt al mouse
 *  - HTML: textos legibles y nítidos, fácil de tipografía/i18n
 */

const CARD_WIDTH = 2.4
const CARD_HEIGHT = 3.2
const CARD_DEPTH = 0.04

const SURFACE_DEEP = '#1a1f28'
const SURFACE_BASE = '#0f131a'
const GOLD = '#D4A93C'

/**
 * Tilt máximo del card 3D en respuesta al mouse (radianes).
 * Exportados para que el overlay HTML pueda matchear el mismo tilt
 * sin desincronizarse si alguien tunea estos valores.
 */
export const CARD_TILT_X_RAD = 0.2
export const CARD_TILT_Y_RAD = 0.3

function getTierColor(tier: Tier): string {
  switch (tier) {
    case 'common':
      return '#3a4555'
    case 'uncommon':
      return GOLD
    case 'rare':
      return '#6BB9FF'
    case 'epic':
      return '#B97FE3'
    case 'legendary':
      return '#FFD96B'
    default:
      return SURFACE_DEEP
  }
}

type CardMesh3DProps = {
  card?: RevealedCard | null
  mousePosition?: { x: number; y: number }
  tiltStrength?: number
  rotateY?: number
  size?: number
}

export function CardMesh3D({
  card,
  mousePosition = { x: 0, y: 0 },
  tiltStrength = 0,
  rotateY = 0,
  size = 1,
}: CardMesh3DProps) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    if (!groupRef.current) return

    if (tiltStrength > 0) {
      const targetRotX = -mousePosition.y * CARD_TILT_X_RAD * tiltStrength
      const targetRotY = rotateY + mousePosition.x * CARD_TILT_Y_RAD * tiltStrength
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotX,
        0.1,
      )
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotY,
        0.1,
      )
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotateY, 0.15)
    }
  })

  const w = CARD_WIDTH * size
  const h = CARD_HEIGHT * size
  const d = CARD_DEPTH * size
  const tierColor = card ? getTierColor(card.tier) : SURFACE_DEEP

  return (
    <group ref={groupRef}>
      {/* Box body con grosor */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={SURFACE_DEEP} metalness={0.15} roughness={0.65} />
      </mesh>

      {/* FRONT FACE */}
      {card && (
        <group position={[0, 0, d / 2 + 0.001]}>
          <CardFront tierColor={tierColor} size={size} />
        </group>
      )}

      {/* BACK FACE */}
      <group position={[0, 0, -d / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
        <CardBack3D size={size} />
      </group>

      {/* Glow ambient */}
      {card && (
        <pointLight position={[0, 0, 1]} color={tierColor} intensity={0.6} distance={3} decay={2} />
      )}
    </group>
  )
}

/* =========================================================================
   FRONT FACE — solo visual (border + avatar + glow). Sin texto.
   ========================================================================= */

function CardFront({ tierColor, size = 1 }: { tierColor: string; size?: number }) {
  const w = CARD_WIDTH * size
  const h = CARD_HEIGHT * size

  return (
    <group>
      {/* Fondo */}
      <mesh>
        <planeGeometry args={[w * 0.99, h * 0.99]} />
        <meshStandardMaterial
          color={SURFACE_DEEP}
          metalness={0.1}
          roughness={0.7}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Border del tier */}
      <BorderFrame width={w} height={h} color={tierColor} thickness={0.04 * size} />

      {/* Avatar placeholder al centro superior */}
      <PlayerAvatarPlaceholder position={[0, h * 0.1, 0.01]} radius={w * 0.32} />

      {/* Indicador del tier en esquina superior derecha (círculo del color) */}
      <mesh position={[w / 2 - 0.25 * size, h / 2 - 0.25 * size, 0.02]}>
        <circleGeometry args={[0.12 * size, 32]} />
        <meshBasicMaterial color={tierColor} />
      </mesh>
    </group>
  )
}

function BorderFrame({
  width,
  height,
  color,
  thickness,
}: {
  width: number
  height: number
  color: string
  thickness: number
}) {
  const w = width * 0.99
  const h = height * 0.99
  return (
    <group position={[0, 0, 0.005]}>
      <mesh position={[0, h / 2 - thickness / 2, 0]}>
        <planeGeometry args={[w, thickness]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -h / 2 + thickness / 2, 0]}>
        <planeGeometry args={[w, thickness]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh position={[-w / 2 + thickness / 2, 0, 0]}>
        <planeGeometry args={[thickness, h]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh position={[w / 2 - thickness / 2, 0, 0]}>
        <planeGeometry args={[thickness, h]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

function PlayerAvatarPlaceholder({
  position,
  radius,
}: {
  position: [number, number, number]
  radius: number
}) {
  return (
    <group position={position}>
      <mesh>
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial color={SURFACE_BASE} metalness={0.05} roughness={0.9} />
      </mesh>
      <mesh position={[0, radius * 0.15, 0.005]}>
        <circleGeometry args={[radius * 0.35, 32]} />
        <meshStandardMaterial color="#2a3340" metalness={0.05} roughness={0.85} />
      </mesh>
      <mesh position={[0, -radius * 0.35, 0.005]} scale={[1, 0.6, 1]}>
        <circleGeometry args={[radius * 0.6, 48]} />
        <meshStandardMaterial color="#2a3340" metalness={0.05} roughness={0.85} />
      </mesh>
    </group>
  )
}

/* =========================================================================
   BACK FACE — dorso con ring dorado, sin texto
   ========================================================================= */

function CardBack3D({ size = 1 }: { size?: number }) {
  const w = CARD_WIDTH * size
  const h = CARD_HEIGHT * size

  return (
    <group>
      <mesh>
        <planeGeometry args={[w * 0.99, h * 0.99]} />
        <meshStandardMaterial color={SURFACE_BASE} metalness={0.05} roughness={0.8} />
      </mesh>

      {/* Ring dorado central (como un sello) */}
      <mesh position={[0, 0.1 * size, 0.005]}>
        <ringGeometry args={[0.35 * size, 0.5 * size, 32]} />
        <meshStandardMaterial
          color={GOLD}
          metalness={0.8}
          roughness={0.3}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Círculo central oscuro */}
      <mesh position={[0, 0.1 * size, 0.006]}>
        <circleGeometry args={[0.32 * size, 32]} />
        <meshStandardMaterial color={SURFACE_BASE} metalness={0.05} roughness={0.85} />
      </mesh>

      {/* Corner brackets */}
      <CornerBracket3D
        position={[-w / 2 + 0.1 * size, h / 2 - 0.1 * size, 0.001]}
        rotation={[0, 0, 0]}
        size={size}
      />
      <CornerBracket3D
        position={[w / 2 - 0.1 * size, h / 2 - 0.1 * size, 0.001]}
        rotation={[0, 0, -Math.PI / 2]}
        size={size}
      />
      <CornerBracket3D
        position={[w / 2 - 0.1 * size, -h / 2 + 0.1 * size, 0.001]}
        rotation={[0, 0, Math.PI]}
        size={size}
      />
      <CornerBracket3D
        position={[-w / 2 + 0.1 * size, -h / 2 + 0.1 * size, 0.001]}
        rotation={[0, 0, Math.PI / 2]}
        size={size}
      />
    </group>
  )
}

function CornerBracket3D({
  position,
  rotation,
  size = 1,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  size?: number
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0.15 * size, 0, 0]}>
        <planeGeometry args={[0.3 * size, 0.01 * size]} />
        <meshBasicMaterial color="white" opacity={0.2} transparent />
      </mesh>
      <mesh position={[0, -0.15 * size, 0]}>
        <planeGeometry args={[0.01 * size, 0.3 * size]} />
        <meshBasicMaterial color="white" opacity={0.2} transparent />
      </mesh>
    </group>
  )
}
