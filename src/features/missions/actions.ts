'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'

/**
 * Server action: reclama el reward de una misión completed.
 *
 * Llama al RPC `claim_mission(p_user_mission_id)` que:
 *  - Verifica que la misión está completed (no active, no claimed)
 *  - Suma reward_coins a user_coins
 *  - Crea un pack pendiente si reward_pack_type está definido
 *  - Marca la misión como claimed
 *
 * Errores posibles del RPC (`error.message` viene tal cual):
 *  - 'auth_required'
 *  - 'mission_not_found'
 *  - 'mission_not_completed' — el más común, si el user clickea claim en una
 *    misión que todavía no completó (UI bug) o ya claimed (race condition)
 *  - 'template_not_found' — data corrupta
 */

const KNOWN_RPC_CODES = new Set([
  'auth_required',
  'mission_not_found',
  'mission_not_completed',
  'template_not_found',
])

const claimMissionSchema = z.object({
  userMissionId: z.uuid(),
})

export const claimMission = defineAction({
  name: 'claimMission',
  schema: claimMissionSchema,
  rateLimit: 'claimMission',
  expectedErrors: [
    'auth_required',
    'mission_not_found',
    'mission_not_completed',
    'template_not_found',
    'empty_result',
  ],
  fn: async ({ userMissionId }, { supabase }) => {
    const { data, error } = await supabase.rpc('claim_mission', {
      p_user_mission_id: userMissionId,
    })

    if (error) {
      if (KNOWN_RPC_CODES.has(error.message)) {
        return { ok: false, code: error.message }
      }
      return { ok: false, code: 'unknown', message: error.message }
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { ok: false, code: 'empty_result' }
    }

    const row = data[0]
    // Revalidamos home (donde se ven las misiones).
    revalidatePath('/')

    return {
      ok: true,
      data: {
        coinsEarned: row.out_coins_earned ?? 0,
        packId: (row.out_pack_id as string | null) ?? null,
        cardsEarned: row.out_cards_earned ?? 0,
        newBalance: row.out_new_balance ?? 0,
      },
    }
  },
})
