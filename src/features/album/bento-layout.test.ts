import { describe, expect, it } from 'vitest'
import {
  BENTO_COLS,
  type BentoCell,
  cellAspectClass,
  cellHeightUnits,
  FRANCIA_BENTO,
  getBentoCell,
  LAYOUT_ASPECT_CLASS,
  pageHasBento,
  spanClamp,
} from './bento-layout'

/**
 * Estos tests enforcean las REGLAS DEL SISTEMA del bento (ver bento-layout.ts):
 * cronología, filas que suman 4 sin huecos (no usamos dense), y armonía de
 * alturas por fila. Si tocás el placement y rompés una regla, acá explota
 * ANTES de que se vea un hueco o un salto en la grilla.
 */

const FRANCIA_RANGE = { start: 136, end: 165 } // card_range de la página 8

describe('FRANCIA_BENTO — integridad del placement', () => {
  it('cubre exactamente los cromos 136-165, una vez cada uno, en orden cronológico', () => {
    const cards = FRANCIA_BENTO.map((c) => c.card)
    const expected = Array.from(
      { length: FRANCIA_RANGE.end - FRANCIA_RANGE.start + 1 },
      (_, i) => FRANCIA_RANGE.start + i,
    )
    // Mismo set, mismo orden: el orden de card_number ES la narrativa de la final.
    expect(cards).toEqual(expected)
  })

  it('cada fila suma exactamente 4 columnas en orden (cero huecos sin dense)', () => {
    let fill = 0
    for (const cell of FRANCIA_BENTO) {
      if (fill === BENTO_COLS) fill = 0
      // Si esto falla, la celda no entra en la fila actual → quedaría un hueco.
      expect(fill + cell.span, `cromo ${cell.card} desborda su fila`).toBeLessThanOrEqual(
        BENTO_COLS,
      )
      fill += cell.span
    }
    expect(fill, 'la última fila quedó incompleta').toBe(BENTO_COLS)
  })

  it('armonía de alturas: todas las celdas de una fila miden lo mismo', () => {
    let fill = 0
    let row: BentoCell[] = []
    const rows: BentoCell[][] = []
    for (const cell of FRANCIA_BENTO) {
      if (fill === BENTO_COLS) {
        rows.push(row)
        row = []
        fill = 0
      }
      row.push(cell)
      fill += cell.span
    }
    rows.push(row)

    for (const r of rows) {
      const h0 = cellHeightUnits(r[0])
      for (const cell of r) {
        expect(
          Math.abs(cellHeightUnits(cell) - h0),
          `cromo ${cell.card} desentona en su fila (h=${cellHeightUnits(cell)} vs ${h0})`,
        ).toBeLessThan(1e-9)
      }
    }
  })

  it('bandas/panos full-row = SOLO momentos argentinos (139/147/156); franceses nunca', () => {
    // Los 3 momentos argentinos con tratamiento full-row
    expect(getBentoCell(8, 139)?.span).toBe(BENTO_COLS) // gol Messi 1-0 (banda)
    expect(getBentoCell(8, 147)?.span).toBe(BENTO_COLS) // atajada Dibu (pano)
    expect(getBentoCell(8, 147)?.layout).toBe('pano')
    expect(getBentoCell(8, 156)?.span).toBe(BENTO_COLS) // Montiel (pano)
    expect(getBentoCell(8, 156)?.layout).toBe('pano')
    // Goles/penales franceses: NUNCA full-row (no se glorifican)
    for (const n of [143, 144, 146, 148, 155]) {
      const cell = getBentoCell(8, n)
      expect(cell?.span, `el cromo francés ${n} no debería ser banda`).toBeLessThan(BENTO_COLS)
    }
  })

  it('el alargue es un flurry de 4 celdas chicas (143-146) → la atajada pano (147)', () => {
    for (const n of [143, 144, 145, 146]) {
      const cell = getBentoCell(8, n)
      expect(cell?.layout, `el gol ${n} debería ser celda chica`).toBe('portrait')
      expect(cell?.span).toBe(1)
    }
  })

  it('la tanda: paradas/erradas argentinas anchas, conversiones y penal francés en celdas', () => {
    // Dibu ataja a Coman (150) y Tchouameni la erra (153): alivio argentino, anchas
    for (const n of [150, 153]) {
      expect(getBentoCell(8, n)?.layout).toBe('landscape')
      expect(getBentoCell(8, n)?.span).toBe(2)
    }
    // Penales convertidos en celdas + el penal de Kolo Muani (francés) chico
    for (const n of [151, 152, 154, 155]) {
      expect(getBentoCell(8, n)?.layout).toBe('portrait')
      expect(getBentoCell(8, n)?.span).toBe(1)
    }
  })

  it('el díptico es el 136: landscape full-row con gutter razonable', () => {
    const cell = getBentoCell(8, 136)
    expect(cell?.diptych).toBe(true)
    expect(cell?.layout).toBe('landscape')
    expect(cell?.span).toBe(4)
    const gutter = cell?.gutter ?? 0.5
    expect(gutter).toBeGreaterThan(0.3)
    expect(gutter).toBeLessThan(0.7)
    // El override 16:9 tiene que venir con su ratio (para la armonía de filas).
    expect(cell?.aspectClass).toBe('aspect-[16/9]')
    expect(cell?.ratio).toBeCloseTo(16 / 9)
  })

  it('los picos legendarios rompen la grilla (span > 1)', () => {
    // 141 Di María · 147 atajada · 156 Montiel · 165 beso — las 4 legendarias
    for (const n of [141, 147, 156, 165]) {
      const cell = getBentoCell(8, n)
      expect(cell, `falta la celda del cromo ${n}`).toBeDefined()
      expect(cell?.span ?? 0, `la legendaria ${n} no rompe la grilla`).toBeGreaterThan(1)
    }
    // El clímax (Montiel campeón) es full-row pano.
    expect(getBentoCell(8, 156)?.span).toBe(BENTO_COLS)
    expect(getBentoCell(8, 156)?.layout).toBe('pano')
  })
})

describe('helpers', () => {
  it('pageHasBento: solo francia (página 8) en la beta', () => {
    expect(pageHasBento(8)).toBe(true)
    for (const p of [1, 2, 3, 4, 5, 6, 7, 9, 10]) {
      expect(pageHasBento(p), `la página ${p} no debería tener bento`).toBe(false)
    }
  })

  it('getBentoCell: undefined fuera del bento (→ celda default)', () => {
    expect(getBentoCell(1, 1)).toBeUndefined()
    expect(getBentoCell(8, 1)).toBeUndefined()
    expect(getBentoCell(8, 139)?.layout).toBe('landscape')
  })

  it('cellAspectClass: override del díptico, sino la clase del layout', () => {
    expect(cellAspectClass({ card: 1, layout: 'portrait', span: 1 })).toBe(
      LAYOUT_ASPECT_CLASS.portrait,
    )
    const diptychCell = getBentoCell(8, 136)
    expect(diptychCell && cellAspectClass(diptychCell)).toBe('aspect-[16/9]')
  })

  it('spanClamp acota a la grilla', () => {
    expect(spanClamp(5)).toBe(4)
    expect(spanClamp(0)).toBe(1)
    expect(spanClamp(2)).toBe(2)
    expect(spanClamp(3, 2)).toBe(2)
  })
})
