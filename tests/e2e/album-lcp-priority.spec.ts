import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

/**
 * E2E de U-17 — la primera fila del álbum carga la foto con prioridad
 * (eager + fetchpriority=high) para ser el LCP sin flash de gradiente; el resto
 * queda lazy.
 *
 * El user e2e arranca SIN cromos (global-setup lo recrea), y un slot missing es
 * una silueta SVG (sin <img>). Para observar los atributos de carga, sembramos
 * dos owned vía admin SDK: 136 (díptico hero, fila 1 → eager) y 165 (beso a la
 * copa, última celda → lazy). Sembrar no rompe los otros specs: el bento sigue
 * con 30 slots y el contador "X / 30" matchea igual.
 */

const CARD_FIRST_ROW = 'francia-11-inicial-argentina' // 136, díptico, fila 1
const CARD_BELOW_FOLD = 'messi-besando-copa' // 165, última celda

// Un cromo owned solo renderiza <img> si la base pública de R2 está configurada
// (resolveCardImage; sin base → placeholder sin <img>). El CI corre sin
// NEXT_PUBLIC_R2_PUBLIC_BASE a propósito (e2e hermético, sin fetch al CDN), así que
// el atributo de carga no es observable ahí. Skippeamos cuando no hay R2 — la lógica
// de QUÉ cromos van priority la cubre el unit test first-row-priority.test.ts.
const HAS_R2 = Boolean(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE)

const slot = (page: import('@playwright/test').Page, n: number) =>
  page.getByRole('button', { name: new RegExp(`cromo ${n}\\b`, 'i') }).first()

test.beforeAll(async () => {
  if (!HAS_R2) return // sin imágenes no hay nada que verificar → no sembramos
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  const email = process.env.PLAYWRIGHT_TEST_USER_EMAIL
  if (!url || !key || !email) throw new Error('[u17] faltan env vars de Supabase/e2e')

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: list, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) throw new Error(`[u17] listUsers: ${listErr.message}`)
  const user = list.users.find((u) => u.email === email)
  if (!user) throw new Error('[u17] no encontré el user e2e (¿corrió global-setup?)')

  const now = new Date().toISOString()
  const rows = [CARD_FIRST_ROW, CARD_BELOW_FOLD].map((card_id) => ({
    user_id: user.id,
    card_id,
    copies: 1,
    is_pinned: false,
    first_obtained_at: now,
    last_obtained_at: now,
  }))
  const { error } = await admin.from('user_cards').upsert(rows, { onConflict: 'user_id,card_id' })
  if (error) throw new Error(`[u17] sembrar user_cards: ${error.message}`)
})

test('la primera fila carga eager+high, el resto lazy', async ({ page }) => {
  test.skip(
    !HAS_R2,
    'sin NEXT_PUBLIC_R2_PUBLIC_BASE los cromos owned caen a placeholder sin <img> (el CI corre sin R2)',
  )
  await page.goto('/album?page=8')
  await expect(page.getByRole('heading', { name: /francia/i })).toBeVisible({ timeout: 15_000 })

  // Fila 1 (díptico 136): la foto es el LCP → eager + fetchpriority=high.
  const firstRowImg = slot(page, 136).locator('img').first()
  await expect(firstRowImg).toBeVisible({ timeout: 15_000 })
  expect(await firstRowImg.getAttribute('loading')).toBe('eager')
  expect(await firstRowImg.getAttribute('fetchpriority')).toBe('high')

  // Below the fold (165): lazy, sin fetchpriority.
  const belowImg = slot(page, 165).locator('img').first()
  await expect(belowImg).toBeVisible()
  expect(await belowImg.getAttribute('loading')).toBe('lazy')
  expect(await belowImg.getAttribute('fetchpriority')).toBeNull()
})
