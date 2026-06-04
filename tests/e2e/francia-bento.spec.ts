import { expect, test } from '@playwright/test'

/**
 * E2E del bento de francia (página 8) — la grilla curada del feature
 * "cromos anchos + bento" (src/features/album/bento-layout.ts).
 *
 * Independiente del ownership: cada slot (owned o missing) es un <button>
 * cuyo accessible name contiene "cromo N" ("<nombre>, cromo 136" /
 * "Cromo 136, no obtenido") — el bento renderiza los 30 siempre.
 *
 * Las assertions estructurales van por BOUNDING BOX (proporciones reales
 * entre celdas), no por clases CSS: si alguien rompe los spans o el aspect,
 * esto falla aunque las clases sigan existiendo.
 */

/** Slot del cromo N (owned o missing), por accessible name. */
const slot = (page: import('@playwright/test').Page, n: number) =>
  page.getByRole('button', { name: new RegExp(`cromo ${n}\\b`, 'i') }).first()

test('bento de francia: 30 slots, díptico full-row, tanda de penales, clímax pano', async ({
  page,
}) => {
  await page.goto('/album?page=8')

  // Estamos en francia (header de la página) y el contador dice "X / 30".
  await expect(page.getByRole('heading', { name: /francia/i })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText(/\/\s*30/).first()).toBeVisible()

  // Los 30 slots del bento presentes (136-165), owned o missing.
  const allSlots = page.getByRole('button', {
    name: /cromo (13[6-9]|1[45]\d|16[0-5])\b/i,
  })
  await expect(allSlots.first()).toBeVisible({ timeout: 15_000 })
  await expect(allSlots).toHaveCount(30)

  // Proporciones del bento (con tolerancia por gaps de la grilla):
  const diptychBox = await slot(page, 136).boundingBox()
  const penaltyBox = await slot(page, 149).boundingBox()
  const otherPenaltyBox = await slot(page, 154).boundingBox()
  const bandBox = await slot(page, 148).boundingBox()
  const climaxBox = await slot(page, 156).boundingBox()
  expect(diptychBox && penaltyBox && otherPenaltyBox && bandBox && climaxBox).toBeTruthy()
  if (!diptychBox || !penaltyBox || !otherPenaltyBox || !bandBox || !climaxBox) return

  // 1. El díptico del XI (136) ocupa la fila entera: ~4× el ancho de una
  //    celda portrait de la tanda (span 4 vs span 1, menos los gaps).
  const ratio = diptychBox.width / penaltyBox.width
  expect(ratio).toBeGreaterThan(3.4)
  expect(ratio).toBeLessThan(4.6)

  // 2. Los penales convertidos son celdas uniformes: 149 y 154 miden lo mismo.
  expect(Math.abs(penaltyBox.width - otherPenaltyBox.width)).toBeLessThan(2)

  // 2b. La banda que abre la tanda (148, 21:9) es full-row pero MÁS BAJA que
  //     el díptico (16:9) — la jerarquía de bandas de la curaduría T-11.
  expect(Math.abs(bandBox.width - diptychBox.width)).toBeLessThan(2)
  expect(bandBox.height).toBeLessThan(diptychBox.height)

  // 3. El clímax (156, pano 2:1) también es full-row pero MÁS BAJO que el
  //    díptico (16:9): mismo ancho, menos alto.
  expect(Math.abs(climaxBox.width - diptychBox.width)).toBeLessThan(2)
  expect(climaxBox.height).toBeLessThan(diptychBox.height)

  // 4. El díptico abre el detalle como cualquier cromo.
  await slot(page, 136).click()
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
})

test('bento con filtros: cae a la grilla uniforme (sin huecos rotos)', async ({ page }) => {
  await page.goto('/album?page=8')
  await expect(page.getByRole('heading', { name: /francia/i })).toBeVisible({
    timeout: 15_000,
  })

  // Activar un filtro de tier (cualquiera): el bento se desactiva → grilla
  // uniforme → las celdas visibles vuelven a ser todas del mismo ancho.
  const legendaryFilter = page.getByRole('button', { name: /legendaria/i }).first()
  await legendaryFilter.click()

  const visible = page.getByRole('button', { name: /cromo (13[6-9]|1[45]\d|16[0-5])\b/i })
  const count = await visible.count()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(30) // el filtro filtra de verdad

  // Todas las celdas visibles miden lo mismo (grilla uniforme, no bento).
  const first = await visible.first().boundingBox()
  const last = await visible.last().boundingBox()
  expect(first && last).toBeTruthy()
  if (!first || !last) return
  expect(Math.abs(first.width - last.width)).toBeLessThan(2)
})
