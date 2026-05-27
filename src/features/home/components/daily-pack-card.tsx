'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Sobre } from '@/components/domain/sobre'
import { Button } from '@/components/ui/button'
import { claimDailyPack } from '@/features/home/actions'
import { errorCopy } from '@/lib/errors'

/**
 * Card del sobre diario.
 *
 * 3 estados:
 *  - canClaim: muestra "Reclamar sobre diario" + sobre flotando
 *  - hasPending: muestra "Abrir sobre" → linkea a /open/[packId]
 *  - waitingNext: muestra countdown a próxima medianoche AR
 */

type DailyPackCardProps =
  | {
      mode: 'canClaim'
      currentStreak: number
    }
  | {
      mode: 'hasPending'
      packId: string
      currentStreak: number
    }
  | {
      mode: 'waitingNext'
      nextClaimAt: string
      currentStreak: number
    }

export function DailyPackCard(props: DailyPackCardProps) {
  if (props.mode === 'canClaim') {
    return <ClaimMode currentStreak={props.currentStreak} />
  }
  if (props.mode === 'hasPending') {
    return <PendingMode packId={props.packId} currentStreak={props.currentStreak} />
  }
  return <WaitingMode nextClaimAt={props.nextClaimAt} currentStreak={props.currentStreak} />
}

function ClaimMode({ currentStreak }: { currentStreak: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClaim = () => {
    startTransition(async () => {
      const result = await claimDailyPack()
      if (!result.ok) {
        toast.error('No pudimos darte el sobre', {
          description: errorCopy(result.code),
        })
        return
      }
      toast.success('Sobre desbloqueado', {
        description: 'Listo para abrir.',
      })
      router.push(`/open/${result.data.packId}`)
    })
  }

  return (
    <Card>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
        <div className="shrink-0">
          <Sobre type="daily" state="closed" size="md" showTypeLabel={false} />
        </div>

        <div className="flex-1 flex flex-col text-center sm:text-left sm:py-2">
          <div className="flex-1">
            <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold) mb-1">
              {currentStreak > 0 ? `Día ${currentStreak + 1} de tu racha` : 'Sobre diario'}
            </p>
            <h2 className="text-display text-3xl leading-[0.95]">Tu sobre de hoy te espera</h2>
            <p className="text-(--color-text-secondary) text-sm mt-2 max-w-md">
              4 cromos del Mundial. Puede caer una Legendaria. Si volvés mañana, sumás un día a la
              racha.
            </p>
          </div>

          <div className="mt-4 sm:mt-0">
            <Button variant="primary" size="lg" onClick={handleClaim} disabled={isPending}>
              {isPending ? 'Reclamando...' : 'Reclamar sobre diario'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function PendingMode({ packId, currentStreak }: { packId: string; currentStreak: number }) {
  const router = useRouter()

  return (
    <Card>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
        <div className="shrink-0">
          <Sobre type="daily" state="closed" size="md" showTypeLabel={false} />
        </div>

        <div className="flex-1 flex flex-col text-center sm:text-left sm:py-2">
          <div className="flex-1">
            <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold) mb-1">
              {currentStreak > 0 ? `Día ${currentStreak} de tu racha` : 'Sobre listo'}
            </p>
            <h2 className="text-display text-3xl leading-[0.95]">Tu sobre ya está listo</h2>
            <p className="text-(--color-text-secondary) text-sm mt-2 max-w-md">
              4 cromos del Mundial te están esperando. Hacé click para abrirlo.
            </p>
          </div>

          <div className="mt-4 sm:mt-0">
            <Button variant="primary" size="lg" onClick={() => router.push(`/open/${packId}`)}>
              Abrir sobre
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function WaitingMode({
  nextClaimAt,
  currentStreak,
}: {
  nextClaimAt: string
  currentStreak: number
}) {
  const [timeLeft, setTimeLeft] = useState<string>(getTimeUntil(nextClaimAt))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntil(nextClaimAt))
    }, 1000 * 30) // Update cada 30s, no más
    return () => clearInterval(timer)
  }, [nextClaimAt])

  return (
    <Card>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <div className="opacity-50">
          <Sobre type="daily" state="opened" size="md" showTypeLabel={false} />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-3 sm:pb-2">
          <div>
            <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-1">
              Ya reclamaste hoy
            </p>
            <h2 className="text-display text-3xl leading-[0.95]">Volvé mañana</h2>
            <p className="text-(--color-text-secondary) text-sm mt-2">
              Tu próximo sobre llega en{' '}
              <span className="text-(--color-argentina-glow) font-medium">{timeLeft}</span>.
            </p>
            {currentStreak > 0 && (
              <p className="text-(--color-text-muted) text-sm mt-1">
                Tenés una racha de{' '}
                <span className="text-(--color-gold) font-medium">{currentStreak} días</span> — no
                la cortes.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6 sm:p-8">
      {children}
    </div>
  )
}

function getTimeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'ya'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
