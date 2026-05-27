'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseUuid } from '@/lib/validation'

/**
 * Server actions del álbum.
 *
 * Cada acción llama a una SQL function (RPC) de Supabase que ya tiene la
 * lógica transaccional + validaciones del lado DB.
 *
 * Patrón de retorno: { ok: true, data } | { ok: false, error }
 * Errores de Postgres se mapean a códigos legibles para el cliente.
 *
 * Todas las actions revalidan `/album` después del cambio para que la próxima
 * navegación traiga el estado fresco.
 */

/**
 * Pinea un cromo (lo destaca en el perfil del user).
 *
 * Llama al RPC `pin_card`. Esta función no devuelve nada útil, solo escribe
 * `user_cards.is_pinned = true` para el (user_id, card_id) dado.
 *
 * Si el user no tiene la carta, el RPC tira error.
 */
export async function pinCard(
  cardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validCardId = parseUuid(cardId)
  if (!validCardId) {
    return { ok: false, error: 'invalid_input' }
  }

  const supabase = await createClient()

  const { error } = await supabase.rpc('pin_card', { p_card_id: validCardId })

  if (error) {
    console.error('[album] pinCard:', error.message)
    return { ok: false, error: 'unknown' }
  }

  revalidatePath('/album')
  return { ok: true }
}

/**
 * Quita el pin de un cromo.
 */
export async function unpinCard(
  cardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validCardId = parseUuid(cardId)
  if (!validCardId) {
    return { ok: false, error: 'invalid_input' }
  }

  const supabase = await createClient()

  const { error } = await supabase.rpc('unpin_card', { p_card_id: validCardId })

  if (error) {
    console.error('[album] unpinCard:', error.message)
    return { ok: false, error: 'unknown' }
  }

  revalidatePath('/album')
  return { ok: true }
}

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
 *  - 'no_extra_copies': solo tiene 1 copia (mantengo la principal)
 *  - 'not_dismantleable': el tier no permite canjear (ej: legendary)
 *  - 'insufficient_copies': pidió canjear más de lo que tiene como extra
 */
export async function dismantleCard(
  cardId: string,
  count = 1,
): Promise<
  | {
      ok: true
      data: { coinsEarned: number; copiesLeft: number; newBalance: number }
    }
  | { ok: false; error: string }
> {
  const validCardId = parseUuid(cardId)
  if (!validCardId || !Number.isInteger(count) || count < 1) {
    return { ok: false, error: 'invalid_input' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('dismantle_card', {
    p_card_id: validCardId,
    p_count: count,
  })

  if (error) {
    // Match exacto contra los códigos que el RPC tira con raise exception.
    // Ver migration 20260526120000_fix_open_pack_ambiguous_column.sql y siguientes.
    const knownCodes = new Set([
      'not_owned',
      'no_extra_copies',
      'not_dismantleable',
      'insufficient_copies',
    ])
    if (knownCodes.has(error.message)) {
      return { ok: false, error: error.message }
    }
    console.error('[album] dismantleCard:', error.message)
    return { ok: false, error: 'unknown' }
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { ok: false, error: 'empty_result' }
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
}
