import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Data fetchers para el álbum.
 *
 * El álbum de Cromiks tiene 10 páginas (cada una con ~20-22 cromos),
 * total 205 cromos.
 *
 * Vista por página: el user navega de a 1 página por vez para que el grid
 * quede limpio en mobile (sino sería un scroll infinito).
 */

const ALBUM_ID = 'eterno-diciembre'
const TOTAL_PAGES = 10

export type AlbumPage = {
  id: string
  pageNumber: number
  title: string
  subtitle: string | null
  cardRangeStart: number
  cardRangeEnd: number
}

export type AlbumCardSlot = {
  id: string
  cardNumber: number
  name: string
  /** Bio o descripción del jugador / momento */
  description: string | null
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  playerRole: string | null
  number: string | null
  imageUrl: string | null
  /** Solo para legendaries: data del momento histórico (jsonb raw) */
  legendaryBrief: Record<string, unknown> | null
  /** Si el user tiene esta carta */
  owned: boolean
  /** Cuántas copias tiene (0 si no la tiene) */
  copies: number
  /** Está pineada en el perfil del user */
  isPinned: boolean
  /** Fecha de primera obtención (null si no la tiene) */
  firstObtainedAt: string | null
}

/** Completion por página del álbum: page_number → { owned, total } */
export type PageCompletionMap = Map<number, { owned: number; total: number }>

export type AlbumData = {
  pages: AlbumPage[]
  currentPage: AlbumPage
  cards: AlbumCardSlot[]
  /** Total de cards únicas del álbum (siempre 205) */
  totalCards: number
  /** Total de cards únicas que tiene el user (across all pages) */
  totalOwned: number
  /** Cards de la página actual que tiene el user */
  pageOwned: number
  /** Cards totales en la página actual */
  pageTotalCards: number
  /** Cuántos cromos tiene el user en cada página, para visualizar en el nav */
  pageCompletion: PageCompletionMap
}

/**
 * Trae todo lo necesario para renderizar una página del álbum.
 *
 * - `pageNumber`: la página a mostrar (1..10). Si está fuera de rango se
 *   normaliza al rango válido.
 *
 * Retorna null si no hay user logueado o si la página no existe.
 *
 * Estrategia: 3 queries en paralelo:
 *  1. Todas las páginas (light, solo metadata para la nav)
 *  2. Cards de la página actual (joined por page_id)
 *  3. user_cards del user completo (para saber qué tiene en cada slot)
 *
 * El join se hace en JS (Map por card_id) en lugar de en SQL para evitar
 * un join 1:1 con WHERE complejo.
 */
