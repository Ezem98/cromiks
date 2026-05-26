'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OpenPackResult, RevealedCard, Tier } from './types'

/**
 * Server action: abre un sobre.
 *
 * Llama a la SQL function `open_pack` que:
 *  - Asigna cromos al user (incrementa user_cards.copies o crea row nueva)
 *  - Marca el pack como 'opened'
 *  - Devuelve los cromos revelados con metadata
 *
 * Si el pack no existe, no es del user, o ya está abierto → error.
 *
 * Después del open, el sobre está consumido y no se puede reabrir.
 * El resultado se cachea en client-side state para que las animaciones
 * puedan correr sin re-fetch.
 */
export async function openPack(
  packId: string,
): Promise<{ ok: true; data: OpenPackResult } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('open_pack', { p_pack_id: packId })

  if (error) {
    if (error.message.includes('not_found')) {
      return { ok: false, error: 'not_found' }
    }
    if (error.message.includes('already_opened')) {
      return { ok: false, error: 'already_opened' }
    }
    if (error.message.includes('not_owner')) {
      return { ok: false, error: 'not_owner' }
    }
    console.error('[pack-opening] openPack:', error.message)
    return { ok: false, error: 'unknown' }
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { ok: false, error: 'empty_result' }
  }

  // El RPC devuelve un array de filas, cada una un cromo + metadata del pack.
  // Los 3 campos meta (pack_type, coins_earned, coins_after) son iguales en todas las filas.
  const first = data[0]
  const cards: RevealedCard[] = data.map((row) => ({
    cardId: row.card_id,
    name: row.card_name,
    playerRole: row.card_role ?? '',
    number: row.card_number ?? 0,
    tier: row.card_tier as Tier,
    isNew: row.is_new,
    reward: row.coin_reward,
    imageUrl: row.image_url ?? null,
    seed: row.card_id, // usar cardId como seed determinístico
  }))

  return {
    ok: true,
    data: {
      packType: first.pack_type ?? 'daily',
      cards,
      coinsEarned: first.coins_earned ?? 0,
      coinsAfter: first.coins_after ?? 0,
    },
  }
}

/**
 * Revalida el home después de abrir un sobre, para que el sobre pendiente
 * desaparezca y los cromos nuevos se reflejen en el progreso del álbum.
 */
export async function revalidateHomeAfterOpen(): Promise<void> {
  revalidatePath('/')
}
