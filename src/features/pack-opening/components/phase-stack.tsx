'use client'

import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Cromo } from '@/components/domain/cromo'
import { TierLabel } from '@/components/domain/tier-label'
import { Button } from '@/components/ui/button'
import { vibrate } from '@/lib/haptics'
import { useRenderTier } from '@/lib/hooks/use-render-tier'
import { cn } from '@/lib/utils'
import { type RevealedCard, type Tier, tierRank } from '../types'

// Lazy load del 3D scene de la card — solo se carga cuando se reveal
const CardScene3D = dynamic(() => import('./3d/card-scene').then((mod) => mod.CardScene3D), {
  ssr: false,
})

/**
 * Fase 3 — Stack (pila de cartas + reveal con peek).
 *
 * Sub-estados internos:
 *  - 'stack': pila visible al centro, top card swipeable
 *  - 'revealed': stack chiquito en esquina inferior izq con counter,
 *               card revelada grande al centro + botón Siguiente
 *
 * Flow:
 *  1. User swipea lateral la top card (>= threshold)
 *  2. Card vuela del stack al centro, hace flip 3D + tier burst
 *  3. Stack se hace chiquito en esquina, aparece info + botón "Siguiente"
 *  4. User clickea botón (o tap anywhere) → card revelada se va abajo,
 *     stack vuelve al centro con la próxima top card como swipeable
 *  5. Si era la última card → onCardReveal() llama a la lógica del orquestador
 *     que avanza a summary
 */

type PhaseStackProps = {
  cards: RevealedCard[]
  cardsRevealed: number
  onCardReveal: () => void
}

const SWIPE_THRESHOLD = 100
const STACK_OFFSET = 4
const CARD_WIDTH = 240
const CARD_HEIGHT = 320

/**
 * Vibración por card revelada, escalada por rareza. Más suave que el tear
 * (es por card, se repite N veces); mejor rareza = tick más marcado.
 */
const REVEAL_HAPTICS: Record<number, number | number[]> = {
  0: 15,
  1: 20,
  2: 30,
  3: [0, 30, 20, 30],
  4: [0, 40, 25, 40, 25, 50],
}

type InternalState = 'stack' | 'revealed'

