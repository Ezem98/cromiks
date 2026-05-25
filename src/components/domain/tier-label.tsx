import { cn } from '@/lib/utils'

/**
 * Label visual de rareza.
 *
 * Se usa arriba de las cartas en el reveal y en cualquier contexto
 * donde haya que comunicar el tier.
 *
 * Common:    "COMÚN"          — gris neutro
 * Uncommon:  "POCO COMÚN"     — dorado mate
 * Rare:      "✦ RARA"         — celeste brillante
 * Epic:      "✦ ÉPICA"        — violeta
 * Legendary: "★ LEGENDARIA"   — prism gradient (text-clip)
 */

type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

type TierLabelProps = {
  tier: Tier
  className?: string
  size?: 'sm' | 'md'
}

const tierConfig: Record<Tier, { label: string; className: string }> = {
  common: {
    label: 'COMÚN',
    className: 'text-(--color-tier-common)',
  },
  uncommon: {
    label: 'POCO COMÚN',
    className: 'text-(--color-tier-uncommon)',
  },
  rare: {
    label: '✦ RARA',
    className: 'text-(--color-tier-rare)',
  },
  epic: {
    label: '✦ ÉPICA',
    className: 'text-(--color-tier-epic)',
  },
  legendary: {
    label: '★ LEGENDARIA',
    className: 'prism-text font-bold',
  },
}

const sizeClasses = {
  sm: 'text-[10px] tracking-[0.15em]',
  md: 'text-[11px] tracking-[0.2em]',
} as const

export function TierLabel({ tier, className, size = 'md' }: TierLabelProps) {
  const { label, className: tierClassName } = tierConfig[tier]

  return (
    <span
      className={cn(
        'text-mono uppercase font-medium leading-none',
        sizeClasses[size],
        tierClassName,
        className,
      )}
    >
      {label}
    </span>
  )
}
