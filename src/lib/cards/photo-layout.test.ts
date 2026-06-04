import { describe, expect, it } from 'vitest'
import { PHOTO_LAYOUT_RATIO, parsePhotoLayout } from './photo-layout'

describe('parsePhotoLayout', () => {
  it('lee el layout del bloque content.photo', () => {
    expect(parsePhotoLayout({ photo: { layout: 'landscape' } })).toBe('landscape')
    expect(parsePhotoLayout({ photo: { layout: 'pano' } })).toBe('pano')
    expect(parsePhotoLayout({ photo: { layout: 'portrait' } })).toBe('portrait')
  })

  it('default portrait cuando el layout falta o es desconocido', () => {
    expect(parsePhotoLayout({ photo: {} })).toBe('portrait')
    expect(parsePhotoLayout({ photo: { layout: 'cinemascope' } })).toBe('portrait')
  })

  it('default portrait para content vacío/ausente o de placeholder (array)', () => {
    expect(parsePhotoLayout(null)).toBe('portrait')
    expect(parsePhotoLayout(undefined)).toBe('portrait')
    expect(parsePhotoLayout([])).toBe('portrait') // seed guarda [] en placeholders
    expect(parsePhotoLayout({})).toBe('portrait')
    expect(parsePhotoLayout('nonsense')).toBe('portrait')
  })

  it('el ratio por layout es w/h ascendente (portrait < landscape < pano)', () => {
    expect(PHOTO_LAYOUT_RATIO.portrait).toBeCloseTo(3 / 4)
    expect(PHOTO_LAYOUT_RATIO.landscape).toBeCloseTo(3 / 2)
    expect(PHOTO_LAYOUT_RATIO.pano).toBeCloseTo(2)
    expect(PHOTO_LAYOUT_RATIO.portrait).toBeLessThan(PHOTO_LAYOUT_RATIO.landscape)
    expect(PHOTO_LAYOUT_RATIO.landscape).toBeLessThan(PHOTO_LAYOUT_RATIO.pano)
  })
})
