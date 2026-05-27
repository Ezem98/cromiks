'use client'

import { CheckCircle2Icon, CircleIcon, CoinsIcon, GiftIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { claimMission } from '@/features/missions/actions'
import type { MissionWithReward } from '@/features/missions/queries'
import { errorCopy } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * Card de misiones del día.
 *
 * Muestra hasta N misiones activas + completed del user con:
 *  - Estado visual (circle vacío / check filled)
 *  - Progress (X/Y)
 *  - Reward icon (monedas + pack)
 *  - Botón "Reclamar" si está completed pero no claimed
 *
 * Las misiones se completan **automáticamente** cuando el user hace la acción
 * correspondiente (abre sobres, pinea, etc). El user NO completa misiones a mano.
 * Lo que sí hace a mano: clickear "Reclamar" para obtener el reward.
 *
 * Optimistic update: al clickear claim, removemos visualmente el botón
 * inmediatamente. Si falla, rollback (toast de error).
 */

type MissionsCardProps = {
  missions: MissionWithReward[]
}

export function MissionsCard({ missions }: MissionsCardProps) {
  // Track de misiones que el user ya claimed en esta sesión, para hide del UI
  // sin esperar revalidación (optimistic)
  const [claimedLocally, setClaimedLocally] = useState<Set<string>>(new Set())

  // Filtramos las que el user ya claimed localmente
  const visibleMissions = missions.filter((m) => !claimedLocally.has(m.id))

  if (visibleMissions.length === 0) {
    return (
      <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-3">
          Misiones del día
        </p>
        {missions.length === 0 ? (
          <p className="text-(--color-text-secondary) text-sm">
            Asignando misiones... vuelvé a cargar la página en un instante.
          </p>
        ) : (
          <p className="text-(--color-text-secondary) text-sm">
            ¡Reclamaste todas tus misiones del día! Volvé mañana por más.
          </p>
        )}
      </div>
    )
  }

  const completedCount = visibleMissions.filter(
    (m) => m.status === 'completed' || m.status === 'claimed',
  ).length

  return (
    <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          Misiones del día
        </p>
        <span className="text-mono text-[11px] text-(--color-gold)">
          {completedCount}/{visibleMissions.length}
        </span>
      </div>

      <ul className="space-y-3">
        {visibleMissions.map((mission) => (
          <MissionRow
            key={mission.id}
            mission={mission}
            onClaimed={() => {
              setClaimedLocally((prev) => {
                const next = new Set(prev)
                next.add(mission.id)
                return next
              })
            }}
          />
        ))}
      </ul>

      {completedCount === visibleMissions.length && visibleMissions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-sm text-(--color-argentina-glow)">
            ¡Todas listas! Reclamá los rewards para sumar.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Una fila de misión.
 *
 * Estados visibles:
 *  - active: circle vacío, progress visible, sin botón
 *  - completed: check, progress full, botón "Reclamar"
 *  - claimed: tachado (transitorio, antes de hide via optimistic update)
 *  - expired: tachado en gris (no debería verse — el query filtra)
 */
function MissionRow({ mission, onClaimed }: { mission: MissionWithReward; onClaimed: () => void }) {
  const [isPending, startTransition] = useTransition()

  const isCompleted = mission.status === 'completed'
  const isClaimed = mission.status === 'claimed'
  const isClaimable = isCompleted

  const handleClaim = () => {
    startTransition(async () => {
      const result = await claimMission({ userMissionId: mission.id })
      if (!result.ok) {
        toast.error(errorCopy(result.code))
        return
      }

      // Toast con el reward
      const parts: string[] = []
      if (result.data.coinsEarned > 0) parts.push(`+${result.data.coinsEarned} monedas`)
      if (result.data.packId) parts.push(`+1 sobre con ${result.data.cardsEarned} cromos`)

      toast.success('Reward reclamado', {
        description: parts.join(' · ') || 'Reward aplicado',
      })

      // Optimistic hide
      onClaimed()
    })
  }

  return (
    <li className="flex items-start gap-3">
      {isCompleted || isClaimed ? (
        <CheckCircle2Icon className="size-5 mt-0.5 text-(--color-argentina-glow) shrink-0" />
      ) : (
        <CircleIcon className="size-5 mt-0.5 text-(--color-text-muted) shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium',
              isClaimed ? 'text-(--color-text-muted) line-through' : 'text-(--color-text-primary)',
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
            isClaimed ? 'text-(--color-text-ghost)' : 'text-(--color-text-secondary)',
          )}
        >
          {mission.description}
        </p>

        {/* Reward + botón claim */}
        <div className="flex items-center gap-3 mt-2">
          <RewardBadges reward={mission.reward} />

          {isClaimable && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleClaim}
              disabled={isPending}
              className="ml-auto h-7 text-xs px-3"
            >
              {isPending ? 'Reclamando…' : 'Reclamar'}
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * Badges visuales del reward que da la misión.
 *
 * Muestra:
 *  - Moneda + cantidad si reward.coins > 0
 *  - Sobre + cantidad si reward.packType definido
 */
function RewardBadges({ reward }: { reward: MissionWithReward['reward'] }) {
  const hasCoins = reward.coins !== null && reward.coins > 0
  const hasPack = !!reward.packType

  if (!hasCoins && !hasPack) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasCoins && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
            'bg-(--color-gold)/10 border border-(--color-gold)/20',
            'text-mono text-[10px] text-(--color-gold)',
          )}
          title={`Te da ${reward.coins} monedas al reclamar`}
        >
          <CoinsIcon className="size-3" />
          {reward.coins}
        </span>
      )}
      {hasPack && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
            'bg-(--color-argentina-glow)/10 border border-(--color-argentina-glow)/20',
            'text-mono text-[10px] text-(--color-argentina-glow)',
          )}
          title={`Te da un sobre de ${reward.cardCount ?? '?'} cromos al reclamar`}
        >
          <GiftIcon className="size-3" />
          {reward.cardCount ?? ''} cromos
        </span>
      )}
    </div>
  )
}
