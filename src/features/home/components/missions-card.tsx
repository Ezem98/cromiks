import { CheckCircle2Icon, CircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Card de misiones del día.
 *
 * Muestra las 3 misiones activas del user con su progreso.
 * El user no las completa "manualmente" — se completan al hacer las
 * acciones (abrir sobres, compartir, pinear). El feedback es visual.
 */

type Mission = {
  id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'claimed' | 'expired'
  progress: number
  target: number
}

type MissionsCardProps = {
  missions: Mission[]
}

export function MissionsCard({ missions }: MissionsCardProps) {
  if (missions.length === 0) {
    return (
      <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-3">
          Misiones del día
        </p>
        <p className="text-(--color-text-secondary) text-sm">
          Asignando misiones... vuelvé a cargar la página en un instante.
        </p>
      </div>
    )
  }

  const completedCount = missions.filter(
    (m) => m.status === 'completed' || m.status === 'claimed',
  ).length

  return (
    <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          Misiones del día
        </p>
        <span className="text-mono text-[11px] text-(--color-gold)">
          {completedCount}/{missions.length}
        </span>
      </div>

      <ul className="space-y-3">
        {missions.map((mission) => {
          const isCompleted = mission.status === 'completed' || mission.status === 'claimed'

          return (
            <li key={mission.id} className="flex items-start gap-3">
              {isCompleted ? (
                <CheckCircle2Icon className="size-5 mt-0.5 text-(--color-success) shrink-0" />
              ) : (
                <CircleIcon className="size-5 mt-0.5 text-(--color-text-muted) shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCompleted
                        ? 'text-(--color-text-muted) line-through'
                        : 'text-(--color-text-primary)',
                    )}
                  >
                    {mission.title}
                  </p>
                  <span className="text-mono text-[11px] text-(--color-text-muted) shrink-0">
                    {mission.progress}/{mission.target}
                  </span>
                </div>
                <p
                  className={cn(
                    'text-xs mt-0.5',
                    isCompleted ? 'text-(--color-text-ghost)' : 'text-(--color-text-secondary)',
                  )}
                >
                  {mission.description}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      {completedCount === missions.length && missions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-sm text-(--color-success)">
            ¡Misiones completas! Sigue tu sobre de recompensa.
          </p>
        </div>
      )}
    </div>
  )
}
