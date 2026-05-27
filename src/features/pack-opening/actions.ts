'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseUuid } from '@/lib/validation'
import type { OpenPackResult, RevealedCard } from './types'
import { parseTier } from './types'

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
  const validPackId = parseUuid(packId)
  if (!validPackId) {
    return { ok: false, error: 'invalid_input' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('open_pack', { p_pack_id: validPackId })

  if (error) {
    // El RPC tira raise exception con el código exacto (sin texto extra).
    // Ver supabase/migrations/* para el contrato de mensajes. Match exacto
    // en vez de substring para no caer al branch unknown si cambia el wording.
    const knownCodes = new Set(['not_found', 'already_opened', 'not_owner'])
    if (knownCodes.has(error.message)) {
      return { ok: false, error: error.message }
    }
    console.error('[pack-opening] openPack:', error.message)
    return { ok: false, error: 'unknown' }
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { ok: false, error: 'empty_result' }
  }

  // El RPC devuelve un array de filas, cada una un cromo + metadata del pack.
  // Los 3 campos meta (pack_type, coins_earned, coins_after) son iguales en todas las filas.
  //
  // NOTA: las output columns out_card_id y out_card_number tienen ese prefijo
  // para evitar la ambigüedad con user_cards.card_id / cards.card_number dentro
  // de la función SQL. Ver supabase/migrations/20260526120000_fix_open_pack_ambiguous_column.sql
  const first = data[0]

  // Filtrar rows con campos críticos null (join roto del lado del RPC) — sin esto
  // un cardId null rompe key={card.cardId} y la animación de stack (B-10).
  // parseTier también descarta tiers desconocidos (B-11).
  const cards: RevealedCard[] = data
    .map((row): RevealedCard | null => {
      const tier = parseTier(row.card_tier)
      if (!row.out_card_id || !tier) return null
      return {
        cardId: row.out_card_id,
        name: row.card_name,
        playerRole: row.card_role ?? '',
        number: row.out_card_number ?? 0,
        tier,
        isNew: row.is_new,
        reward: row.coin_reward,
        imageUrl: row.image_url ?? null,
        seed: row.out_card_id, // usar cardId como seed determinístico
      }
    })
    .filter((c): c is RevealedCard => c !== null)

  if (cards.length === 0) {
    return { ok: false, error: 'empty_result' }
  }

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
