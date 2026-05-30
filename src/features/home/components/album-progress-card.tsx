import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

/**
 * Card del progreso del álbum.
 *
 * Muestra: cuántos cromos tiene / total, % de progreso visual, CTA al álbum.
 */

type AlbumProgressCardProps = {
  cardsOwned: number
  totalCards: number
}

export function AlbumProgressCard({ cardsOwned, totalCards }: AlbumProgressCardProps) {
  const percentage =
    totalCards === 0 ? 0 : Math.min(100, Math.round((cardsOwned / totalCards) * 100))

  return (
    <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          Tu álbum
        </p>
        <span className="text-mono text-[11px] text-(--color-gold)">{percentage}%</span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-display text-6xl leading-none text-(--color-text-primary)">
          {cardsOwned}
        </span>
        <span className="text-(--color-text-muted) text-sm">de {totalCards}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-(--color-surface-elevated) rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-(--color-argentina-glow) rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {cardsOwned === 0 ? (
        <p className="text-(--color-text-secondary) text-sm flex-1">
          Tu álbum está esperando. Abrí tu primer sobre.
        </p>
      ) : (
        <p className="text-(--color-text-secondary) text-sm flex-1">
          Te faltan{' '}
          <span className="text-(--color-text-primary) font-medium">
            {Math.max(0, totalCards - cardsOwned)} cromos
          </span>{' '}
          para completar el álbum.
        </p>
      )}

      <Link
        href="/album"
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-(--color-argentina-glow) hover:underline underline-offset-2"
      >
        Ver el álbum
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  )
}
