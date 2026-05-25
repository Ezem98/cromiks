import { cn } from '@/lib/utils'

/**
 * Mini badge para estados/eventos de un cromo.
 *
 * - "new"        → ¡Nuevo! (background argentina-glow, texto oscuro)
 * - "repeated"   → Repetida (opacity reducida, neutral)
 * - "rewarded"   → Repetida · +5 monedas (con valor de reward)
 * - "pinned"     → Destacada (gold sutil)
 */

type RarityBadgeVariant = 'new' | 'repeated' | 'rewarded' | 'pinned'

type RarityBadgeProps = {
  variant: RarityBadgeVariant
  reward?: number
  className?: string
}

const variantConfig: Record<RarityBadgeVariant, { label: string; className: string }> = {
  new: {
    label: '¡Nuevo!',
    className:
      'bg-(--color-argentina-glow) text-(--color-surface-deep) shadow-[0_0_12px_rgba(107,185,255,0.4)]',
  },
  repeated: {
    label: 'Repetida',
    className: 'bg-(--color-surface-elevated) text-(--color-text-muted) border border-white/[0.06]',
  },
  rewarded: {
    label: 'Repetida',
    className: 'bg-(--color-surface-elevated) text-(--color-text-secondary) border border-white/10',
  },
  pinned: {
    label: '★ Destacada',
    className: 'bg-(--color-gold)/15 text-(--color-gold) border border-(--color-gold)/30',
  },
}

export function RarityBadge({ variant, reward, className }: RarityBadgeProps) {
  const config = variantConfig[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
        'text-[11px] font-medium leading-none',
        config.className,
        className,
      )}
    >
      {config.label}
      {variant === 'rewarded' && reward !== undefined && (
        <span className="text-(--color-gold) font-semibold">· +{reward} monedas</span>
      )}
    </span>
  )
}
