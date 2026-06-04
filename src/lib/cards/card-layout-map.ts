import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { type PhotoLayout, parsePhotoLayout } from './photo-layout'

/**
 * Map card_id → layout de la foto (portrait | landscape | pano), leyendo
 * `cards.content`. Espejo de `getCardImageMap` para superficies que necesitan el
 * ratio del cromo sin tenerlo ya proyectado (el reveal del sobre: open_pack no
 * devuelve el layout, ver T-15). Se llama en paralelo al image-map, así no agrega
 * un round-trip en serie al abrir.
 */

type ServerClient = Awaited<ReturnType<typeof createClient>>

export async function getCardLayoutMap(
  supabase: ServerClient,
  cardIds: string[],
): Promise<Map<string, PhotoLayout>> {
  const map = new Map<string, PhotoLayout>()
  if (cardIds.length === 0) return map

  const { data } = await supabase.from('cards').select('id, content').in('id', cardIds)
  for (const row of data ?? []) {
    map.set(row.id, parsePhotoLayout(row.content))
  }
  return map
}
