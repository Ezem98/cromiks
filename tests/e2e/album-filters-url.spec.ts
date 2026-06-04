import { expect, test } from '@playwright/test'

/**
 * E2E de búsqueda + filtros en URL + colapso mobile (T-10 restaurado).
 *
 * Determinístico e independiente de R2 y del inventario: la filter bar y el
 * buscador renderizan para cualquier user logueado, owned o no. No reclama
 * sobres ni asserta sobre <img> (a diferencia del smoke / lcp-priority).
 */

const tierChip = (page: import('@playwright/test').Page, label: string) =>
  page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })

test('la URL restaura los filtros al montar (share / refresh / page-nav)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/album?page=8&tiers=legendary&own=owned&q=messi')
  await expect(page.getByRole('heading', { name: /francia/i })).toBeVisible({ timeout: 15_000 })

  // El buscador refleja ?q
  await expect(page.getByRole('searchbox', { name: /buscar cromos/i })).toHaveValue('messi')
  // El chip de tier de ?tiers queda activo
  await expect(tierChip(page, 'Legendaria')).toHaveAttribute('aria-pressed', 'true')
  // El de posesión de ?own queda activo
  await expect(page.getByRole('button', { name: 'Las que tengo' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('escribir en la búsqueda sincroniza la URL (replaceState)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/album?page=8')
  await expect(page.getByRole('heading', { name: /francia/i })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('searchbox', { name: /buscar cromos/i }).fill('dibu')
  await expect(page).toHaveURL(/[?&]q=dibu/)
  // Y un tier por la UI también va a la URL
  await tierChip(page, 'Épica').click()
  await expect(page).toHaveURL(/[?&]tiers=epic/)
})

test('mobile: la filter bar colapsa tras "Filtrar" (T-10)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/album?page=8')
  await expect(page.getByRole('heading', { name: /francia/i })).toBeVisible({ timeout: 15_000 })

  // El buscador queda SIEMPRE visible; los chips arrancan colapsados.
  await expect(page.getByRole('searchbox', { name: /buscar cromos/i })).toBeVisible()
  await expect(tierChip(page, 'Legendaria')).toBeHidden()

  // El toggle "Filtrar" despliega el panel.
  const toggle = page.getByRole('button', { name: /^filtrar/i })
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(tierChip(page, 'Legendaria')).toBeVisible()
})
