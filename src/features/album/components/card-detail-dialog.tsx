'use client'

import { CoinsIcon, Share2Icon, SparklesIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Cromo } from '@/components/domain/cromo'
import { useCoinsBalance } from '@/components/layout/coins-balance-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ShareSheet } from '@/features/sharing/components/share-sheet'
import { errorCopy } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { dismantleCard, pinCard, unpinCard } from '../actions'
import type { AlbumCardSlot } from '../queries'

/**
 * Modal de detalle del cromo.
 *
 * Layout:
 *  - Cromo grande al top (size="md", para que entre cómodo en mobile)
 *  - Info: nombre, posición/club, tier badge
 *  - Descripción del cromo (de `cards.description`)
 *  - Para legendaries: brief del momento histórico
 *  - Stats personales: copies, primera obtenido
 *  - Acciones: Pin/Unpin · Canjear extra · Compartir
 *
 * El modal funciona para owned y missing:
 *  - Owned: muestra todo + acciones disponibles
 *  - Missing: muestra el cromo con su silueta + número + tier + descripción.
 *    "Aún no tenés este cromo" como mensaje. Sin acciones.
 *
 * Coin rewards por rarity (matchea _coin_reward_for_rarity en SQL):
 *   common = 1, uncommon = 3, rare = 8, epic = 20, legendary = 0
 */

type CardDetailDialogProps = {
  card: AlbumCardSlot | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Username del user logueado, para attribution en shares. Opcional. */
  username?: string | null
}

const tierLabels: Record<AlbumCardSlot['tier'], string> = {
  common: 'Común',
  uncommon: 'Inusual',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Legendaria',
}

const tierColors: Record<AlbumCardSlot['tier'], string> = {
  common: 'text-(--color-tier-common)',
  uncommon: 'text-(--color-tier-uncommon)',
  rare: 'text-(--color-tier-rare)',
  epic: 'text-(--color-tier-epic)',
  legendary: 'text-(--color-gold)',
}

const coinReward: Record<AlbumCardSlot['tier'], number> = {
  common: 1,
  uncommon: 3,
  rare: 8,
  epic: 20,
  legendary: 0,
}

export function CardDetailDialog({ card, open, onOpenChange, username }: CardDetailDialogProps) {
  // Si el card es null cuando el dialog está cerrado, no renderea nada.
  // Pero mantenemos el componente montado para que las animaciones de close
  // tengan tiempo de correr antes de unmount.
  if (!card) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Override del max-w default para que sea más ancho en desktop
          'bg-(--color-surface-deep) border-white/[0.08]',
          'max-w-md sm:max-w-lg',
          'max-h-[90vh] overflow-y-auto',
          'p-0',
        )}
      >
        {/* DialogTitle es requerido por accesibilidad (radix lo enforce) */}
        <DialogTitle className="sr-only">
          {card.name}, cromo {card.cardNumber}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Detalle del cromo {card.cardNumber} del álbum
        </DialogDescription>

        {/* Header con cromo */}
        <CardDetailHeader card={card} />

        {/* Body con info + acciones */}
        <div className="px-6 pb-6 space-y-5">
          <CardInfo card={card} />

          {card.description && <CardDescription text={card.description} />}

          {card.legendaryBrief && card.tier === 'legendary' && (
            <LegendaryBrief brief={card.legendaryBrief} />
          )}

          {card.owned ? (
            <>
              <OwnershipStats copies={card.copies} firstObtainedAt={card.firstObtainedAt} />
              <CardActions card={card} username={username} />
            </>
          ) : (
            <MissingState tier={card.tier} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Header del modal — cromo grande con background tier-coded.
 */
function CardDetailHeader({ card }: { card: AlbumCardSlot }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center pt-10 pb-6 px-6',
        // Sutil radial bg detrás del cromo, tier-coded
        card.tier === 'legendary' &&
          'bg-[radial-gradient(ellipse_at_center,rgba(212,169,60,0.15)_0%,transparent_70%)]',
        card.tier === 'epic' &&
          'bg-[radial-gradient(ellipse_at_center,rgba(185,127,227,0.12)_0%,transparent_70%)]',
        card.tier === 'rare' &&
          'bg-[radial-gradient(ellipse_at_center,rgba(91,163,224,0.12)_0%,transparent_70%)]',
        card.tier === 'uncommon' &&
          'bg-[radial-gradient(ellipse_at_center,rgba(212,169,60,0.08)_0%,transparent_70%)]',
      )}
    >
      <Cromo
        tier={card.tier}
        name={card.name}
        playerRole={card.playerRole ?? undefined}
        number={card.number ?? undefined}
        seed={card.id}
        imageUrl={card.imageUrl ?? undefined}
        size="md"
        // Si el cromo no es owned, lo bajamos en opacity para indicar "silueta"
        className={cn(!card.owned && 'opacity-40 saturate-50')}
      />
    </div>
  )
}

