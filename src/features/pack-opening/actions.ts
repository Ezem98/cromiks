'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'
import type { RevealedCard } from './types'
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
 *
 * Contrato de errores del RPC (match exacto contra `error.message`):
 *  - 'not_found' | 'already_opened' | 'not_owner'
 */

const KNOWN_OPEN_PACK_CODES = new Set(['not_found', 'already_opened', 'not_owner'])

const openPackSchema = z.object({
  packId: z.uuid(),
})

export const openPack = defineAction({
  name: 'openPack',
  schema: openPackSchema,
  rateLimit: 'openPack',
  expectedErrors: ['not_found', 'already_opened', 'not_owner', 'empty_result'],
  fn: async ({ packId }, { supabase }) => {
    const { data, error } = await supabase.rpc('open_pack', { p_pack_id: packId })

    if (error) {
      if (KNOWN_OPEN_PACK_CODES.has(error.message)) {
        return { ok: false, code: error.message }
      }
      return { ok: false, code: 'unknown', message: error.message }
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { ok: false, code: 'empty_result' }
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
      return { ok: false, code: 'empty_result' }
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
  },
})

/**
 * Revalida el home después de abrir un sobre, para que el sobre pendiente
 * desaparezca y los cromos nuevos se reflejen en el progreso del álbum.
 */
export async function revalidateHomeAfterOpen(): Promise<void> {
  revalidatePath('/')
}