export function PhaseStack({ cards, cardsRevealed, onCardReveal }: PhaseStackProps) {
  // Sub-estado interno: stack (swipe activo) vs revealed (card al centro)
  const [internalState, setInternalState] = useState<InternalState>('stack')

  const remaining = cards.length - cardsRevealed

  if (remaining === 0) {
    return null
  }

  // Card actualmente en revealed
  const revealedCard = cards[cardsRevealed]
  // Stack restante (cards aún no reveladas, top = la próxima a swipear)
  const cardsInStack = cards.slice(cardsRevealed)

  const handleSwipeComplete = () => {
    // Cuando el swipe se completa, pasamos al estado revealed
    setInternalState('revealed')
  }

  const handleContinue = () => {
    // Notificar al orquestador que avanzamos al próximo (incrementa cardsRevealed)
    onCardReveal()
    // Volver al estado stack para la próxima card
    setInternalState('stack')
  }

  return (
    <motion.div
      key="stack"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 select-none"
    >
      <AnimatePresence mode="wait">
        {internalState === 'stack' && (
          <StackView
            key={`stack-${cardsRevealed}`}
            cardsInStack={cardsInStack}
            cardsRevealed={cardsRevealed}
            totalCards={cards.length}
            onSwipeComplete={handleSwipeComplete}
          />
        )}

        {internalState === 'revealed' && (
          <RevealedView
            key={`revealed-${cardsRevealed}`}
            revealedCard={revealedCard}
            remaining={remaining}
            totalCards={cards.length}
            onContinue={handleContinue}
            isLast={cardsRevealed === cards.length - 1}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* =========================================================================
   STACK VIEW — pila al centro, top card swipeable
   ========================================================================= */

function StackView({
  cardsInStack,
  cardsRevealed,
  totalCards,
  onSwipeComplete,
}: {
  cardsInStack: RevealedCard[]
  cardsRevealed: number
  totalCards: number
  onSwipeComplete: () => void
}) {
  const remaining = cardsInStack.length

  return (
    <motion.div
      key="stack-view"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Counter */}
      <div className="text-mono text-[11px] uppercase tracking-[0.2em] text-(--color-text-muted)">
        {cardsRevealed + 1} de {totalCards}
      </div>

      {/* Stack */}
      <div
        className="relative"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT + STACK_OFFSET * 3 }}
      >
        {cardsInStack
          .slice()
          .reverse()
          .map((card, reverseIdx) => {
            const stackIdx = cardsInStack.length - 1 - reverseIdx
            const isTopCard = stackIdx === 0

            const yOffset = stackIdx * STACK_OFFSET
            const opacity = 1 - stackIdx * 0.12
            const scale = 1 - stackIdx * 0.02

            if (isTopCard) {
              return <SwipeableTopCard key={card.cardId} onSwipeComplete={onSwipeComplete} />
            }

            return (
              <div
                key={card.cardId}
                className="absolute inset-0 rounded-[16px] overflow-hidden border border-white/10"
                style={{
                  transform: `translateY(${yOffset}px) scale(${scale})`,
                  opacity,
                  background:
                    'linear-gradient(180deg, #1a1f28 0%, #0f131a 100%), repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 8px)',
                  boxShadow: `0 ${4 + stackIdx * 2}px ${20 + stackIdx * 4}px rgba(0,0,0,0.4)`,
                  zIndex: 10 - stackIdx,
                }}
              >
                <CardBack />
              </div>
            )
          })}
      </div>

      {/* Hint */}
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        className="text-mono text-[11px] uppercase tracking-[0.2em] text-(--color-text-muted) flex items-center gap-3"
      >
        <span>← deslizá lateral →</span>
      </motion.div>

      {remaining === 1 && (
        <p className="text-mono text-[11px] uppercase tracking-[0.2em] text-(--color-gold)">
          Última
        </p>
      )}
    </motion.div>
  )
}

/* =========================================================================
   SWIPEABLE TOP CARD — la card de arriba del stack
   ========================================================================= */

function SwipeableTopCard({ onSwipeComplete }: { onSwipeComplete: () => void }) {
  const [isLeaving, setIsLeaving] = useState(false)
  const x = useMotionValue(0)

  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])
  const opacity = useTransform(x, [-300, -50, 0, 50, 300], [0.5, 1, 1, 1, 0.5])

  const handleDragEnd = () => {
    const xValue = x.get()
    if (Math.abs(xValue) >= SWIPE_THRESHOLD) {
      setIsLeaving(true)
      // Dispara el reveal después de la salida visual
      setTimeout(() => onSwipeComplete(), 300)
    } else {
      x.set(0)
    }
  }

  return (
    <motion.div
      drag={isLeaving ? false : 'x'}
      dragConstraints={{ left: -300, right: 300 }}
      dragElastic={0.4}
      onDragEnd={handleDragEnd}
      animate={
        isLeaving
          ? {
              x: x.get() > 0 ? 600 : -600,
              opacity: 0,
              transition: { duration: 0.3, ease: 'easeOut' },
            }
          : undefined
      }
      style={{
        x: isLeaving ? undefined : x,
        rotate: isLeaving ? undefined : rotate,
        opacity: isLeaving ? undefined : opacity,
        position: 'absolute',
        inset: 0,
        cursor: 'grab',
        touchAction: 'none',
        zIndex: 20,
      }}
      whileTap={{ cursor: 'grabbing' }}
    >
      <div
        className="size-full rounded-[16px] overflow-hidden border border-white/10"
        style={{
          background:
            'linear-gradient(180deg, #1a1f28 0%, #0f131a 100%), repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 8px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        }}
      >
        <CardBack />
      </div>
    </motion.div>
  )
}

/* =========================================================================
   REVEALED VIEW — card grande al centro, stack chiquito en esquina, CTA
   ========================================================================= */

function RevealedView({
  revealedCard,
  remaining,
  totalCards,
  onContinue,
  isLast,
}: {
  revealedCard: RevealedCard
  remaining: number
  totalCards: number
  onContinue: () => void
  isLast: boolean
}) {
  const { tier, degradeToLite } = useRenderTier()

  // Tick háptico al revelar la card, escalado por rareza. RevealedView se
  // re-montea por card (key en el AnimatePresence), así que corre una vez c/u.
  useEffect(() => {
    vibrate(REVEAL_HAPTICS[tierRank(revealedCard.tier)] ?? 15)
    // TODO(3.10): sonido del reveal por tier acá cuando exista el asset.
  }, [revealedCard.tier])

  // El "Siguiente" en la última card se reemplaza por el flow natural al summary
  const ctaText = isLast ? 'Ver resumen' : 'Siguiente'
  // Reveal de una Epic o Legendary = celebración → CTA en gold (DESIGN.md §11.1).
  const isCelebration = revealedCard.tier === 'epic' || revealedCard.tier === 'legendary'

  return (
    <motion.div
      key="revealed-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-6 w-full"
    >
      {/* Tier burst de fondo */}
      <TierBurst tier={revealedCard.tier} />

      {/* Card revelada al centro — 3D en tier full, CSS en tier lite */}
      {tier === 'lite' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{
            opacity: { duration: 0.3 },
            scale: { duration: 0.5, type: 'spring', stiffness: 150 },
            rotateY: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
          }}
          style={{ perspective: 1500 }}
          className="relative z-10"
        >
          <Cromo
            tier={revealedCard.tier}
            name={revealedCard.name}
            playerRole={revealedCard.playerRole}
            number={revealedCard.number}
            seed={revealedCard.seed}
            imageUrl={revealedCard.imageUrl ?? undefined}
            size="lg"
          />
        </motion.div>
      ) : (
        // Wrapper outer: solo opacity, sin scale animation.
        // Razon: el Canvas de R3F mide el parent una vez al mount. Si el parent
        // está a mid-scale (ej. 0.7) durante la spring, el canvas se queda con ese
        // tamaño "congelado" y la card aparece más chica. Sin scale, el container
        // tiene tamaño consistente desde frame 1.
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
          style={{
            width: 280,
            height: 380,
            // min-width/height fuerza el tamaño incluso si flex parent intenta achicar
            minWidth: 280,
            minHeight: 380,
          }}
        >
          <CardScene3D card={revealedCard} autoFlip onContextLost={degradeToLite} />
        </motion.div>
      )}

      {/* Info de la card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="flex flex-col items-center gap-2 z-10"
      >
        <TierLabel tier={revealedCard.tier} size="md" />
        {revealedCard.isNew ? (
          <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-argentina-glow)">
            ¡Nuevo!
          </span>
        ) : revealedCard.reward !== null ? (
          <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
            Repetida · +{revealedCard.reward} monedas
          </span>
        ) : null}
      </motion.div>

      {/* CTA Siguiente */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="z-10"
      >
        <Button variant={isCelebration ? 'gold' : 'primary'} size="lg" onClick={onContinue}>
          {ctaText}
        </Button>
      </motion.div>

      {/* Mini stack en esquina inferior izquierda */}
      {remaining > 1 && (
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="fixed bottom-6 left-6 z-20"
        >
          <MiniStack remaining={remaining - 1} totalCards={totalCards} />
        </motion.div>
      )}
    </motion.div>
  )
}

