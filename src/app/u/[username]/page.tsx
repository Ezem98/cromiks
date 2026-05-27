import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBadgesForUser } from '@/features/badges/queries'
import { ProfileView } from '@/features/profile/components/profile-view'
import { getCurrentUserProfile, getProfileByUsername } from '@/features/profile/queries'

/**
 * Página pública del perfil: /u/[username]
 *
 * Cualquiera puede ver perfiles (sin auth). Si el viewer está logueado,
 * detectamos si es el dueño del perfil para mostrar CTAs distintos.
 *
 * Metadata OG: title + description + (futuro) imagen del perfil.
 * Por ahora la OG image apunta a una imagen genérica del cromo más pineado
 * o el primero, si tiene pineados. Si no tiene, fallback al brand.
 *
 * Layout: standalone (no shell de app). Es público — los visitors que llegan
 * desde un share no son necesariamente users de la app.
 */

type PageProps = {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) {
    return {
      title: 'Perfil no encontrado · Cromiks',
    }
  }

  const displayName = profile.displayName ?? `@${profile.username}`
  const title = `${displayName} · Cromiks`
  const description = `${profile.stats.cardsOwned} de ${profile.stats.totalCards} cromos · ${profile.stats.currentStreak} días de racha`

  // OG image: si el user tiene al menos un pineado, usamos el primero.
  // Si no, fallback a un OG genérico (TODO: hacer un endpoint /api/og/profile/[username]
  // que genere una imagen específica del perfil con stats + algunos pineados).
  const firstPinned = profile.pinnedCards[0]
  const ogUrl = firstPinned
    ? `/api/og/card/${firstPinned.id}?u=${encodeURIComponent(profile.username)}`
    : '/og-default.png'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: 'profile',
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

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) {
    notFound()
  }

  // Para CTAs y detección de dueño del perfil + badges del perfil
  const [viewerProfile, badges] = await Promise.all([
    getCurrentUserProfile(),
    getBadgesForUser(profile.id),
  ])

  return (
    <>
      {/* Header minimal para navegación back a Cromiks */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/[0.05] bg-(--color-surface-deep)">
        <Link href="/" className="text-mono text-sm tracking-[0.2em] uppercase text-(--color-gold)">
          Cromiks
        </Link>
        {!viewerProfile && (
          <Link
            href="/signin"
            className="text-mono text-xs uppercase tracking-[0.15em] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            Entrar
          </Link>
        )}
      </header>

      <ProfileView
        profile={profile}
        viewerId={viewerProfile?.id ?? null}
        viewerUsername={viewerProfile?.username ?? null}
        badges={badges}
      />
    </>
  )
}
