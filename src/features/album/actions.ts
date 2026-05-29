'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'
import { track } from '@/lib/analytics'

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

// card_id es slug text (p.ej. "hinchada-delirio-mexico"), NO uuid.
const cardIdSchema = z.object({ cardId: z.string().min(1).max(100) })

// pin/unpin reciben `tier` opcional desde el client para evitar un round-trip
// extra a la DB. Solo se usa como propiedad de analítica — NO es input para el RPC.
const pinSchema = cardIdSchema.extend({ tier: z.string().optional() })

/**
 * Pinea un cromo (lo destaca en el perfil del user).
 *
 * Llama al RPC `pin_card`. Codes que tira (ver snapshot en
 * supabase/migrations/20260527130000_snapshot_pin_unpin_card.sql):
 *  - 'auth_required' → user sin sesión (defensivo)
 *  - 'card_not_owned' → el user no tiene esa carta
 */
const KNOWN_PIN_CARD_CODES = new Set(['auth_required', 'card_not_owned'])

export const pinCard = defineAction({
  name: 'pinCard',
  schema: pinSchema,
  expectedErrors: ['auth_required', 'card_not_owned'],
  fn: async ({ cardId, tier }, { userId, supabase }) => {
    const { error } = await supabase.rpc('pin_card', { p_card_id: cardId })
    if (error) {
      if (KNOWN_PIN_CARD_CODES.has(error.message)) {
        return { ok: false, code: error.message }
      }
      return { ok: false, code: 'unknown', message: error.message }
    }
    revalidatePath('/album')

    await track('card_pinned', { tier }, { distinctId: userId })

    return { ok: true, data: undefined }
  },
})

/**
 * Quita el pin de un cromo.
 *
 * Codes que tira: sólo 'auth_required' (defensivo). El UPDATE es no-op si el
 * user no tiene la carta — sin error.
 */
export const unpinCard = defineAction({
  name: 'unpinCard',
  schema: pinSchema,
  expectedErrors: ['auth_required'],
  fn: async ({ cardId, tier }, { userId, supabase }) => {
    const { error } = await supabase.rpc('unpin_card', { p_card_id: cardId })
    if (error) {
      if (error.message === 'auth_required') {
        return { ok: false, code: 'auth_required' }
      }
      return { ok: false, code: 'unknown', message: error.message }
    }
    revalidatePath('/album')

    await track('card_unpinned', { tier }, { distinctId: userId })

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
 * Errores del RPC (match exacto contra `error.message`, ver dump en
 * supabase/migrations/20260527100000_snapshot_existing_rpcs.sql):
 *  - 'auth_required'             → user sin sesión (defensivo)
 *  - 'invalid_count'             → p_count < 1
 *  - 'card_not_found'            → no existe esa card en el catálogo
 *  - 'legendary_not_dismantlable' → cards legendary no se canjean
 *  - 'card_not_owned'            → user no tiene la carta
 *  - 'must_keep_one'             → restarían 0 copias (siempre dejar 1)
 */
const KNOWN_DISMANTLE_CODES = new Set([
  'auth_required',
  'invalid_count',
  'card_not_found',
  'legendary_not_dismantlable',
  'card_not_owned',
  'must_keep_one',
])

const dismantleSchema = z.object({
  cardId: z.string().min(1).max(100),
  count: z.number().int().min(1).max(99).optional().default(1),
})

export const dismantleCard = defineAction({
  name: 'dismantleCard',
  schema: dismantleSchema,
  expectedErrors: [
    'auth_required',
    'invalid_count',
    'card_not_found',
    'legendary_not_dismantlable',
    'card_not_owned',
    'must_keep_one',
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
