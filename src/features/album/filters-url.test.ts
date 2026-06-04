import { describe, expect, it } from 'vitest'
import { defaultFilters } from './components/album-filter-bar'
import { albumFiltersToParams, albumFiltersToQuery, parseAlbumFilters } from './filters-url'

const parse = (qs: string) => parseAlbumFilters(new URLSearchParams(qs))

describe('parseAlbumFilters', () => {
  it('querystring vacía → filtros default', () => {
    expect(parse('')).toEqual(defaultFilters)
  })

  it('lee q, own, pinned y tiers', () => {
    expect(parse('q=messi&own=owned&pinned=1&tiers=epic,legendary')).toEqual({
      q: 'messi',
      ownership: 'owned',
      pinnedOnly: true,
      tiers: ['epic', 'legendary'],
    })
  })

  it('own desconocido → all; pinned solo con "1"', () => {
    expect(parse('own=cualquiera').ownership).toBe('all')
    expect(parse('pinned=true').pinnedOnly).toBe(false)
    expect(parse('pinned=1').pinnedOnly).toBe(true)
  })

  it('descarta tiers inválidos y deduplica preservando orden', () => {
    expect(parse('tiers=epic,foo,epic,rare').tiers).toEqual(['epic', 'rare'])
  })

  it('trimea q', () => {
    expect(parse('q=%20%20dibu%20%20').q).toBe('dibu')
  })
})

describe('albumFiltersToParams / toQuery', () => {
  it('omite defaults → query vacía', () => {
    expect(albumFiltersToQuery(defaultFilters)).toBe('')
  })

  it('serializa solo lo no-default', () => {
    const q = albumFiltersToQuery({
      q: 'messi',
      ownership: 'missing',
      pinnedOnly: true,
      tiers: ['rare'],
    })
    const p = new URLSearchParams(q)
    expect(p.get('q')).toBe('messi')
    expect(p.get('own')).toBe('missing')
    expect(p.get('pinned')).toBe('1')
    expect(p.get('tiers')).toBe('rare')
  })

  it('round-trip: parse(serialize(f)) === f', () => {
    const f = {
      q: 'di maría',
      ownership: 'owned' as const,
      pinnedOnly: true,
      tiers: ['legendary' as const],
    }
    expect(parseAlbumFilters(albumFiltersToParams(f))).toEqual(f)
  })

  it('ownership=all no escribe el param', () => {
    expect(albumFiltersToParams(defaultFilters).has('own')).toBe(false)
  })
})
