'use client'

import { MapPinIcon, Share2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Cromo } from '@/components/domain/cromo'
import { Button } from '@/components/ui/button'
import type { ProfilePinnedCard, ProfilePublic } from '@/features/profile/queries'
import { cn } from '@/lib/utils'

/**
 * Vista pública del perfil de un user — /u/[username].
 *
 * Estructura:
 *  - Header: avatar (placeholder), display_name, @username, país
 *  - Stats: cromos owned, streak actual, streak récord
 *  - Cromos destacados: grid con los pineados (max 12)
 *  - CTAs según viewer:
 *    - Si es el dueño → "Editar perfil" + "Compartir mi perfil"
 *    - Si es otro user logueado → "Ver mi álbum" + "Compartir este perfil"
 *    - Si no está logueado → "Empezar mi álbum"
 *
 * El componente es client porque necesitamos el Web Share API y el click de
 * "Copiar link". El fetch de data es en la página server-side.
 */

type ProfileViewProps = {
  profile: ProfilePublic
  /** ID del viewer (si está logueado) — para detectar si es el dueño */
  viewerId: string | null
  /** Username del viewer — para CTA "Mi álbum" si es otro user */
  viewerUsername: string | null
}

const countryFlags: Record<string, string> = {
  AR: '🇦🇷',
  BR: '🇧🇷',
  UY: '🇺🇾',
  CL: '🇨🇱',
  PY: '🇵🇾',
  CO: '🇨🇴',
  MX: '🇲🇽',
  ES: '🇪🇸',
  IT: '🇮🇹',
  US: '🇺🇸',
}

