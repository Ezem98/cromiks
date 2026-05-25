import { cn } from '@/lib/utils'

/**
 * Sobre (pack visual).
 *
 * 3 estados:
 * - closed:  flotando con idle animation, listo para abrir
 * - opening: tearing animation (uso futuro durante la apertura)
 * - opened:  disabled/gris (uso futuro, post-apertura)
 *
 * Tipos de sobre (afectan el "papel"):
 * - daily:    papel kraft neutro con sello celeste/dorado
 * - mission:  papel con check en el frente
 * - match:    papel post-partido
 * - welcome:  bienvenida al user
 * - premium:  prism foil border
 * - referral: por traer un amigo
 */

type SobreType = 'daily' | 'mission' | 'match' | 'welcome' | 'premium' | 'referral'
type SobreState = 'closed' | 'opening' | 'opened'
type SobreSize = 'sm' | 'md' | 'lg'

type SobreProps = {
  type?: SobreType
  state?: SobreState
  size?: SobreSize
  context?: string
  className?: string
}

const sizeMap: Record<
  SobreSize,
  { width: number; height: number; brandSize: string; sealSize: string }
> = {
  sm: { width: 140, height: 184, brandSize: 'text-[7px]', sealSize: 'size-10 text-xl' },
  md: { width: 220, height: 290, brandSize: 'text-[11px]', sealSize: 'size-16 text-3xl' },
  lg: { width: 280, height: 369, brandSize: 'text-[13px]', sealSize: 'size-20 text-4xl' },
}

const typeLabels: Record<SobreType, string> = {
  daily: 'Sobre diario',
  mission: 'Sobre de misión',
  match: 'Sobre del partido',
  welcome: 'Sobre de bienvenida',
  premium: 'Sobre premium',
  referral: 'Sobre de referido',
}

const typeColors: Record<SobreType, string> = {
  daily: 'text-(--color-gold)',
  mission: 'text-(--color-tier-rare)',
  match: 'text-(--color-tier-epic)',
  welcome: 'text-(--color-argentina-glow)',
  premium: 'prism-text font-bold',
  referral: 'text-(--color-success)',
}

export function Sobre({
  type = 'daily',
  state = 'closed',
  size = 'md',
  context,
  className,
}: SobreProps) {
  const dims = sizeMap[size]
  const isPremium = type === 'premium'
  const isDisabled = state === 'opened'

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center gap-3',
        isDisabled && 'opacity-40 grayscale',
        className,
      )}
    >
      {/* Premium wrapper con prism border rotando */}
      <div className="relative" style={{ width: dims.width, height: dims.height }}>
        {isPremium && (
          <div
            className="absolute -inset-[2px] rounded-[14px] prism-border-rotating"
            aria-hidden="true"
          />
        )}

        <div
          className={cn(
            'relative size-full overflow-hidden rounded-[12px]',
            'border border-white/10',
            'flex flex-col items-center justify-center',
          )}
          style={{
            background: 'linear-gradient(180deg, #1a1f28 0%, #0f131a 100%)',
            animation: state === 'closed' ? 'float 4s ease-in-out infinite' : undefined,
          }}
        >
          {/* Textura sutil */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, transparent 1px, transparent 8px)',
            }}
            aria-hidden="true"
          />

          {/* Corner brackets */}
          <span className="absolute top-3 left-3 size-6 border-l border-t border-white/10" />
          <span className="absolute top-3 right-3 size-6 border-r border-t border-white/10" />
          <span className="absolute bottom-3 left-3 size-6 border-l border-b border-white/10" />
          <span className="absolute bottom-3 right-3 size-6 border-r border-b border-white/10" />

          {/* Sello central */}
          <div
            className={cn(
              'relative z-10 rounded-full border-2 flex items-center justify-center',
              'text-display leading-none',
              dims.sealSize,
              isPremium
                ? 'border-(--color-gold) text-(--color-gold)'
                : 'border-(--color-gold) text-(--color-gold)',
            )}
          >
            C
          </div>

          {/* Brand */}
          <div
            className={cn(
              'relative z-10 mt-3 text-mono uppercase text-(--color-text-muted) tracking-[0.3em]',
              dims.brandSize,
            )}
          >
            CROMIKS
          </div>
        </div>
      </div>

      {/* Type label */}
      <div className={cn('text-mono text-[11px] uppercase tracking-[0.15em]', typeColors[type])}>
        {typeLabels[type]}
      </div>

      {/* Context opcional */}
      {context && (
        <div className="text-[14px] text-(--color-text-secondary) text-center max-w-[280px]">
          {context}
        </div>
      )}
    </div>
  )
}