/**
 * Mini stack en la esquina — indicador visual de cuántas cards faltan.
 */
function MiniStack({ remaining, totalCards }: { remaining: number; totalCards: number }) {
  const visualCount = Math.min(remaining, 3)
  const revealed = totalCards - remaining

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: 36, height: 48 }}>
        {Array.from({ length: visualCount }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: position is identity
            key={i}
            className="absolute inset-0 rounded-[6px] border border-white/15"
            style={{
              transform: `translate(${i * 2}px, ${i * 2}px)`,
              background: 'linear-gradient(180deg, #1a1f28 0%, #0f131a 100%)',
              zIndex: 10 - i,
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-display text-[14px] leading-none text-(--color-gold) opacity-70">
                C
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col">
        <span className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          Quedan
        </span>
        <span className="text-display text-xl leading-none text-(--color-text-primary)">
          {remaining}
        </span>
        <span className="text-mono text-[10px] text-(--color-text-ghost)">
          de {totalCards} · ya {revealed}
        </span>
      </div>
    </div>
  )
}

/* =========================================================================
   TIER BURST — efectos visuales según rareza
   ========================================================================= */

function TierBurst({ tier }: { tier: Tier }) {
  if (tier === 'common') return null

  if (tier === 'uncommon') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0.2] }}
        transition={{ duration: 1.2 }}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(212,169,60,0.25) 0%, transparent 60%)',
        }}
      />
    )
  }

  if (tier === 'rare') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 0.5, 0.25], scale: [0, 1, 1.2] }}
        transition={{ duration: 1.2 }}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(91,163,224,0.4) 0%, transparent 50%)',
        }}
      />
    )
  }

  if (tier === 'epic') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.6, 0.3], scale: [0, 1.3, 1.5] }}
          transition={{ duration: 1.2 }}
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(185,127,227,0.5) 0%, transparent 55%)',
          }}
        />
        {Array.from({ length: 18 }).map((_, i) => {
          const angle = (i / 18) * Math.PI * 2
          const distance = 200 + Math.random() * 200
          return (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: position is identity
              key={i}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                opacity: 0,
                scale: 1,
              }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="fixed top-1/2 left-1/2 size-2 rounded-full pointer-events-none z-0"
              style={{
                background: 'rgba(185,127,227,1)',
                marginLeft: -4,
                marginTop: -4,
              }}
            />
          )
        })}
      </>
    )
  }

  // Legendary: prism + particles doradas + persiste
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0.4] }}
        transition={{ duration: 1.5 }}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'conic-gradient(from 0deg at 50% 50%, #ff70a6, #ffd96b, #6bb9ff, #b97fe3, #ff70a6)',
          filter: 'blur(80px)',
        }}
      />
      {Array.from({ length: 28 }).map((_, i) => {
        const angle = (i / 28) * Math.PI * 2
        const distance = 250 + Math.random() * 300
        return (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: position is identity
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              scale: 1,
            }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: i * 0.02 }}
            className="fixed top-1/2 left-1/2 size-2 rounded-full pointer-events-none z-0"
            style={{
              background: '#FFD96B',
              boxShadow: '0 0 8px rgba(255,217,107,0.8)',
              marginLeft: -4,
              marginTop: -4,
            }}
          />
        )
      })}
    </>
  )
}

/* =========================================================================
   CARD BACK — dorso uniforme
   ========================================================================= */

function CardBack() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="absolute top-3 left-3 size-6 border-l border-t border-white/10" />
      <span className="absolute top-3 right-3 size-6 border-r border-t border-white/10" />
      <span className="absolute bottom-3 left-3 size-6 border-l border-b border-white/10" />
      <span className="absolute bottom-3 right-3 size-6 border-r border-b border-white/10" />
      <div className={cn('text-display text-[80px] leading-none text-(--color-gold) opacity-80')}>
        C
      </div>
      <div className="text-mono text-[10px] uppercase tracking-[0.3em] text-(--color-text-muted) mt-2">
        CROMIKS
      </div>
    </div>
  )
}
