import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Data fetchers para el feature de perfil.
 *
 * Dos queries principales:
 *  - getCurrentUserProfile: para el user logueado (username, display_name, etc).
 *    Sirve para attribution en shares y otras integraciones cross-feature.
 *  - getProfileByUsername: para la página pública /u/[username]. Agrega
 *    pineados, stats, streak.
 *
 * Las queries son públicas (sin auth required) porque los perfiles son
 * públicos por diseño — cualquiera puede ver el perfil de otro user vía
 * el link compartido. La data sensible (email, internal IDs) no se expone.
 */

const ALBUM_ID = 'eterno-diciembre'

export type ProfileBasic = {
  /** ID del user (uuid). Útil para queries internas, no se expone públicamente */
  id: string
  username: string
  displayName: string | null
  language: 'es' | 'en' | 'pt' | 'it'
  countryCode: string | null
}

export type ProfilePinnedCard = {
  id: string
  cardNumber: number
  name: string
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  playerRole: string | null
  number: string | null
  imageUrl: string | null
}

export type ProfilePublic = ProfileBasic & {
  stats: {
    /** Cromos únicos owned del álbum */
    cardsOwned: number
    /** Total de cromos del álbum (siempre 205) */
    totalCards: number
    /** Días seguidos abriendo sobre */
    currentStreak: number
    /** Récord histórico de streak */
    longestStreak: number
    /** Total de sobres reclamados a lo largo de la historia */
    totalClaims: number
  }
  pinnedCards: ProfilePinnedCard[]
}

/**
 * Obtiene el profile del user logueado.
 * Si no hay user → null.
 * Si el user no completó onboarding → puede tener username null.
 *
 * Útil para conectar con features cross (sharing attribution, etc).
 */
export async function getCurrentUserProfile(): Promise<ProfileBasic | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, language, country_code')
    .eq('id', user.id)
    .maybeSingle()

  if (!data?.username) return null

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    language: data.language,
    countryCode: data.country_code,
  }
}

/**
 * Obtiene el perfil público de un user por username.
 *
 * - Si no existe → null
 * - Incluye stats agregadas + cromos pineados (con su data completa)
 *
 * Es público — cualquiera (logueado o no) puede ver perfiles.
 */
export async function getProfileByUsername(username: string): Promise<ProfilePublic | null> {
  const cleaned = username.trim().toLowerCase()
  if (!cleaned) return null

  const supabase = await createClient()

  // 1. Profile básico
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, language, country_code')
    .eq('username', cleaned)
    .maybeSingle()

  if (!profile) return null

  // 2. Stats en paralelo
  const [cardsCountRes, totalCardsRes, streakRes, pinnedRes] = await Promise.all([
    // Cards owned por el user, filtradas al álbum
    supabase
      .from('user_cards')
      .select('card_id, cards!inner(album_id)', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('cards.album_id', ALBUM_ID),

    // Total cards del álbum
    supabase.from('cards').select('id', { count: 'exact', head: true }).eq('album_id', ALBUM_ID),

    // Streak
    supabase
      .from('streaks')
      .select('current_streak, longest_streak, total_claims')
      .eq('user_id', profile.id)
      .maybeSingle(),

    // Cromos pineados (join con cards para traer la data completa)
    supabase
      .from('user_cards')
      .select(`
        card_id,
        cards!inner(
          id,
          card_number,
          name,
          rarity,
          metadata,
          content,
          album_id
        )
      `)
      .eq('user_id', profile.id)
      .eq('is_pinned', true)
      .eq('cards.album_id', ALBUM_ID)
      .limit(12), // máximo 12 pineados en el perfil público
  ])

  // Mapeo de cards pineadas al shape del componente
  const pinnedCards: ProfilePinnedCard[] = (pinnedRes.data ?? []).map((row) => {
    // El join inline retorna como objeto. TS lo tipea raro a veces.
    const card = row.cards as unknown as {
      id: string
      card_number: number
      name: string
      rarity: ProfilePinnedCard['tier']
      metadata: Record<string, unknown> | null
      content: Record<string, unknown> | null
    }
    const metadata = (card.metadata ?? {}) as {
      position?: string
      club?: string
      number?: string | number
    }
    const content = (card.content ?? {}) as { photo?: { source?: string } }
    const photoSource = content?.photo?.source
    const hasRealPhoto = !!photoSource && photoSource !== '' && photoSource !== 'TODO'

    return {
      id: card.id,
      cardNumber: card.card_number,
      name: card.name,
      tier: card.rarity,
      playerRole:
        metadata.position || metadata.club
          ? [metadata.position, metadata.club].filter(Boolean).join(' · ')
          : null,
      number: metadata.number != null ? String(metadata.number) : null,
      imageUrl: hasRealPhoto ? photoSource : null,
    }
  })

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    language: profile.language,
    countryCode: profile.country_code,
    stats: {
      cardsOwned: cardsCountRes.count ?? 0,
      totalCards: totalCardsRes.count ?? 205,
      currentStreak: streakRes.data?.current_streak ?? 0,
      longestStreak: streakRes.data?.longest_streak ?? 0,
      totalClaims: streakRes.data?.total_claims ?? 0,
    },
    pinnedCards,
  }
}