export function ProfileView({ profile, viewerId, viewerUsername }: ProfileViewProps) {
  const isOwner = viewerId === profile.id
  const isLoggedIn = !!viewerId
  const completionPct =
    profile.stats.totalCards > 0
      ? Math.round((profile.stats.cardsOwned / profile.stats.totalCards) * 100)
      : 0

  const handleShareProfile = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const text = isOwner
      ? 'Mirá mi álbum eterno en Cromiks'
      : `Mirá el álbum de @${profile.username} en Cromiks`

    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `@${profile.username} · Cromiks`,
          text,
          url,
        })
        return
      } catch (err) {
        // User canceló, no hacemos nada
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado')
    } catch {
      toast.error('No pude copiar')
    }
  }

  return (
    <div className="min-h-screen bg-(--color-surface-deep) text-(--color-text-primary)">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-10">
        {/* === Header del perfil === */}
        <header className="flex flex-col items-center text-center space-y-3">
          <ProfileAvatar
            displayName={profile.displayName ?? profile.username}
            username={profile.username}
          />

          <div className="space-y-1">
            <h1 className="text-display text-3xl text-(--color-text-primary)">
              {profile.displayName ?? profile.username}
            </h1>
            <p className="text-mono text-sm text-(--color-text-muted)">@{profile.username}</p>
          </div>

          {profile.countryCode && (
            <div className="inline-flex items-center gap-1.5 text-(--color-text-secondary) text-sm">
              <MapPinIcon className="size-3.5" />
              <span>
                {countryFlags[profile.countryCode] ?? ''} {profile.countryCode}
              </span>
            </div>
          )}

          {/* CTAs */}
          <div className="flex items-center gap-2 pt-3">
            <Button onClick={handleShareProfile} variant="ghost" size="sm">
              <Share2Icon className="size-4 mr-1.5" />
              {isOwner ? 'Compartir mi perfil' : 'Compartir'}
            </Button>
          </div>
        </header>

        {/* === Stats === */}
        <section
          aria-label="Estadísticas"
          className={cn(
            'grid grid-cols-3 gap-px',
            'rounded-[16px] overflow-hidden',
            'border border-white/[0.06]',
            'bg-white/[0.06]',
          )}
        >
          <StatBlock
            label="Cromos"
            value={`${profile.stats.cardsOwned}`}
            sub={`de ${profile.stats.totalCards}`}
            accent="primary"
            footer={`${completionPct}%`}
          />
          <StatBlock
            label="Racha"
            value={`${profile.stats.currentStreak}`}
            sub={profile.stats.currentStreak === 1 ? 'día' : 'días'}
            accent="gold"
            footer={
              profile.stats.longestStreak > 0 ? `récord ${profile.stats.longestStreak}` : null
            }
          />
          <StatBlock
            label="Sobres"
            value={`${profile.stats.totalClaims}`}
            sub={profile.stats.totalClaims === 1 ? 'abierto' : 'abiertos'}
            accent="neutral"
            footer={null}
          />
        </section>

        {/* === Pineados === */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-display text-xl text-(--color-text-primary)">Cromos destacados</h2>
            {profile.pinnedCards.length > 0 && (
              <span className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
                {profile.pinnedCards.length} {profile.pinnedCards.length === 1 ? 'cromo' : 'cromos'}
              </span>
            )}
          </div>

          {profile.pinnedCards.length === 0 ? (
            <EmptyPinned isOwner={isOwner} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {profile.pinnedCards.map((card) => (
                <PinnedCardItem key={card.id} card={card} />
              ))}
            </div>
          )}
        </section>

        {/* === Footer CTA === */}
        {!isOwner && (
          <section className="pt-4 border-t border-white/[0.06]">
            <div className="text-center space-y-3">
              <p className="text-display text-lg text-(--color-text-primary)">
                {isLoggedIn ? '¿Querés ver el tuyo?' : 'Empezá tu álbum eterno'}
              </p>
              <p className="text-(--color-text-secondary) text-sm">
                205 cromos · gratis · un sobre cada día
              </p>
              {isLoggedIn && viewerUsername ? (
                <Button asChild variant="primary">
                  <a href={`/u/${viewerUsername}`}>Ver mi perfil</a>
                </Button>
              ) : (
                <Button asChild variant="primary">
                  <a href="/signin">Empezar gratis</a>
                </Button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

/**
 * Bloque de stat con label arriba, número grande al medio, footer abajo.
 */
function StatBlock({
  label,
  value,
  sub,
  accent,
  footer,
}: {
  label: string
  value: string
  sub?: string
  accent: 'primary' | 'gold' | 'neutral'
  footer: string | null
}) {
  return (
    <div className="bg-(--color-surface-raised) p-5 flex flex-col justify-between min-h-[120px]">
      <p className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-display text-3xl leading-none',
            accent === 'primary' && 'text-(--color-text-primary)',
            accent === 'gold' && 'text-(--color-gold)',
            accent === 'neutral' && 'text-(--color-text-primary)',
          )}
        >
          {value}
        </span>
        {sub && <span className="text-(--color-text-muted) text-xs">{sub}</span>}
      </div>
      {footer && (
        <p className="text-mono text-[10px] uppercase tracking-[0.1em] text-(--color-text-muted)">
          {footer}
        </p>
      )}
    </div>
  )
}

/**
 * Item de cromo pineado en el grid. Muestra el cromo size="sm" con metadata.
 * Click → va a la página pública del cromo (/cromo/[cardId]?u=username).
 */
function PinnedCardItem({ card }: { card: ProfilePinnedCard }) {
  return (
    <a
      href={`/cromo/${card.id}`}
      className="block transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-(--color-argentina-glow)/40 rounded-md"
      aria-label={`Ver ${card.name}`}
    >
      <Cromo
        tier={card.tier}
        name={card.name}
        playerRole={card.playerRole ?? undefined}
        number={card.number ?? undefined}
        seed={card.id}
        imageUrl={card.imageUrl ?? undefined}
        size="sm"
      />
    </a>
  )
}

/**
 * Avatar genérico con la primera letra del display name.
 * Cuando agreguemos avatar_url al schema, este componente lo usa.
 */
function ProfileAvatar({ displayName, username }: { displayName: string; username: string }) {
  const initial = (displayName || username).charAt(0).toUpperCase()
  return (
    <div
      className={cn(
        'flex items-center justify-center size-24',
        'rounded-full',
        'bg-[linear-gradient(135deg,rgba(212,169,60,0.25)_0%,rgba(107,185,255,0.2)_100%)]',
        'border border-white/[0.1]',
        'text-display text-3xl text-(--color-text-primary)',
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}

/**
 * Estado vacío cuando el user no tiene cromos pineados.
 * Dueño: invitación a pinear. Visitante: mensaje genérico.
 */
function EmptyPinned({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="rounded-[16px] border border-dashed border-white/[0.08] p-8 text-center bg-(--color-surface-raised)/40">
      <p className="text-(--color-text-secondary) text-sm">
        {isOwner ? (
          <>
            No tenés ningún cromo destacado todavía. Andá a{' '}
            <a href="/album" className="text-(--color-argentina-glow) underline">
              tu álbum
            </a>{' '}
            y elegí algunos.
          </>
        ) : (
          <>Este álbum todavía no tiene cromos destacados.</>
        )}
      </p>
    </div>
  )
}
