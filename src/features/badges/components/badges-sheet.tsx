'use client'

import { LockIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { BadgeCategory, BadgeWithStatus } from '../queries'
import { BadgeIcon } from './badge-icon'

/**
 * Sheet con TODAS las badges, agrupadas por categoría. Cada item muestra:
 *  - Icon + nombre + descripción
 *  - Si unlocked: fecha de unlock
 *  - Si locked: barra de progress (cuando aplica) o "Próximamente" para
 *    badges con feature todavía no implementada (referrals).
 *
 * Pensado para mostrarse desde el perfil cuando hay más badges que el grid
 * en pantalla. Side: bottom en mobile-first.
 */

type BadgesSheetProps = {
  badges: BadgeWithStatus[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categoryLabels: Record<BadgeCategory, string> = {
  progress: 'Progreso',
  rarity: 'Rareza',
  engagement: 'Engagement',
  social: 'Social',
}

const categoryOrder: BadgeCategory[] = ['progress', 'rarity', 'engagement', 'social']

export function BadgesSheet({ badges, open, onOpenChange }: BadgesSheetProps) {
  const grouped = groupByCategory(badges)
  const unlockedCount = badges.filter((b) => b.unlockedAt).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] bg-(--color-surface-deep) text-(--color-text-primary) border-t border-white/[0.08] overflow-y-auto"
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-display text-2xl text-(--color-text-primary)">
            Logros
          </SheetTitle>
          <SheetDescription className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
            {unlockedCount} de {badges.length} desbloqueados
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-10 pt-4 space-y-8">
          {categoryOrder.map((category) => {
            const items = grouped[category]
            if (!items || items.length === 0) return null

            return (
              <section key={category} className="space-y-3">
                <h3 className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
                  {categoryLabels[category]}
                </h3>
                <ul className="space-y-2">
                  {items.map((badge) => (
                    <BadgeRow key={badge.id} badge={badge} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function BadgeRow({ badge }: { badge: BadgeWithStatus }) {
  const unlocked = !!badge.unlockedAt

  return (
    <li
      className={cn(
        'flex items-start gap-4 rounded-[14px] p-4',
        'bg-(--color-surface-raised) border border-white/[0.06]',
        unlocked && 'border-white/[0.12]',
      )}
    >
      <BadgeIcon iconName={badge.iconName} rarity={badge.rarity} unlocked={unlocked} size="md" />

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h4
            className={cn(
              'text-display text-base leading-tight',
              unlocked ? 'text-(--color-text-primary)' : 'text-(--color-text-secondary)',
            )}
          >
            {badge.name}
          </h4>
          {!unlocked && !badge.notImplemented && (
            <LockIcon className="size-3 text-(--color-text-muted)" />
          )}
          {badge.notImplemented && (
            <span className="text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted) px-1.5 py-0.5 border border-white/[0.08] rounded">
              Próximamente
            </span>
          )}
        </div>

        <p className="text-sm text-(--color-text-secondary) leading-relaxed">{badge.description}</p>

        {unlocked ? (
          <p className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-gold)">
            Desbloqueado {formatDate(badge.unlockedAt)}
          </p>
        ) : badge.progress && !badge.notImplemented ? (
          <ProgressLine current={badge.progress.current} target={badge.progress.target} />
        ) : null}
      </div>
    </li>
  )
}

function ProgressLine({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const isBinary = target === 1
  return (
    <div className="space-y-1 pt-1">
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full bg-(--color-argentina-glow)/60 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
        {isBinary ? (current >= 1 ? 'Casi' : 'Bloqueado') : `${current} / ${target}`}
      </p>
    </div>
  )
}

function groupByCategory(
  badges: BadgeWithStatus[],
): Partial<Record<BadgeCategory, BadgeWithStatus[]>> {
  const out: Partial<Record<BadgeCategory, BadgeWithStatus[]>> = {}
  for (const b of badges) {
    let bucket = out[b.category]
    if (!bucket) {
      bucket = []
      out[b.category] = bucket
    }
    bucket.push(b)
  }
  return out
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}
