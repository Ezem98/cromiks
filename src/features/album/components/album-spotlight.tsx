import Link from 'next/link'
import { Cromo } from '@/components/domain/cromo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AlbumCardSlot } from '../queries'

/**
 * Spotlight de apertura del álbum (T-12 · critique 2026-06-03).
 *
 * Problema que resuelve: con poco llenado, la página abre con un mar de slots
 * fantasma (el primer cell de francia es el díptico 136 que casi nadie tiene
 * temprano) → la primera impresión de cada sesión es un vacío que se lee como
 * DEUDA, invirtiendo el peak-end "orgullo" del producto.
 *
 * Qué hace: lidera con lo que TENÉS (tu mejor cromo, celebrado) + un camino
 * visible a abrir sobres, en voz de marca. NO toca el bento (la grilla completa
 * sigue abajo). Se auto-retira al pasar el 50% del set activo: a partir de ahí
 * la sala de trofeos se sostiene sola (el critique juzgó 27% = valle, 63% =
 * orgullo). Sin flag de dismiss: el progreso lo resuelve.
 */

const SPOTLIGHT_FILL_CEILING = 0.5

const TIER_RANK: Record<AlbumCardSlot['tier'], number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
}

/**
 * ¿Mostrar el spotlight? Mientras el álbum esté por debajo del 50% del set
 * activo. Exportada para que AlbumView oculte el empty-state redundante.
 */
export function shouldShowSpotlight(totalOwned: number, totalCards: number): boolean {
  if (totalCards <= 0) return false
  return totalOwned < totalCards * SPOTLIGHT_FILL_CEILING
}

/** Mejor cromo owned de la página: mayor rareza, desempata por más reciente. */
function pickHeroCard(cards: AlbumCardSlot[]): AlbumCardSlot | null {
  const owned = cards.filter((c) => c.owned)
  if (owned.length === 0) return null
  return owned.reduce((best, card) => {
    const byTier = TIER_RANK[card.tier] - TIER_RANK[best.tier]
    if (byTier > 0) return card
    if (byTier < 0) return best
    const cardAt = card.firstObtainedAt ? Date.parse(card.firstObtainedAt) : 0
    const bestAt = best.firstObtainedAt ? Date.parse(best.firstObtainedAt) : 0
    return cardAt > bestAt ? card : best
  })
}

type AlbumSpotlightProps = {
  cards: AlbumCardSlot[]
  totalOwned: number
  totalCards: number
  /** Título de la página actual, para la copy ("...para completar Francia"). */
  pageTitle: string
}

export function AlbumSpotlight({ cards, totalOwned, totalCards, pageTitle }: AlbumSpotlightProps) {
  if (!shouldShowSpotlight(totalOwned, totalCards)) return null

  const hero = pickHeroCard(cards)
  const remaining = Math.max(0, totalCards - totalOwned)
  const percentage = totalCards === 0 ? 0 : Math.round((totalOwned / totalCards) * 100)

  return (
    <section
      aria-label="Tu álbum está arrancando"
      className={cn(
        'rounded-[16px] overflow-hidden',
        'bg-(--color-surface-raised) border border-white/[0.08]',
        'flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7 p-5 sm:p-6',
      )}
    >
      {hero ? (
        <HeroVisual card={hero} />
      ) : (
        <GhostVisual cardNumbers={cards.slice(0, 3).map((c) => c.cardNumber)} />
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
          {hero ? 'Tu álbum está arrancando' : 'Tu álbum te espera'}
        </p>

        {hero ? (
          <h2 className="text-display text-2xl sm:text-3xl text-(--color-text-primary) leading-[0.95] text-balance">
            Ya pegaste {totalOwned} {totalOwned === 1 ? 'cromo' : 'cromos'}
          </h2>
        ) : (
          <h2 className="text-display text-2xl sm:text-3xl text-(--color-text-primary) leading-[0.95] text-balance">
            Acá va a vivir tu Mundial
          </h2>
        )}

        <p className="text-(--color-text-secondary) text-sm leading-relaxed max-w-prose">
          {hero ? (
            <>
              Tu mejor cromo hasta ahora es{' '}
              <span className="text-(--color-text-primary)">{hero.name}</span>. Te{' '}
              {remaining === 1 ? 'falta' : 'faltan'} {remaining} para completar {pageTitle}. Cada
              sobre te acerca.
            </>
          ) : (
            <>
              Todavía no pegaste ningún cromo de {pageTitle}. Abrí tu primer sobre y empezá a
              revivir Qatar 2022.
            </>
          )}
        </p>

        {hero && (
          <div
            className="h-1 bg-(--color-surface-elevated) rounded-full overflow-hidden max-w-xs"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${totalOwned} de ${totalCards} cromos`}
          >
            <div
              className="h-full bg-(--color-argentina-glow) rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        <div className="pt-1">
          <Button asChild variant={hero ? 'primary' : 'gold'} size="md">
            <Link href="/">{hero ? 'Abrí tu sobre del día' : 'Abrir mi primer sobre'}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/** El cromo héroe, centrado en mobile. Un solo <Cromo> (sin costo de grilla). */
function HeroVisual({ card }: { card: AlbumCardSlot }) {
  return (
    <div className="flex justify-center shrink-0">
      <Cromo
        tier={card.tier}
        name={card.name}
        playerRole={card.playerRole ?? undefined}
        number={card.number ?? undefined}
        imageUrl={card.imageUrl ?? undefined}
        seed={card.id}
        size="md"
      />
    </div>
  )
}

/**
 * Estado primer-uso (0 owned en la página): siluetas de los próximos cromos
 * como anticipación (el estadio antes del pitazo), no como deuda. Estáticas;
 * el pulse respeta prefers-reduced-motion.
 */
function GhostVisual({ cardNumbers }: { cardNumbers: number[] }) {
  return (
    <div className="flex justify-center gap-2.5 shrink-0" aria-hidden="true">
      {cardNumbers.map((n, i) => (
        <div
          key={n}
          className={cn(
            'flex items-center justify-center w-16 aspect-[3/4] rounded-[10px]',
            'border border-dashed border-white/15 bg-(--color-surface-deep)/60',
            'motion-safe:animate-pulse',
          )}
          style={{ animationDelay: `${i * 200}ms` }}
        >
          <span className="text-display text-lg text-(--color-text-ghost) leading-none">{n}</span>
        </div>
      ))}
    </div>
  )
}