export async function getAlbumData(pageNumber = 1): Promise<AlbumData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Normalizar pageNumber al rango válido
  const targetPage = Math.min(Math.max(1, pageNumber), TOTAL_PAGES)

  // 4 fetches en paralelo
  const [pagesRes, currentPageRes, userCardsRes, allAlbumCardsRes] = await Promise.all([
    supabase
      .from('pages')
      .select('id, page_number, title, subtitle, card_range_start, card_range_end')
      .eq('album_id', ALBUM_ID)
      .order('page_number', { ascending: true }),

    supabase
      .from('pages')
      .select('id, page_number, title, subtitle, card_range_start, card_range_end')
      .eq('album_id', ALBUM_ID)
      .eq('page_number', targetPage)
      .single(),

    // Inner join a `cards` filtrando por album_id. Esto evita que user_cards
    // huérfanos (card_ids que no existen en cards, o de otro álbum) inflen
    // el contador o ensucien el lookup. Cualquier user_card cuyo card_id no
    // matchee con una card del álbum eterno-diciembre se descarta acá.
    supabase
      .from('user_cards')
      .select('card_id, copies, is_pinned, first_obtained_at, cards!inner(album_id)')
      .eq('user_id', user.id)
      .eq('cards.album_id', ALBUM_ID),

    // Light query: todas las cards del álbum con su page_id.
    // Solo 205 rows, 2 columns. Sirve para calcular completion por página
    // sin necesidad de fetchear cards de cada página por separado.
    supabase.from('cards').select('id, page_id').eq('album_id', ALBUM_ID),
  ])

  if (!currentPageRes.data) return null

  // Cards de la página actual (join por page_id)
  const cardsRes = await supabase
    .from('cards')
    .select('id, card_number, name, description, rarity, metadata, content, legendary_brief')
    .eq('album_id', ALBUM_ID)
    .eq('page_id', currentPageRes.data.id)
    .order('card_number', { ascending: true })

  // Mapa de user_cards para lookup O(1)
  const userCardsMap = new Map<
    string,
    { copies: number; isPinned: boolean; firstObtainedAt: string | null }
  >()
  for (const uc of userCardsRes.data ?? []) {
    userCardsMap.set(uc.card_id, {
      copies: uc.copies ?? 0,
      isPinned: uc.is_pinned ?? false,
      firstObtainedAt: uc.first_obtained_at ?? null,
    })
  }

  // Mergear cards con ownership info
  const cards: AlbumCardSlot[] = (cardsRes.data ?? []).map((card) => {
    const ownership = userCardsMap.get(card.id)
    const metadata = (card.metadata ?? {}) as {
      position?: string
      club?: string
      number?: string | number
    }
    const content = (card.content ?? {}) as { photo?: { source?: string } }
    const photoSource = content?.photo?.source
    const hasRealPhoto = !!photoSource && photoSource !== '' && photoSource !== 'TODO'

    return {
      id: card.id,
      cardNumber: card.card_number,
      name: card.name,
      description: card.description ?? null,
      tier: card.rarity,
      playerRole:
        metadata.position || metadata.club
          ? [metadata.position, metadata.club].filter(Boolean).join(' · ')
          : null,
      number: metadata.number ? String(metadata.number) : null,
      imageUrl: hasRealPhoto ? photoSource : null,
      legendaryBrief:
        card.legendary_brief && typeof card.legendary_brief === 'object'
          ? (card.legendary_brief as Record<string, unknown>)
          : null,
      owned: !!ownership,
      copies: ownership?.copies ?? 0,
      isPinned: ownership?.isPinned ?? false,
      firstObtainedAt: ownership?.firstObtainedAt ?? null,
    }
  })

  const pages: AlbumPage[] = (pagesRes.data ?? []).map((p) => ({
    id: p.id,
    pageNumber: p.page_number,
    title: p.title,
    subtitle: p.subtitle,
    cardRangeStart: p.card_range_start,
    cardRangeEnd: p.card_range_end,
  }))

  const currentPage: AlbumPage = {
    id: currentPageRes.data.id,
    pageNumber: currentPageRes.data.page_number,
    title: currentPageRes.data.title,
    subtitle: currentPageRes.data.subtitle,
    cardRangeStart: currentPageRes.data.card_range_start,
    cardRangeEnd: currentPageRes.data.card_range_end,
  }

  const pageOwned = cards.filter((c) => c.owned).length

  // Calcular completion por página: para cada page_id contar cuántas cards
  // tiene el user vs el total. Después convertir page_id → page_number para
  // que el nav pueda matchearlo por número (más conveniente que por uuid).
  const pageIdToNumber = new Map(pages.map((p) => [p.id, p.pageNumber]))
  const pageCompletion: PageCompletionMap = new Map()

  for (const card of allAlbumCardsRes.data ?? []) {
    if (!card.page_id) continue // card sin página asignada, raro pero defensivo
    const pageNumber = pageIdToNumber.get(card.page_id)
    if (pageNumber === undefined) continue

    const entry = pageCompletion.get(pageNumber) ?? { owned: 0, total: 0 }
    entry.total += 1
    if (userCardsMap.has(card.id)) {
      entry.owned += 1
    }
    pageCompletion.set(pageNumber, entry)
  }

  return {
    pages,
    currentPage,
    cards,
    totalCards: 205,
    totalOwned: userCardsMap.size,
    pageOwned,
    pageTotalCards: cards.length,
    pageCompletion,
  }
}
