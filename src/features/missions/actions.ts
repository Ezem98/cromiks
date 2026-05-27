'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseUuid } from '@/lib/validation'

/**
 * Server action: reclama el reward de una misión completed.
 *
 * Llama al RPC `claim_mission(p_user_mission_id)` que:
 *  - Verifica que la misión está completed (no active, no claimed)
 *  - Suma reward_coins a user_coins
 *  - Crea un pack pendiente si reward_pack_type está definido
 *  - Marca la misión como claimed
 *
 * Errores posibles del RPC:
 *  - 'auth_required'
 *  - 'mission_not_found'
 *  - 'mission_not_completed' — el más común, si el user clickea claim en una
 *    misión que todavía no completó (UI bug) o ya claimed (race condition)
 *  - 'template_not_found' — data corrupta
 *
 * Output: rewards aplicados para mostrar en el toast/feedback.
 */
export async function claimMission(userMissionId: string): Promise<
  | {
      ok: true
      data: {
        coinsEarned: number
        packId: string | null
        cardsEarned: number
        newBalance: number
      }
    }
  | { ok: false; error: string }
> {
  const validUserMissionId = parseUuid(userMissionId)
  if (!validUserMissionId) {
    return { ok: false, error: 'invalid_input' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('claim_mission', {
    p_user_mission_id: validUserMissionId,
  })

  if (error) {
    // Match exacto contra los códigos del RPC claim_mission.
    // Ver migration 20260526130000_add_claim_mission.sql.
    const knownCodes = new Set([
      'auth_required',
      'mission_not_found',
      'mission_not_completed',
      'template_not_found',
    ])
    if (knownCodes.has(error.message)) {
      return { ok: false, error: error.message }
    }
    console.error('[missions] claimMission:', error.message)
    return { ok: false, error: 'unknown' }
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { ok: false, error: 'empty_result' }
  }

  const row = data[0]
  // Revalidamos home (donde se ven las misiones) y root.
  // Si en el futuro hacemos página /misiones, agregar revalidatePath('/misiones').
  revalidatePath('/')

  return {
    ok: true,
    data: {
      coinsEarned: row.out_coins_earned ?? 0,
      packId: row.out_pack_id ?? null,
      cardsEarned: row.out_cards_earned ?? 0,
      newBalance: row.out_new_balance ?? 0,
    },
  }
}
