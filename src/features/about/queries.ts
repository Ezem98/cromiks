import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Créditos de fotos para /about, leídos de card_assets.
 *
 * La RLS de card_assets solo devuelve filas `published` (anon/authenticated), así
 * que un cromo en takedown NO aparece en los créditos (cae con la imagen). Es la
 * mitad de "el takedown saca también el crédito" del kill switch.
 */

const ALBUM_ID = 'eterno-diciembre'

export type PhotoCredit = {
  cardId: string
  cardName: string
  cardNumber: number
  author: string | null
  license: string | null
  sourceKind: string | null
  sourceUrl: string | null
}

export async function getPhotoCredits(): Promise<PhotoCredit[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('card_assets')
    .select(
      'card_id, author, license, source_kind, source_url, cards!inner(name, card_number, album_id)',
    )
    .eq('cards.album_id', ALBUM_ID)

  const rows: PhotoCredit[] = (data ?? []).map((r) => {
    const card = r.cards as unknown as { name: string; card_number: number }
    return {
      cardId: r.card_id,
      cardName: card.name,
      cardNumber: card.card_number,
      author: r.author,
      license: r.license,
      sourceKind: r.source_kind,
      sourceUrl: r.source_url,
    }
  })
  rows.sort((a, b) => a.cardNumber - b.cardNumber)
  return rows
}
