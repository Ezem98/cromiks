import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { resolveCardImage } from './resolve-card-image'

/**
 * Helpers de lectura de imagen de cromo desde card_assets (T5).
 *
 * Las superficies que muestran cromos (álbum, /cromo, /u, OG) traen acá la fila
 * de card_assets y la pasan por resolveCardImage. La RLS de card_assets solo
 * devuelve filas `published`, así que un cromo pending/takedown/sin asset
 * simplemente no aparece → la superficie usa null → CromoPlaceholder.
 *
 * Esto reemplaza el viejo sentinel `content.photo.source !== 'TODO'` que estaba
 * duplicado en las 4 superficies y que además leía un host externo.
 */

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Map card_id → URL servible, para superficies que renderizan varios cromos. */
export async function getCardImageMap(
  supabase: ServerClient,
  cardIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (cardIds.length === 0) return map

  const { data } = await supabase
    .from('card_assets')
    .select('card_id, status, r2_key')
    .in('card_id', cardIds)

  for (const row of data ?? []) {
    const url = resolveCardImage(row)
    if (url) map.set(row.card_id, url)
  }
  return map
}

/** URL servible de un solo cromo, para /cromo y la OG image. */
export async function getCardImage(supabase: ServerClient, cardId: string): Promise<string | null> {
  const { data } = await supabase
    .from('card_assets')
    .select('status, r2_key')
    .eq('card_id', cardId)
    .maybeSingle()

  return resolveCardImage(data)
}