/**
 * Bloque de info principal: número, nombre, tier badge.
 */
function CardInfo({ card }: { card: AlbumCardSlot }) {
  return (
    <div className="space-y-1 text-center">
      <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-(--color-text-muted)">
        Cromo #{card.cardNumber}
      </p>
      <h2 className="text-display text-2xl text-(--color-text-primary) leading-tight">
        {card.name}
      </h2>
      {card.playerRole && (
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-secondary)">
          {card.playerRole}
        </p>
      )}
      <div className="pt-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
            'text-mono text-[10px] uppercase tracking-[0.15em]',
            'bg-(--color-surface-raised) border border-white/[0.08]',
            tierColors[card.tier],
          )}
        >
          {card.tier === 'legendary' && <SparklesIcon className="size-3" />}
          {tierLabels[card.tier]}
        </span>
      </div>
    </div>
  )
}

/**
 * Descripción del cromo (de `cards.description`).
 */
function CardDescription({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-(--color-surface-raised)/60 border border-white/[0.05] p-4">
      <p className="text-(--color-text-secondary) text-sm leading-relaxed">{text}</p>
    </div>
  )
}

/**
 * Brief especial para legendaries. El shape del jsonb puede variar — hacemos
 * parsing defensivo.
 *
 * Campos esperables (todos opcionales):
 *  - minute: string | number (minuto del partido)
 *  - match: string (ej: "Argentina vs Francia")
 *  - stadium: string
 *  - moment: string (descripción del momento)
 *  - date: string (ISO o human)
 */
