import { describe, expect, it } from 'vitest'
import { firstRowPriorityIds } from './first-row-priority'

const card = (id: string) => ({ id })

describe('firstRowPriorityIds', () => {
  it('bento: el díptico hero (span 4) llena la fila → solo él priorizado', () => {
    const cards = [card('d136'), card('c137'), card('c138'), card('c139')]
    const spans: Record<string, number> = { d136: 4, c137: 2, c138: 2, c139: 4 }
    const ids = firstRowPriorityIds(cards, 4, (c) => spans[c.id])
    expect([...ids]).toEqual(['d136'])
  })

  it('bento: una fila de 2+2 prioriza las dos celdas de la fila 1', () => {
    const cards = [card('a'), card('b'), card('c'), card('d')]
    const spans: Record<string, number> = { a: 2, b: 2, c: 1, d: 1 }
    const ids = firstRowPriorityIds(cards, 4, (c) => spans[c.id])
    expect([...ids]).toEqual(['a', 'b'])
  })

  it('grilla uniforme: las primeras 7 celdas (span 1) con eagerCols=7', () => {
    const cards = Array.from({ length: 12 }, (_, i) => card(`u${i}`))
    const ids = firstRowPriorityIds(cards, 7, () => 1)
    expect(ids.size).toBe(7)
    expect(ids.has('u0')).toBe(true)
    expect(ids.has('u6')).toBe(true)
    expect(ids.has('u7')).toBe(false)
  })

  it('para si se acaban los cromos antes de llenar la fila', () => {
    const cards = [card('a'), card('b')]
    const ids = firstRowPriorityIds(cards, 7, () => 1)
    expect(ids.size).toBe(2)
  })

  it('lista vacía → set vacío', () => {
    expect(firstRowPriorityIds([], 7, () => 1).size).toBe(0)
  })
})
