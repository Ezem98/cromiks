import { FlameIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Card que muestra la racha actual del user.
 *
 * Muestra el número grande, el mensaje contextual y los próximos hitos
 * (7 días, 30 días, 100 días).
 */

const milestones = [7, 30, 100, 365]

type StreakCardProps = {
  currentStreak: number
  longestStreak: number
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const nextMilestone = milestones.find((m) => m > currentStreak)
  const daysToNext = nextMilestone ? nextMilestone - currentStreak : null

  return (
    <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6 h-full">
      <div className="flex items-start justify-between mb-4">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          Tu racha
        </p>
        <FlameIcon
          className={cn(
            'size-5',
            currentStreak === 0 ? 'text-(--color-text-ghost)' : 'text-(--color-gold)',
          )}
        />
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span
          className={cn(
            'text-display text-6xl leading-none',
            currentStreak === 0 ? 'text-(--color-text-ghost)' : 'text-(--color-text-primary)',
          )}
        >
          {currentStreak}
        </span>
        <span className="text-(--color-text-muted) text-sm">
          {currentStreak === 1 ? 'día' : 'días'}
        </span>
      </div>

      {currentStreak === 0 ? (
        <p className="text-(--color-text-secondary) text-sm">Abrí tu primer sobre para arrancar.</p>
      ) : nextMilestone ? (
        <p className="text-(--color-text-secondary) text-sm">
          Te faltan <span className="text-(--color-gold) font-medium">{daysToNext} días</span> para
          el badge de {nextMilestone}.
        </p>
      ) : (
        <p className="text-(--color-text-secondary) text-sm">¡Tenés todos los badges de racha!</p>
      )}

      {longestStreak > currentStreak && (
        <p className="text-mono text-[10px] uppercase tracking-[0.1em] text-(--color-text-muted) mt-3">
          Récord: {longestStreak} días
        </p>
      )}
    </div>
  )
}
