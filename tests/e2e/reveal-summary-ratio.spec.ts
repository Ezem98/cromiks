import { expect, test } from '@playwright/test'

/**
 * E2E de T-15 — el summary del reveal respeta el ratio de cada cromo.
 *
 * Usa el debug mode (`?debug=true`, mock data sin DB): un cromo landscape
 * (Dibu) entre portraits. Determinístico e independiente de R2 (los mocks no
 * tienen foto → placeholder, pero el ratio del `.cromo` se mide igual).
 */
test('el summary muestra los cromos anchos en su ratio (no recortados a 3:4)', async ({ page }) => {
  await page.goto('/open/00000000-0000-4000-8000-000000000000?debug=true')

  const skip = page.getByRole('button', { name: /saltar animaci[oó]n/i })
  await expect(skip).toBeVisible({ timeout: 20_000 })
  await skip.click()
  await expect(page.getByRole('link', { name: /ver en el [aá]lbum/i })).toBeVisible({
    timeout: 10_000,
  })

  const cromo = (name: RegExp) => page.locator('.cromo').filter({ hasText: name }).first()

  // Dibu es landscape en el mock → ancho > alto (ratio ~1.5).
  const dibu = await cromo(/dibu/i).boundingBox()
  // Paredes es portrait → alto > ancho.
  const paredes = await cromo(/paredes/i).boundingBox()
  expect(dibu && paredes).toBeTruthy()
  if (!dibu || !paredes) return

  expect(dibu.width / dibu.height).toBeGreaterThan(1.3)
  expect(paredes.width / paredes.height).toBeLessThan(0.9)
})
