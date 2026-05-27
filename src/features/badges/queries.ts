import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Data fetcher para el feature de badges.
 *
 * `getBadgesForUser` devuelve TODAS las badges activas del catálogo, con
 * estado (unlocked / locked) y, para las locked, el progress hacia el
 * unlock (ej. "75 / 100 cromos").
 *
 * El cálculo de progress vive del lado de TS para mantener la query SQL
 * simple. Los datos brutos (count de cromos, rarities owned, streak, etc.)
 * se piden en paralelo y después se hace el match por badge.
 *
 * Las badges se desbloquean automáticamente vía triggers SQL (ver migration
 * 20260526160000_badges_unlock_triggers.sql). Esta query solo lee.
 */

const ALBUM_ID = 'eterno-diciembre'

export type BadgeCategory = 'progress' | 'rarity' | 'engagement' | 'social'
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

type UnlockCondition =
  | { type: 'card_count'; threshold: number }
  | { type: 'rarity_obtained'; rarity: BadgeRarity }
  | { type: 'all_legendaries' }
  | { type: 'streak'; threshold: number }
  | { type: 'share_count'; threshold: number }
  | { type: 'referral_count'; threshold: number }

export type BadgeWithStatus = {
  id: string
  name: string
  description: string
  category: BadgeCategory
  rarity: BadgeRarity
  iconName: string | null
  displayOrder: number
  /** Si está desbloqueada → ISO date. Si no → null. */
  unlockedAt: string | null
  /** True si está pinned en el perfil del user (para destacarla). */
  isPinned: boolean
  /**
   * Progress hacia el unlock. Solo presente para badges locked con threshold.
   *  - current: valor actual del user (ej. 7 cromos)
   *  - target:  meta (ej. 10 cromos)
   * Para badges sin progress medible (rarity_obtained, referral, etc.) es null.
   */
  progress: { current: number; target: number } | null
  /**
   * True si la badge no se puede desbloquear todavía porque la feature
   * subyacente no existe (ej. referrals). Render como "Próximamente".
   */
  notImplemented: boolean
}

/**
 * Devuelve todas las badges + estado para el user dado.
 *
 * Si userId es null (visitor anónimo), todas vuelven como locked sin progress.
 * Ordenadas por display_order del catálogo.
 */
export async function getBadgesForUser(userId: string | null): Promise<BadgeWithStatus[]> {
  const supabase = await createClient()

  // 1. Catálogo de badges activas (siempre)
  const { data: catalog } = await supabase
    .from('badges')
    .select('id, name, description, category, rarity, icon_name, display_order, unlock_condition')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (!catalog || catalog.length === 0) return []

  // 2. Si no hay user, todas locked
  if (!userId) {
    return catalog.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category as BadgeCategory,
      rarity: row.rarity as BadgeRarity,
      iconName: row.icon_name,
      displayOrder: row.display_order ?? 0,
      unlockedAt: null,
      isPinned: false,
      progress: null,
      notImplemented: (row.unlock_condition as UnlockCondition)?.type === 'referral_count',
    }))
  }

  // 3. Estado del user + counts en paralelo
  const [
    unlockedRes,
    cardCountRes,
    ownedRaritiesRes,
    legendaryOwnedRes,
    legendaryTotalRes,
    streakRes,
    shareCountRes,
  ] = await Promise.all([
    // Badges ya desbloqueadas por el user
    supabase.from('user_badges').select('badge_id, unlocked_at, is_pinned').eq('user_id', userId),

    // Conteo de cromos owned (distintos) del álbum
    supabase
      .from('user_cards')
      .select('card_id, cards!inner(album_id)', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cards.album_id', ALBUM_ID),

    // Rarities que el user posee (para badges rarity_obtained)
    supabase
      .from('user_cards')
      .select('cards!inner(rarity, album_id)')
      .eq('user_id', userId)
      .eq('cards.album_id', ALBUM_ID),

    // Legendarias owned
    supabase
      .from('user_cards')
      .select('card_id, cards!inner(rarity, album_id)', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cards.album_id', ALBUM_ID)
      .eq('cards.rarity', 'legendary'),

    // Legendarias totales del álbum
    supabase
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('album_id', ALBUM_ID)
      .eq('rarity', 'legendary'),

    // Streak record
    supabase
      .from('streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .maybeSingle(),

    // Shares totales
    supabase
      .from('share_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const unlockedMap = new Map<string, { unlockedAt: string; isPinned: boolean }>(
    (unlockedRes.data ?? []).map((row) => [
      row.badge_id,
      { unlockedAt: row.unlocked_at, isPinned: row.is_pinned },
    ]),
  )

  const cardsOwned = cardCountRes.count ?? 0
  const legendaryOwned = legendaryOwnedRes.count ?? 0
  const legendaryTotal = legendaryTotalRes.count ?? 0
  const sharesCount = shareCountRes.count ?? 0
  const bestStreak = Math.max(
    streakRes.data?.current_streak ?? 0,
    streakRes.data?.longest_streak ?? 0,
  )

  const raritiesOwned = new Set<BadgeRarity>()
  for (const row of ownedRaritiesRes.data ?? []) {
    const card = row.cards as unknown as { rarity: BadgeRarity } | null
    if (card?.rarity) raritiesOwned.add(card.rarity)
  }

  // 4. Map del catálogo + estado por badge
  return catalog.map((row) => {
    const unlocked = unlockedMap.get(row.id)
    const condition = row.unlock_condition as UnlockCondition
    const notImplemented = condition?.type === 'referral_count'

    let progress: BadgeWithStatus['progress'] = null
    if (!unlocked && !notImplemented) {
      switch (condition?.type) {
        case 'card_count':
          progress = {
            current: Math.min(cardsOwned, condition.threshold),
            target: condition.threshold,
          }
          break
        case 'streak':
          progress = {
            current: Math.min(bestStreak, condition.threshold),
            target: condition.threshold,
          }
          break
        case 'share_count':
          progress = {
            current: Math.min(sharesCount, condition.threshold),
            target: condition.threshold,
          }
          break
        case 'all_legendaries':
          if (legendaryTotal > 0) {
            progress = {
              current: Math.min(legendaryOwned, legendaryTotal),
              target: legendaryTotal,
            }
          }
          break
        case 'rarity_obtained':
          // Booleano disfrazado de progress 0/1 — útil para mostrar "Bloqueada"
          progress = {
            current: raritiesOwned.has(condition.rarity) ? 1 : 0,
            target: 1,
          }
          break
        default:
          progress = null
      }
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category as BadgeCategory,
      rarity: row.rarity as BadgeRarity,
      iconName: row.icon_name,
      displayOrder: row.display_order ?? 0,
      unlockedAt: unlocked?.unlockedAt ?? null,
      isPinned: unlocked?.isPinned ?? false,
      progress,
      notImplemented,
    }
  })
}

/**
 * Helper para el contador rápido en stats — solo necesita el count.
 * Mucho más liviano que `getBadgesForUser` si lo único que querés es "3 / 15".
 */
export async function getBadgeCountForUser(
  userId: string,
): Promise<{ unlocked: number; total: number }> {
  const supabase = await createClient()
  const [unlockedRes, totalRes] = await Promise.all([
    supabase
      .from('user_badges')
      .select('badge_id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase.from('badges').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])
  return {
    unlocked: unlockedRes.count ?? 0,
    total: totalRes.count ?? 0,
  }
}
