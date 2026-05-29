'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'
import { track } from '@/lib/analytics'
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
 *  - 'auth_required'    → user sin sesión (la page filtra antes, defensivo)
 *  - 'pack_not_found'   → pack no existe o no pertenece al user
 *  - 'pack_not_pending' → pack en estado desconocido (no opened, no expired)
 *  - 'pack_expired'     → pack venció antes de abrirse
 *
 * Post B-22: el RPC es idempotente. "Ya abierto" devuelve ok con las mismas
 * cartas (replay path), no es error. Ver migration
 * supabase/migrations/20260527120000_make_open_pack_idempotent.sql
 */

const KNOWN_OPEN_PACK_CODES = new Set([
  'auth_required',
  'pack_not_found',
  'pack_not_pending',
  'pack_expired',
])

const openPackSchema = z.object({
  packId: z.uuid(),
})

export const openPack = defineAction({
  name: 'openPack',
  schema: openPackSchema,
  rateLimit: 'openPack',
  expectedErrors: [
    'auth_required',
    'pack_not_found',
    'pack_not_pending',
    'pack_expired',
    'empty_result',
  ],
  fn: async ({ packId }, { userId, supabase }) => {
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

    const coinsEarned = first.coins_earned ?? 0
    const newCardsCount = cards.filter((c) => c.isNew).length
    // El RPC expone explícitamente `was_replay` (ver migration
    // supabase/migrations/20260529125447_open_pack_explicit_was_replay.sql).
    // Antes lo inferíamos con `coinsEarned === 0 && newCardsCount === 0`, pero
    // ese gate fallaba en la PRIMERA apertura legítima del onboarding (todas las
    // cartas nuevas + cero monedas) y emitía dos veces.
    const wasReplay = first.was_replay === true

    if (!wasReplay) {
      await track(
        'pack_opened',
        {
          pack_type: first.pack_type ?? 'daily',
          cards_count: cards.length,
          new_cards_count: newCardsCount,
          coins_earned: coinsEarned,
        },
        { distinctId: userId },
      )
    }

    return {
      ok: true,
      data: {
        packType: first.pack_type ?? 'daily',
        cards,
        coinsEarned,
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
