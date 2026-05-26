import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Data fetchers para el home autenticado.
 *
 * Todas estas funciones asumen que ya hay un user logueado (lo valida el layout).
 * Si no lo hay, retornan null.
 */

const ALBUM_ID = 'eterno-diciembre'

export async function getHomeData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const today = new Date().toISOString().slice(0, 10)

  // Fetch en paralelo todo lo que necesita el home
  const [packsRes, streakRes, missionsRes, cardsCountRes, totalCardsRes] = await Promise.all([
    // Sobres pendientes (todos los tipos)
    supabase
      .from('packs')
      .select('id, type, card_count, available_at, expires_at, context')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('available_at', { ascending: false }),

    // Streak
    supabase.from('streaks').select('*').eq('user_id', user.id).single(),

    // Misiones activas
    supabase
      .from('user_missions')
      .select('id, mission_template_id, status, progress, target, expires_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'completed'])
      .or(`expires_at.gte.${today}T00:00:00,expires_at.is.null`),

    // Cuántos cromos únicos tiene
    supabase
      .from('user_cards')
      .select('card_id', { count: 'exact', head: true })
      .eq('user_id', user.id),

    // Total de cromos del álbum
    supabase.from('cards').select('id', { count: 'exact', head: true }).eq('album_id', ALBUM_ID),
  ])

  const pendingPacks = packsRes.data ?? []
  const dailyPack = pendingPacks.find((p) => p.type === 'daily') ?? null

  // Si tiene una pending daily pack, asumimos que NO puede reclamar otra hoy
  // Si no tiene pending Y no reclamó hoy, puede reclamar
  const streak = streakRes.data
  const canClaimDaily = !dailyPack && streak?.last_claim_date !== today

  // Para mostrar countdown, calculamos cuándo se desbloquea el próximo
  const nextClaimAt = streak?.last_claim_date === today ? getNextMidnightArg() : null

  return {
    user: { id: user.id, email: user.email },
    pendingPacks,
    dailyPack,
    canClaimDaily,
    nextClaimAt,
    streak: streak ?? {
      current_streak: 0,
      longest_streak: 0,
      last_claim_date: null,
      total_claims: 0,
    },
    missions: missionsRes.data ?? [],
    cardsOwned: cardsCountRes.count ?? 0,
    totalCards: totalCardsRes.count ?? 205,
  }
}

/**
 * Obtiene la próxima medianoche en horario AR (UTC-3).
 * El sobre diario se desbloquea cada día a las 00:00 AR.
 */
function getNextMidnightArg(): string {
  const now = new Date()
  // AR es UTC-3, así que medianoche AR = 03:00 UTC
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(3, 0, 0, 0)
  return tomorrow.toISOString()
}

/**
 * Trae los mission templates referenciados por user_missions activas.
 */
export async function getMissionTemplates(templateIds: string[]) {
  if (templateIds.length === 0) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('mission_templates')
    .select('id, title, description, type')
    .in('id', templateIds)

  return data ?? []
}
