import { describe, expect, it } from 'vitest'
import { PHOTO_LAYOUT_RATIO } from '@/lib/cards/photo-layout'
import { cromoDimensions } from './cromo-dimensions'

const PORTRAIT = PHOTO_LAYOUT_RATIO.portrait
const LANDSCAPE = PHOTO_LAYOUT_RATIO.landscape
const PANO = PHOTO_LAYOUT_RATIO.pano

describe('cromoDimensions', () => {
  it('portrait reproduce EXACTO los tamaños históricos (no regresión)', () => {
    expect(cromoDimensions('sm', PORTRAIT)).toEqual({ width: 160, height: 213 })
    expect(cromoDimensions('md', PORTRAIT)).toEqual({ width: 240, height: 320 })
    expect(cromoDimensions('lg', PORTRAIT)).toEqual({ width: 320, height: 427 })
  })

  it('apaisado mantiene el ancho y baja el alto según el ratio', () => {
    expect(cromoDimensions('md', LANDSCAPE)).toEqual({ width: 240, height: 160 })
    expect(cromoDimensions('md', PANO)).toEqual({ width: 240, height: 120 })
    expect(cromoDimensions('lg', LANDSCAPE)).toEqual({ width: 320, height: 213 })
  })

  it('el ancho es estable entre layouts; solo cambia el alto', () => {
    const p = cromoDimensions('md', PORTRAIT)
    const l = cromoDimensions('md', LANDSCAPE)
    expect(l.width).toBe(p.width)
    expect(l.height).toBeLessThan(p.height)
  })

  it('ratio inválido cae a portrait (no NaN/Infinity)', () => {
    expect(cromoDimensions('md', 0)).toEqual({ width: 240, height: 320 })
    expect(cromoDimensions('md', Number.NaN)).toEqual({ width: 240, height: 320 })
  })
})
