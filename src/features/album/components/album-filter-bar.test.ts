import { describe, expect, it } from 'vitest'
import type { AlbumCardSlot } from '../queries'
import { applyFilters, defaultFilters, matchesQuery } from './album-filter-bar'

const card = (over: Partial<AlbumCardSlot>): AlbumCardSlot => ({
  id: 'x',
  cardNumber: 145,
  name: 'Messi',
  description: null,
  tier: 'legendary',
  playerRole: null,
  number: null,
  imageUrl: null,
  layout: 'portrait',
  legendaryBrief: null,
  momentVideoUrl: null,
  momentVideoStart: null,
  momentVideoEnd: null,
  owned: true,
  copies: 1,
  isPinned: false,
  firstObtainedAt: null,
  ...over,
})

describe('matchesQuery', () => {
  it('búsqueda vacía o whitespace matchea todo', () => {
    expect(matchesQuery(card({}), '')).toBe(true)
    expect(matchesQuery(card({}), '   ')).toBe(true)
  })

  it('matchea por nombre, case/acentos del texto del cromo aparte', () => {
    expect(matchesQuery(card({ name: 'Di María' }), 'maría')).toBe(true)
    expect(matchesQuery(card({ name: 'Messi' }), 'MES')).toBe(true)
    expect(matchesQuery(card({ name: 'Messi' }), 'mbappé')).toBe(false)
  })

  it('matchea por número de cromo', () => {
    expect(matchesQuery(card({ cardNumber: 147 }), '147')).toBe(true)
    expect(matchesQuery(card({ cardNumber: 147 }), '47')).toBe(true)
    expect(matchesQuery(card({ cardNumber: 147 }), '99')).toBe(false)
  })
})

describe('applyFilters con q', () => {
  const cards = [
    card({ id: 'a', name: 'Messi', tier: 'legendary', cardNumber: 145 }),
    card({ id: 'b', name: 'Dibu Martínez', tier: 'epic', cardNumber: 150, owned: false }),
  ]

  it('combina la búsqueda con el resto de filtros', () => {
    expect(applyFilters(cards, { ...defaultFilters, q: 'dibu' }).map((c) => c.id)).toEqual(['b'])
    // 145 incluye "14"
    expect(applyFilters(cards, { ...defaultFilters, q: '14' }).map((c) => c.id)).toEqual(['a'])
    // q + ownership: 'dibu' es missing → owned filter lo descarta
    expect(applyFilters(cards, { ...defaultFilters, q: 'dibu', ownership: 'owned' })).toHaveLength(
      0,
    )
  })

  it('q vacía no filtra nada', () => {
    expect(applyFilters(cards, defaultFilters)).toHaveLength(2)
  })
})
