/**
 * SVG placeholder para cuando un cromo no tiene foto real.
 *
 * Genera una silueta abstracta del jugador con paleta que varía según el tier.
 * Determinístico: el mismo seed genera el mismo placeholder, así no parpadea
 * entre renders.
 */

type CromoPlaceholderProps = {
  seed: string
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

// Paletas internas por tier. Solo se usan para el placeholder, no para UI general.
const tierPalettes: Record<CromoPlaceholderProps['tier'], { bg: string; mid: string; fg: string }> =
  {
    common: { bg: '#1A1F28', mid: '#2A323F', fg: '#5A6470' },
    uncommon: { bg: '#1F1A12', mid: '#3D3220', fg: '#6A5530' },
    rare: { bg: '#0F2540', mid: '#1F3A5C', fg: '#7DB0DC' },
    epic: { bg: '#1A1426', mid: '#3A2B5C', fg: '#9B7AC5' },
    legendary: { bg: '#050309', mid: '#1A1426', fg: '#FFD96B' },
  }

/**
 * Hash determinístico de un string a number.
 * Se usa para variar la silueta entre cromos sin perder consistencia
 * para un mismo seed.
 */
function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function CromoPlaceholder({ seed, tier }: CromoPlaceholderProps) {
  const palette = tierPalettes[tier]
  const hash = hashSeed(seed)

  // Variaciones determinísticas (head size, pose, shirt cut)
  const headRadius = 36 + (hash % 12)
  const shoulderY = 200 + (hash % 30)
  const armSpread = 80 + (hash % 40)

  return (
    <svg
      viewBox="0 0 240 320"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="block size-full"
    >
      <defs>
        <radialGradient id={`grad-${seed}`} cx="50%" cy="35%">
          <stop offset="0%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.bg} />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="240" height="320" fill={`url(#grad-${seed})`} />

      {/* Cabeza */}
      <circle cx="120" cy="100" r={headRadius} fill={palette.fg} opacity="0.6" />

      {/* Cuerpo / hombros */}
      <path
        d={`M ${120 - armSpread} ${shoulderY} Q 120 ${shoulderY - 60} ${120 + armSpread} ${shoulderY} L ${120 + armSpread - 20} 320 L ${120 - armSpread + 20} 320 Z`}
        fill={palette.fg}
        opacity="0.55"
      />

      {/* Detalle decorativo según tier (sutil) */}
      {tier === 'legendary' && (
        <path
          d="M 110 165 L 130 175 L 120 195 L 140 185 L 150 205 L 145 175 L 165 165 L 145 160 L 140 140 L 135 160 Z"
          fill={palette.fg}
          opacity="0.4"
        />
      )}

      {tier === 'epic' && <circle cx="120" cy="180" r="3" fill={palette.fg} opacity="0.7" />}
    </svg>
  )
}
