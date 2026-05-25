import Image from 'next/image'
import { cn } from '@/lib/utils'
import { CromoPlaceholder } from './cromo-placeholder'

/**
 * Componente principal del producto.
 *
 * Renderiza un cromo con su tier-specific anatomy:
 *
 * - common:    marco neutro, foto estática, sin efectos
 * - uncommon:  marco dorado + shimmer pass 3s
 * - rare:      foil prismático + scanlines + glow celeste
 * - epic:      glow violeta + sparkles ambientes
 * - legendary: prism rotating border + glow gold + ambient
 *
 * Acepta una URL opcional para la imagen. Si no hay URL, usa CromoPlaceholder
 * con un SVG abstracto determinístico basado en el seed.
 *
 * Estados:
 * - idle (default): renderiza la carta tal cual
 * - new: agrega badge "¡Nuevo!" flotante
 * - repeated: opacity sutil + badge "Repetida"
 */

type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

type CromoProps = {
  tier: Tier
  name: string
  playerRole?: string
  number?: string | number
  imageUrl?: string
  seed: string
  state?: 'idle' | 'new' | 'repeated'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: {
    width: 160,
    height: 213,
    nameSize: 'text-[14px]',
    roleSize: 'text-[8px]',
    numberSize: 'text-[20px]',
  },
  md: {
    width: 240,
    height: 320,
    nameSize: 'text-[18px]',
    roleSize: 'text-[9px]',
    numberSize: 'text-[26px]',
  },
  lg: {
    width: 320,
    height: 427,
    nameSize: 'text-[22px]',
    roleSize: 'text-[10px]',
    numberSize: 'text-[32px]',
  },
} as const

const tierStyles: Record<Tier, { border: string; glow: string }> = {
  common: {
    border: 'border-(--color-tier-common)/50',
    glow: '',
  },
  uncommon: {
    border: 'border-(--color-tier-uncommon)',
    glow: 'shadow-[0_0_16px_rgba(212,169,60,0.18)]',
  },
  rare: {
    border: 'border-(--color-tier-rare)',
    glow: 'shadow-[0_0_24px_rgba(91,163,224,0.35)]',
  },
  epic: {
    border: 'border-(--color-tier-epic)',
    glow: 'shadow-[0_0_28px_rgba(185,127,227,0.35)]',
  },
  legendary: {
    border: 'border-transparent',
    glow: 'shadow-[0_0_36px_rgba(212,169,60,0.25)]',
  },
}

export function Cromo({
  tier,
  name,
  playerRole,
  number,
  imageUrl,
  seed,
  state = 'idle',
  size = 'md',
  className,
}: CromoProps) {
  const dims = sizeMap[size]
  const styles = tierStyles[tier]
  const isLegendary = tier === 'legendary'
  const isRare = tier === 'rare'
  const isEpic = tier === 'epic'
  const isUncommon = tier === 'uncommon'

  return (
    <div
      className={cn(
        'relative',
        'transition-all duration-200',
        state === 'repeated' && 'opacity-75',
        className,
      )}
      style={{ width: dims.width, height: dims.height }}
    >
      {/* Legendary wrapper con prism gradient rotando como border */}
      {isLegendary && (
        <div
          className="absolute -inset-[2px] rounded-[18px] prism-border-rotating"
          aria-hidden="true"
        />
      )}

      {/* Card body */}
      <div
        className={cn(
          'relative size-full overflow-hidden rounded-[16px] border',
          'flex flex-col justify-end',
          styles.border,
          styles.glow,
        )}
      >
        {/* Foto o placeholder */}
        <div className="absolute inset-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes={`${dims.width}px`}
              className="object-cover"
              priority={tier === 'legendary'}
            />
          ) : (
            <CromoPlaceholder seed={seed} tier={tier} />
          )}
        </div>

        {/* Rare: foil scanlines + shine */}
        {isRare && (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'repeating-linear-gradient(120deg, transparent 0px, rgba(91, 163, 224, 0.15) 1px, transparent 2px, transparent 7px)',
              }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.12) 50%, transparent 70%)',
                backgroundSize: '200% 200%',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
              aria-hidden="true"
            />
          </>
        )}

        {/* Uncommon: shimmer suave */}
        {isUncommon && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(45deg, transparent 30%, rgba(212, 169, 60, 0.12) 50%, transparent 70%)',
              backgroundSize: '200% 200%',
              animation: 'shimmer 4s ease-in-out infinite',
            }}
            aria-hidden="true"
          />
        )}

        {/* Epic: glow radial central */}
        {isEpic && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(185, 127, 227, 0.2) 0%, transparent 60%)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Legendary: glow gold radial */}
        {isLegendary && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(255, 217, 107, 0.22) 0%, transparent 55%)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Player number arriba-derecha */}
        {number !== undefined && (
          <div
            className={cn(
              'absolute top-3 right-3 z-10',
              'text-display leading-none',
              dims.numberSize,
              isLegendary ? 'text-(--color-gold)' : 'text-white/85',
            )}
          >
            {number}
          </div>
        )}

        {/* Content overlay */}
        <div
          className="relative z-10 p-4"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 60%)',
            marginTop: 'auto',
          }}
        >
          <div className={cn('text-display text-white leading-[0.95]', dims.nameSize)}>
            {name.toUpperCase()}
          </div>
          {playerRole && (
            <div
              className={cn(
                'text-mono uppercase mt-1 leading-none',
                dims.roleSize,
                isLegendary ? 'text-(--color-gold)/90' : 'text-white/70',
              )}
            >
              {playerRole}
            </div>
          )}
        </div>
      </div>

      {/* Estado: ¡Nuevo! badge flotante */}
      {state === 'new' && (
        <div className="absolute -top-2 -right-2 z-20">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1',
              'text-[11px] font-medium leading-none',
              'bg-(--color-argentina-glow) text-(--color-surface-deep)',
              'shadow-[0_0_16px_rgba(107,185,255,0.5)]',
            )}
          >
            ¡Nuevo!
          </span>
        </div>
      )}
    </div>
  )
}
