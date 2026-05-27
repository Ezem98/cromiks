'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { BadgeWithStatus } from '../queries'
import { BadgeIcon } from './badge-icon'
import { BadgesSheet } from './badges-sheet'

/**
 * Grid resumen de badges para embeber en el perfil. Muestra hasta
 * `maxVisible` badges (priorizando unlocked + pinned) y, si hay más,
 * un botón "Ver todas" que abre el sheet con el listado completo.
 *
 * Si el user no tiene NINGUNA badge desbloqueada, muestra empty state
 * sutil con copy distinto si es el dueño vs visitor.
 */

type BadgesGridProps = {
  badges: BadgeWithStatus[]
  isOwner: boolean
  maxVisible?: number
}

export function BadgesGrid({ badges, isOwner, maxVisible = 6 }: BadgesGridProps) {
  const [open, setOpen] = useState(false)

  const unlocked = badges.filter((b) => b.unlockedAt)
  const locked = badges.filter((b) => !b.unlockedAt)
  const unlockedCount = unlocked.length
  const total = badges.length

  // Sort: pinned primero, después por unlocked_at desc, después por display_order
  const sortedUnlocked = [...unlocked].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (a.unlockedAt && b.unlockedAt) {
      return b.unlockedAt.localeCompare(a.unlockedAt)
    }
    return a.displayOrder - b.displayOrder
  })

  const sortedLocked = [...locked].sort((a, b) => a.displayOrder - b.displayOrder)
  const visible = [...sortedUnlocked, ...sortedLocked].slice(0, maxVisible)
  const hasMore = badges.length > maxVisible

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-display text-xl text-(--color-text-primary)">Logros</h2>
        <span className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          {unlockedCount} / {total}
        </span>
      </div>

      {unlockedCount === 0 && !isOwner ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 sm:gap-4">
            {visible.map((badge) => (
              <BadgeTile key={badge.id} badge={badge} />
            ))}
          </div>

          {(hasMore || unlockedCount === 0) && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                'text-mono text-[11px] uppercase tracking-[0.15em]',
                'text-(--color-argentina-glow) hover:text-(--color-text-primary)',
                'transition-colors',
              )}
            >
              Ver todos los logros →
            </button>
          )}
        </>
      )}

      <BadgesSheet badges={badges} open={open} onOpenChange={setOpen} />
    </section>
  )
}

function BadgeTile({ badge }: { badge: BadgeWithStatus }) {
  const unlocked = !!badge.unlockedAt
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      title={`${badge.name}${unlocked ? '' : ' · bloqueado'}`}
    >
      <BadgeIcon iconName={badge.iconName} rarity={badge.rarity} unlocked={unlocked} size="sm" />
      <span
        className={cn(
          'text-[10px] leading-tight text-center line-clamp-2',
          unlocked ? 'text-(--color-text-secondary)' : 'text-(--color-text-muted)',
        )}
      >
        {badge.name}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <p className="text-(--color-text-secondary) text-sm">
      Este álbum todavía no desbloqueó ningún logro.
    </p>
  )
}
