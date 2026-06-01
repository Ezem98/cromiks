import { describe, expect, it } from 'vitest'
import { resolveCardImage } from './resolve-card-image'

const BASE = 'https://assets.cromiks.app'

describe('resolveCardImage', () => {
  it('published + r2_key → URL de R2', () => {
    expect(
      resolveCardImage({ status: 'published', r2_key: 'cromos/eterno-diciembre/x.webp' }, BASE),
    ).toBe('https://assets.cromiks.app/cromos/eterno-diciembre/x.webp')
  })

  it('pending → null (gate)', () => {
    expect(resolveCardImage({ status: 'pending', r2_key: 'x.webp' }, BASE)).toBeNull()
  })

  it('takedown → null (kill switch legal)', () => {
    expect(resolveCardImage({ status: 'takedown', r2_key: 'x.webp' }, BASE)).toBeNull()
  })

  it('published sin r2_key → null', () => {
    expect(resolveCardImage({ status: 'published', r2_key: null }, BASE)).toBeNull()
  })

  it('r2_key vacío o solo espacios → null', () => {
    expect(resolveCardImage({ status: 'published', r2_key: '   ' }, BASE)).toBeNull()
  })

  it('asset null/undefined → null', () => {
    expect(resolveCardImage(null, BASE)).toBeNull()
    expect(resolveCardImage(undefined, BASE)).toBeNull()
  })

  it('sin base configurada → null (fail-safe, nunca arma URL rota)', () => {
    expect(resolveCardImage({ status: 'published', r2_key: 'x.webp' }, '')).toBeNull()
    expect(resolveCardImage({ status: 'published', r2_key: 'x.webp' }, null)).toBeNull()
  })

  it('normaliza barras (base con / final + key con / inicial)', () => {
    expect(
      resolveCardImage({ status: 'published', r2_key: '/x.webp' }, 'https://assets.cromiks.app/'),
    ).toBe('https://assets.cromiks.app/x.webp')
  })

  it('sin override lee NEXT_PUBLIC_R2_PUBLIC_BASE del entorno', () => {
    const prev = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE = 'https://cdn.test'
    try {
      expect(resolveCardImage({ status: 'published', r2_key: 'a.webp' })).toBe(
        'https://cdn.test/a.webp',
      )
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE
      else process.env.NEXT_PUBLIC_R2_PUBLIC_BASE = prev
    }
  })
})
