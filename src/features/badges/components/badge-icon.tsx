import {
  CrownIcon,
  FlameIcon,
  GemIcon,
  type LucideIcon,
  MedalIcon,
  Share2Icon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BadgeRarity } from '../queries'

/**
 * Icono visual de una badge. Maneja:
 *  - Mapping de icon_name (string del catálogo) → componente lucide
 *  - Variante por rarity (color del aro/glow)
 *  - Estado locked / unlocked (saturación + glow)
 *  - Tamaño (sm para grid en perfil, md para sheet)
 *
 * El catálogo (seed.ts) usa estos icon_name: sparkle, stack, medal, trophy,
 * crown, gem, star, flame, fire, share, users. Si llega uno desconocido,
 * fallback a SparklesIcon.
 */

const iconMap: Record<string, LucideIcon> = {
  sparkle: SparklesIcon,
  stack: MedalIcon, // "stack" en seed pero conceptualmente "10 cromos pegados" → medal funciona
  medal: MedalIcon,
  trophy: TrophyIcon,
  crown: CrownIcon,
  gem: GemIcon,
  star: StarIcon,
  flame: FlameIcon,
  fire: FlameIcon,
  share: Share2Icon,
  users: UsersIcon,
}

const rarityColors: Record<BadgeRarity, { ring: string; glow: string; text: string }> = {
  common: {
    ring: 'border-white/[0.12]',
    glow: '',
    text: 'text-(--color-text-secondary)',
  },
  uncommon: {
    ring: 'border-emerald-400/30',
    glow: 'shadow-[0_0_16px_rgba(110,231,183,0.25)]',
    text: 'text-emerald-300',
  },
  rare: {
    ring: 'border-(--color-argentina-glow)/40',
    glow: 'shadow-[0_0_18px_rgba(107,185,255,0.3)]',
    text: 'text-(--color-argentina-glow)',
  },
  epic: {
    ring: 'border-purple-400/40',
    glow: 'shadow-[0_0_18px_rgba(192,132,252,0.3)]',
    text: 'text-purple-300',
  },
  legendary: {
    ring: 'border-(--color-gold)/50',
    glow: 'shadow-[0_0_22px_rgba(212,169,60,0.4)]',
    text: 'text-(--color-gold)',
  },
}

const sizeStyles = {
  sm: { box: 'size-12', icon: 'size-5' },
  md: { box: 'size-16', icon: 'size-7' },
} as const

type BadgeIconProps = {
  iconName: string | null
  rarity: BadgeRarity
  unlocked: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function BadgeIcon({ iconName, rarity, unlocked, size = 'sm', className }: BadgeIconProps) {
  const Icon = iconMap[iconName ?? 'sparkle'] ?? SparklesIcon
  const { ring, glow, text } = rarityColors[rarity]
  const { box, icon } = sizeStyles[size]

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border bg-(--color-surface-raised)',
        box,
        ring,
        unlocked ? glow : 'opacity-40 grayscale',
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={cn(icon, unlocked ? text : 'text-(--color-text-muted)')} />
    </div>
  )
}
