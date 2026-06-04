import type { AlbumFilters } from './components/album-filter-bar'

/**
 * Serialización de los filtros del álbum a/desde la URL (querystring), para que
 * sobrevivan page-nav, back/forward, refresh y share de una vista filtrada.
 *
 * Params: `q` (búsqueda), `own` (owned|missing; ausente = all), `pinned` (1),
 * `tiers` (csv). Los defaults se OMITEN → URLs limpias. Puro y testeable; la
 * sincronización con la URL la maneja AlbumView (client) vía history.replaceState.
 */

const TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
type Tier = (typeof TIERS)[number]

/** Lo mínimo que necesitamos de URLSearchParams / ReadonlyURLSearchParams. */
type ParamsLike = { get(name: string): string | null }

function isTier(value: string): value is Tier {
  return (TIERS as readonly string[]).includes(value)
}

export function parseAlbumFilters(params: ParamsLike): AlbumFilters {
  const own = params.get('own')
  const ownership = own === 'owned' || own === 'missing' ? own : 'all'

  // Tiers válidos, deduplicados preservando orden.
  const seen = new Set<Tier>()
  const tiers: Tier[] = []
  for (const raw of (params.get('tiers') ?? '').split(',')) {
    const t = raw.trim()
    if (isTier(t) && !seen.has(t)) {
      seen.add(t)
      tiers.push(t)
    }
  }

  return {
    q: params.get('q')?.trim() ?? '',
    tiers,
    ownership,
    pinnedOnly: params.get('pinned') === '1',
  }
}

/** Solo los params de filtro (sin `page`). Omite defaults para URLs limpias. */
export function albumFiltersToParams(filters: AlbumFilters): URLSearchParams {
  const p = new URLSearchParams()
  const q = filters.q.trim()
  if (q) p.set('q', q)
  if (filters.ownership !== 'all') p.set('own', filters.ownership)
  if (filters.pinnedOnly) p.set('pinned', '1')
  if (filters.tiers.length > 0) p.set('tiers', filters.tiers.join(','))
  return p
}

/** Querystring de filtros (sin `page`), '' si no hay ninguno. Para los page-links. */
export function albumFiltersToQuery(filters: AlbumFilters): string {
  return albumFiltersToParams(filters).toString()
}
