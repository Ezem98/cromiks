'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'

/**
 * Server actions del álbum.
 *
 * Cada acción llama a una SQL function (RPC) de Supabase que ya tiene la
 * lógica transaccional + validaciones del lado DB.
 *
 * Patrón de retorno (vía defineAction):
 *   { ok: true; data } | { ok: false; code; message? }
 *
 * Todas las actions revalidan `/album` para que la próxima navegación traiga
 * el estado fresco.
 */

const cardIdSchema = z.object({ cardId: z.uuid() })

/**
 * Pinea un cromo (lo destaca en el perfil del user).
 *
 * Llama al RPC `pin_card`. Si el user no tiene la carta, el RPC tira error.
 */
export const pinCard = defineAction({
  name: 'pinCard',
  schema: cardIdSchema,
  fn: async ({ cardId }, { supabase }) => {
    const { error } = await supabase.rpc('pin_card', { p_card_id: cardId })
    if (error) {
      return { ok: false, code: 'unknown', message: error.message }
    }
    revalidatePath('/album')
    return { ok: true, data: undefined }
  },
})

/**
 * Quita el pin de un cromo.
 */
export const unpinCard = defineAction({
  name: 'unpinCard',
  schema: cardIdSchema,
  fn: async ({ cardId }, { supabase }) => {
    const { error } = await supabase.rpc('unpin_card', { p_card_id: cardId })
    if (error) {
      return { ok: false, code: 'unknown', message: error.message }
    }
    revalidatePath('/album')
    return { ok: true, data: undefined }
  },
})

/**
 * Canjea N copias duplicadas de un cromo por monedas.
 *
 * Llama al RPC `dismantle_card(p_card_id, p_count)` que:
 *  - Verifica que el user tenga al menos p_count + 1 copias (siempre se
 *    conserva al menos 1)
 *  - Resta p_count de user_cards.copies
 *  - Calcula coins_earned según el rarity (_coin_reward_for_rarity)
 *  - Suma a user_coins.balance
 *  - Devuelve { coins_earned, copies_left, new_balance }
 *
 * Errores posibles del RPC:
 *  - 'not_owned': el user no tiene la carta
 *  - 'no_extra_copies': solo tiene 1 copia
 *  - 'not_dismantleable': el tier no permite canjear (ej: legendary)
 *  - 'insufficient_copies': pidió canjear más de lo que tiene como extra
 */
const KNOWN_DISMANTLE_CODES = new Set([
  'not_owned',
  'no_extra_copies',
  'not_dismantleable',
  'insufficient_copies',
])

const dismantleSchema = z.object({
  cardId: z.uuid(),
  count: z.number().int().min(1).max(99).optional().default(1),
})

export const dismantleCard = defineAction({
  name: 'dismantleCard',
  schema: dismantleSchema,
  expectedErrors: [
    'not_owned',
    'no_extra_copies',
    'not_dismantleable',
    'insufficient_copies',
    'empty_result',
  ],
  fn: async ({ cardId, count }, { supabase }) => {
    const { data, error } = await supabase.rpc('dismantle_card', {
      p_card_id: cardId,
      p_count: count,
    })

    if (error) {
      if (KNOWN_DISMANTLE_CODES.has(error.message)) {
        return { ok: false, code: error.message }
      }
      return { ok: false, code: 'unknown', message: error.message }
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { ok: false, code: 'empty_result' }
    }

    const row = data[0]
    revalidatePath('/album')
    revalidatePath('/') // home también tiene el balance de coins

    return {
      ok: true,
      data: {
        coinsEarned: row.coins_earned ?? 0,
        copiesLeft: row.copies_left ?? 0,
        newBalance: row.new_balance ?? 0,
      },
    }
  },
})
