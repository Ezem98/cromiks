import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { resolveActivePageIds } from './scope'

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
  /** URL/id de YouTube del momento oficial (content.video.source). null si es TODO/vacío. */
  momentVideoUrl: string | null
  /** Segundo de inicio del clip (content.video.start), si está. */
  momentVideoStart: number | null
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
  /** Total de cromos obtenibles (del scope activo; 205 si el álbum no está gateado) */
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

  // 3 fetches en paralelo. La página actual se resuelve DESPUÉS de saber qué
  // páginas están activas (el pageNumber pedido puede caer en una inactiva).
  const [pagesRes, userCardsRes, allAlbumCardsRes] = await Promise.all([
    supabase
      .from('pages')
      .select('id, page_number, title, subtitle, card_range_start, card_range_end, is_active')
      .eq('album_id', ALBUM_ID)
      .order('page_number', { ascending: true }),

    // Inner join a `cards` filtrando por album_id. Esto evita que user_cards
    // huérfanos (card_ids que no existen en cards, o de otro álbum) inflen
    // el contador o ensucien el lookup.
    supabase
      .from('user_cards')
      .select('card_id, copies, is_pinned, first_obtained_at, cards!inner(album_id)')
      .eq('user_id', user.id)
      .eq('cards.album_id', ALBUM_ID),

    // Light query: todas las cards del álbum con su page_id. Sirve para calcular
    // completion por página y los totales del scope activo.
    supabase.from('cards').select('id, page_id').eq('album_id', ALBUM_ID),
  ])

  const allPages = pagesRes.data ?? []
  if (allPages.length === 0) return null

  // Scope activo: pages.is_active gatea la beta (roll_cards solo sortea de páginas
  // activas). El álbum refleja el mismo set para no mostrar páginas que el usuario
  // nunca va a poder llenar (T-04). Si ninguna está activa → no gateado, mostrar todo.
  const activePageIds = resolveActivePageIds(allPages)
  const activeIdSet = activePageIds ? new Set(activePageIds) : null
  const effectivePages = activeIdSet ? allPages.filter((p) => activeIdSet.has(p.id)) : allPages

  // Página actual: normalizar el pageNumber pedido al set efectivo. Si pidió una
  // página inactiva (ej. /album?page=1 con solo croacia live), caemos a la primera.
  const currentPageRow =
    effectivePages.find((p) => p.page_number === pageNumber) ?? effectivePages[0]
  if (!currentPageRow) return null

  // Cards de la página actual (join por page_id)
  const cardsRes = await supabase
    .from('cards')
    .select('id, card_number, name, description, rarity, metadata, content, legendary_brief')
    .eq('album_id', ALBUM_ID)
    .eq('page_id', currentPageRow.id)
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
    const content = (card.content ?? {}) as {
      photo?: { source?: string }
      video?: { source?: string; start?: number }
    }
    const photoSource = content?.photo?.source
    const hasRealPhoto = !!photoSource && photoSource !== '' && photoSource !== 'TODO'

    const videoSource = content?.video?.source
    const hasMoment = !!videoSource && videoSource !== '' && videoSource !== 'TODO'

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
      momentVideoUrl: hasMoment ? (videoSource as string) : null,
      momentVideoStart:
        hasMoment && typeof content.video?.start === 'number' ? content.video.start : null,
      owned: !!ownership,
      copies: ownership?.copies ?? 0,
      isPinned: ownership?.isPinned ?? false,
      firstObtainedAt: ownership?.firstObtainedAt ?? null,
    }
  })

  const pages: AlbumPage[] = effectivePages.map((p) => ({
    id: p.id,
    pageNumber: p.page_number,
    title: p.title,
    subtitle: p.subtitle,
    cardRangeStart: p.card_range_start,
    cardRangeEnd: p.card_range_end,
  }))

  const currentPage: AlbumPage = {
    id: currentPageRow.id,
    pageNumber: currentPageRow.page_number,
    title: currentPageRow.title,
    subtitle: currentPageRow.subtitle,
    cardRangeStart: currentPageRow.card_range_start,
    cardRangeEnd: currentPageRow.card_range_end,
  }

  const pageOwned = cards.filter((c) => c.owned).length

  // Completion por página + totales del SCOPE ACTIVO. Si el álbum está gateado,
  // ignoramos cromos fuera del set activo: así "X / N" refleja lo obtenible y un
  // test user con inventario viejo (cromos de páginas inactivas) no infla el total.
  const pageIdToNumber = new Map(effectivePages.map((p) => [p.id, p.page_number]))
  const pageCompletion: PageCompletionMap = new Map()
  let totalCards = 0
  let totalOwned = 0

  for (const card of allAlbumCardsRes.data ?? []) {
    if (!card.page_id) continue // card sin página asignada, raro pero defensivo
    if (activeIdSet && !activeIdSet.has(card.page_id)) continue // fuera del scope activo

    totalCards += 1
    const owned = userCardsMap.has(card.id)
    if (owned) totalOwned += 1

    const pageNum = pageIdToNumber.get(card.page_id)
    if (pageNum === undefined) continue
    const entry = pageCompletion.get(pageNum) ?? { owned: 0, total: 0 }
    entry.total += 1
    if (owned) entry.owned += 1
    pageCompletion.set(pageNum, entry)
  }

  return {
    pages,
    currentPage,
    cards,
    totalCards,
    totalOwned,
    pageOwned,
    pageTotalCards: cards.length,
    pageCompletion,
  }
}
