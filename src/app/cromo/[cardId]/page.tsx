import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Cromo } from '@/components/domain/cromo'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

/**
 * Página pública del cromo: /cromo/[cardId]?u=username
 *
 * Esta es la URL que se comparte por WhatsApp/Twitter/Instagram. Cuando
 * alguien la recibe:
 *   1. Las redes piden la metadata OG → preview rico con la imagen generada
 *      por /api/og/card/[cardId]?u=username
 *   2. Al hacer click → llegan a esta página
 *
 * La página es pública (no requiere auth) para máximo alcance. Si el viewer
 * está logueado, le mostramos su estado (¿tiene ese cromo?). Si no, le
 * mostramos un CTA para registrarse.
 *
 * El cromo es público pero `is_pinned` por user no se expone — solo se usa
 * el `u=username` para mostrar "@username te compartió" como social proof.
 *
 * Layout: standalone, sin shell del app ni marketing. La idea es que el
 * destinatario vea el cromo limpio y tome una decisión (registrarse o ignorar).
 */

type PageProps = {
  params: Promise<{ cardId: string }>
  searchParams: Promise<{ u?: string }>
}

/**
 * Metadata dinámica para preview rico. La OG image apunta al endpoint
 * que genera la imagen dinámicamente.
 */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { cardId } = await params
  const { u } = await searchParams

  const supabase = await createClient()
  const { data: card } = await supabase
    .from('cards')
    .select('id, name, rarity, card_number')
    .eq('id', cardId)
    .single()

  if (!card) {
    return {
      title: 'Cromo no encontrado · Cromiks',
    }
  }

  const ogUrl = u ? `/api/og/card/${card.id}?u=${encodeURIComponent(u)}` : `/api/og/card/${card.id}`

  const title = `${card.name} · Cromiks`
  const description = u
    ? `@${u} te compartió este cromo del álbum Eterno Diciembre.`
    : `Cromo #${card.card_number} del álbum Eterno Diciembre — Argentina Campeón del Mundo.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: 'website',
      siteName: 'Cromiks',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  }
}

export default async function CardPublicPage({ params, searchParams }: PageProps) {
  const { cardId } = await params
  const { u: sharedBy } = await searchParams

  const supabase = await createClient()
  const { data: card } = await supabase
    .from('cards')
    .select('id, card_number, name, description, rarity, metadata, content, legendary_brief')
    .eq('id', cardId)
    .single()

  if (!card) {
    notFound()
  }

  const metadata = (card.metadata ?? {}) as {
    position?: string
    club?: string
    number?: string | number
  }
  const content = (card.content ?? {}) as { photo?: { source?: string } }
  const photoSource = content?.photo?.source
  const hasRealPhoto = !!photoSource && photoSource !== '' && photoSource !== 'TODO'

  const playerRole = [metadata.position, metadata.club].filter(Boolean).join(' · ')

  // Chequear si el viewer está logueado para mostrar CTA contextual
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  // Si está logueado, fetcheamos si tiene esa carta en su álbum.
  // Esto convierte la página pública en una vista útil para users existentes:
  // "¿tenés este cromo o todavía no?".
  let viewerOwnership: { copies: number } | null = null
  if (user) {
    const { data: uc } = await supabase
      .from('user_cards')
      .select('copies')
      .eq('user_id', user.id)
      .eq('card_id', cardId)
      .maybeSingle()
    if (uc) {
      viewerOwnership = { copies: uc.copies ?? 1 }
    }
  }

  return (
    <div className="min-h-screen bg-(--color-surface-deep) text-(--color-text-primary) flex flex-col">
      {/* Header brand minimal */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/[0.05]">
        <Link href="/" className="text-mono text-sm tracking-[0.2em] uppercase text-(--color-gold)">
          Cromiks
        </Link>
        {!isLoggedIn && (
          <Link
            href="/signin"
            className="text-mono text-xs uppercase tracking-[0.15em] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            Entrar
          </Link>
        )}
      </header>

      {/* Hero: cromo + info */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {sharedBy && (
          <p className="text-mono text-xs uppercase tracking-[0.2em] text-(--color-text-muted) mb-8">
            @{sharedBy} te compartió este cromo
          </p>
        )}

        <div className="mb-8">
          <Cromo
            tier={card.rarity}
            name={card.name}
            playerRole={playerRole || undefined}
            number={metadata.number != null ? String(metadata.number) : undefined}
            seed={card.id}
            imageUrl={hasRealPhoto ? photoSource : undefined}
            size="lg"
          />
        </div>

        <div className="max-w-md text-center space-y-3">
          <p className="text-mono text-[10px] uppercase tracking-[0.2em] text-(--color-text-muted)">
            Cromo #{card.card_number} · {card.card_number} de 205
          </p>
          <h1 className="text-display text-3xl text-(--color-text-primary) leading-tight">
            {card.name}
          </h1>
          {playerRole && (
            <p className="text-mono text-xs uppercase tracking-[0.15em] text-(--color-text-secondary)">
              {playerRole}
            </p>
          )}
          {card.description && (
            <p className="text-(--color-text-secondary) text-sm leading-relaxed pt-2">
              {card.description}
            </p>
          )}
        </div>
      </main>

      {/* CTA */}
      <footer className="px-6 py-8 border-t border-white/[0.05]">
        <div className="max-w-md mx-auto text-center space-y-4">
          {viewerOwnership ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--color-gold)/10 border border-(--color-gold)/30">
                <span className="text-(--color-gold) text-mono text-[10px] uppercase tracking-[0.15em]">
                  Lo tenés
                </span>
                {viewerOwnership.copies > 1 && (
                  <span className="text-(--color-gold)/80 text-mono text-[10px]">
                    ×{viewerOwnership.copies}
                  </span>
                )}
              </div>
              <p className="text-(--color-text-secondary) text-sm">
                Este cromo ya está en tu álbum.
              </p>
              <Button asChild variant="primary">
                <Link href="/album">Ver mi álbum</Link>
              </Button>
            </>
          ) : isLoggedIn ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--color-surface-raised) border border-white/[0.08]">
                <span className="text-(--color-text-secondary) text-mono text-[10px] uppercase tracking-[0.15em]">
                  Aún no lo tenés
                </span>
              </div>
              <p className="text-(--color-text-secondary) text-sm">
                Abrí sobres en tu home para tener chance de conseguirlo.
              </p>
              <Button asChild variant="primary">
                <Link href="/">Ir a mi home</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-display text-xl text-(--color-text-primary)">
                Coleccioná tu álbum eterno
              </p>
              <p className="text-(--color-text-secondary) text-sm">
                Sumá los 205 cromos del Mundial 2022. Gratis. Abrí un sobre cada día.
              </p>
              <Button asChild variant="primary">
                <Link href="/signin">Empezar mi álbum</Link>
              </Button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