function LegendaryBrief({ brief }: { brief: Record<string, unknown> }) {
  const minute =
    typeof brief.minute === 'string' || typeof brief.minute === 'number'
      ? String(brief.minute)
      : null
  const match = typeof brief.match === 'string' ? brief.match : null
  const stadium = typeof brief.stadium === 'string' ? brief.stadium : null
  const moment = typeof brief.moment === 'string' ? brief.moment : null
  const date = typeof brief.date === 'string' ? brief.date : null

  // Si todos los campos son null, no rendereamos nada
  if (!minute && !match && !stadium && !moment && !date) return null

  return (
    <div
      className={cn(
        'rounded-md p-4 space-y-2',
        'bg-[linear-gradient(135deg,rgba(212,169,60,0.08)_0%,rgba(212,169,60,0.02)_100%)]',
        'border border-(--color-gold)/20',
      )}
    >
      <p className="text-mono text-[10px] uppercase tracking-[0.2em] text-(--color-gold)">
        El momento
      </p>
      <div className="space-y-1">
        {moment && <p className="text-(--color-text-primary) text-sm leading-relaxed">{moment}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-mono text-[11px] text-(--color-text-secondary) pt-1">
          {match && <span>{match}</span>}
          {minute && <span>· min {minute}</span>}
          {stadium && <span>· {stadium}</span>}
          {date && <span>· {date}</span>}
        </div>
      </div>
    </div>
  )
}

/**
 * Stats personales del user para esta carta.
 */
function OwnershipStats({
  copies,
  firstObtainedAt,
}: {
  copies: number
  firstObtainedAt: string | null
}) {
  const firstDate = firstObtainedAt ? formatDate(firstObtainedAt) : null
  const extraCopies = copies - 1 // copies totales - 1 (que mantiene el slot del álbum)

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-md bg-(--color-surface-raised)/60 border border-white/[0.05]">
      <div>
        <p className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          En tu álbum
        </p>
        <p className="text-display text-lg text-(--color-text-primary) leading-tight mt-0.5">
          {copies}
          {copies > 1 && (
            <span className="text-(--color-text-muted) text-sm font-normal ml-1">
              · {extraCopies} extra
            </span>
          )}
        </p>
      </div>
      {firstDate && (
        <div className="text-right">
          <p className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
            Desde
          </p>
          <p className="text-(--color-text-secondary) text-sm mt-0.5">{firstDate}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Footer con botones de acción.
 *
 * Acciones:
 *  - Pin/Unpin (siempre disponible si owned)
 *  - Canjear extra (solo si copies > 1 y tier ≠ legendary)
 *  - Compartir (placeholder, viene en E3)
 */
function CardActions({ card, username }: { card: AlbumCardSlot; username?: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [isPinnedLocal, setIsPinnedLocal] = useState(card.isPinned)
  const [copiesLocal, setCopiesLocal] = useState(card.copies)
  const [shareOpen, setShareOpen] = useState(false)
  const [dismantleConfirmOpen, setDismantleConfirmOpen] = useState(false)
  const coinsCtx = useCoinsBalance()

  const canDismantle = copiesLocal > 1 && card.tier !== 'legendary'
  const reward = coinReward[card.tier]

  const handlePinToggle = () => {
    const wasPinned = isPinnedLocal
    // Optimistic update
    setIsPinnedLocal(!wasPinned)

    startTransition(async () => {
      // tier se manda solo como prop de analytics — el RPC no lo usa, viene del
      // client para evitar un round-trip extra a la DB.
      const result = wasPinned
        ? await unpinCard({ cardId: card.id, tier: card.tier })
        : await pinCard({ cardId: card.id, tier: card.tier })
      if (!result.ok) {
        // Rollback
        setIsPinnedLocal(wasPinned)
        toast.error(errorCopy(result.code))
      } else {
        toast.success(wasPinned ? 'Despineada' : 'Destacada en tu perfil')
      }
    })
  }

  const handleDismantleRequest = () => {
    setDismantleConfirmOpen(true)
  }

  const handleDismantleConfirm = () => {
    setDismantleConfirmOpen(false)
    startTransition(async () => {
      const result = await dismantleCard({ cardId: card.id, count: 1 })
      if (!result.ok) {
        toast.error(errorCopy(result.code))
        return
      }
      setCopiesLocal(result.data.copiesLeft)
      // Optimistic update del balance en el navbar (B-09). Sin esto, el user
      // ve el balance viejo hasta el próximo re-render del SC.
      coinsCtx?.setBalance(result.data.newBalance)
      toast.success(`+${result.data.coinsEarned} monedas`, {
        description: `Te quedan ${result.data.copiesLeft - 1} copias extra de ${card.name}`,
      })
    })
  }

  const handleShare = () => {
    setShareOpen(true)
  }

  return (
    <>
      <div className="grid gap-2">
        <Button
          variant={isPinnedLocal ? 'primary' : 'ghost'}
          onClick={handlePinToggle}
          disabled={isPending}
          className="w-full"
        >
          <PinIcon className="size-4 mr-1.5" />
          {isPinnedLocal ? 'Destacada' : 'Destacar en mi perfil'}
        </Button>

        {canDismantle && (
          <Button
            variant="ghost"
            onClick={handleDismantleRequest}
            disabled={isPending}
            className="w-full"
          >
            <CoinsIcon className="size-4 mr-1.5" />
            Canjear 1 copia por {reward}
            <span className="text-(--color-gold) ml-0.5">●</span>
          </Button>
        )}

        <Button variant="ghost" onClick={handleShare} className="w-full">
          <Share2Icon className="size-4 mr-1.5" />
          Compartir
        </Button>
      </div>

      {/* Sheet de opciones de share — se abre al clickear Compartir */}
      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        cardId={card.id}
        cardName={card.name}
        username={username}
      />

      {/* Confirmación destructiva del dismantle. Sin esto un mis-tap canjeaba la
          copia silenciosamente (B-02). */}
      <Dialog open={dismantleConfirmOpen} onOpenChange={setDismantleConfirmOpen}>
        <DialogContent className={cn('bg-(--color-surface-deep) border-white/[0.08]', 'max-w-sm')}>
          <DialogHeader>
            <DialogTitle className="text-(--color-text-primary)">¿Canjear esta copia?</DialogTitle>
            <DialogDescription className="text-(--color-text-secondary)">
              Vas a canjear 1 copia de <strong>{card.name}</strong> por{' '}
              <span className="text-(--color-gold)">{reward}</span> monedas. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDismantleConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleDismantleConfirm} disabled={isPending}>
              Sí, canjear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Estado del modal cuando el cromo NO está en el álbum del user.
 */
function MissingState({ tier }: { tier: AlbumCardSlot['tier'] }) {
  const tierName = tierLabels[tier].toLowerCase()
  return (
    <div className="rounded-md bg-(--color-surface-raised)/40 border border-dashed border-white/[0.08] p-4 text-center space-y-1">
      <p className="text-(--color-text-primary) text-sm font-medium">Aún no tenés este cromo</p>
      <p className="text-(--color-text-muted) text-xs">
        Es una carta {tierName}. Abrí más sobres para conseguirla.
      </p>
    </div>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2L13.5 8.5L20 9L15 13L16.5 19.5L12 16L7.5 19.5L9 13L4 9L10.5 8.5L12 2Z" />
    </svg>
  )
}

/**
 * Formatea una fecha ISO a "DD MMM YYYY" en español.
 */
function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}
