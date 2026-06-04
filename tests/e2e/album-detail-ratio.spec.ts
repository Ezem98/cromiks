import { expect, test } from '@playwright/test'

/**
 * E2E del detalle del cromo respetando el ratio apaisado (T-08).
 *
 * El modal de detalle muestra `<Cromo>` en el ratio BASE de la foto
 * (content.photo.layout): portrait 3:4, landscape 3:2, pano 2:1. NO el override
 * de GRILLA del bento (139 se muestra banda 21:9 en la página, pero su detalle
 * es 3:2; el díptico 136 se muestra 16:9 en la grilla, pero su detalle es 3:2
 * con el gutter de álbum físico).
 *
 * Determinístico e independiente del ownership: el modal abre para owned Y
 * missing, y `card.layout`/`imageUrl` salen de la query, no del inventario. El
 * user e2e arranca sin cromos → todos missing (atenuados), pero el ratio del
 * `.cromo` y el gutter se miden igual. Por eso no depende del estado del backend
 * (a diferencia del smoke, T-14).
 *
 * Las assertions van por BOUNDING BOX del `.cromo` dentro del dialog: si alguien
 * vuelve a clavar el cromo en portrait, el ratio deja de matchear y esto falla.
 */

const slot = (page: import('@playwright/test').Page, n: number) =>
  page.getByRole('button', { name: new RegExp(`cromo ${n}\\b`, 'i') }).first()

/** Abre el detalle del cromo N, devuelve el ratio w/h del `.cromo` del dialog. */
async function openDetailRatio(
  page: import('@playwright/test').Page,
  n: number,
  shotName: string,
): Promise<{ ratio: number; gutters: number }> {
  await slot(page, n).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 10_000 })

  const cromo = dialog.locator('.cromo').first()
  await expect(cromo).toBeVisible()
  const box = await cromo.boundingBox()
  if (!box) throw new Error(`sin boundingBox del cromo ${n}`)

  await cromo.screenshot({ path: `test-results/t08-detail/cromo-${shotName}-${n}.png` })
  const gutters = await cromo.getByTestId('cromo-diptych-gutter').count()

  // Cerrar el modal antes del próximo (Radix cierra con Escape).
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden({ timeout: 10_000 })

  return { ratio: box.width / box.height, gutters }
}

test('el detalle respeta el ratio base de cada layout (portrait / landscape / pano / díptico)', async ({
  page,
}) => {
  await page.goto('/album?page=8')
  await expect(page.getByRole('heading', { name: /francia/i })).toBeVisible({ timeout: 15_000 })
  await expect(slot(page, 136)).toBeVisible({ timeout: 15_000 })

  // Portrait (151, penal en celda): ~3:4 → ratio ~0.75.
  const portrait = await openDetailRatio(page, 151, 'portrait')
  expect(portrait.ratio).toBeGreaterThan(0.65)
  expect(portrait.ratio).toBeLessThan(0.85)
  expect(portrait.gutters, 'un cromo normal no lleva gutter').toBe(0)

  // Landscape (150, Dibu ataja a Coman): ~3:2 → ratio ~1.5.
  const landscape = await openDetailRatio(page, 150, 'landscape')
  expect(landscape.ratio).toBeGreaterThan(1.35)
  expect(landscape.ratio).toBeLessThan(1.65)

  // 139 (gol de Messi 1-0): en la GRILLA es banda 21:9 (~2.33), pero el detalle
  // usa el ratio BASE landscape 3:2 (~1.5). Esto prueba que NO toma el override
  // de grilla (decisión 2 de T-08).
  const band = await openDetailRatio(page, 139, 'landscape-base-not-band')
  expect(band.ratio).toBeGreaterThan(1.35)
  expect(band.ratio).toBeLessThan(1.65)

  // Pano (147, atajada del Dibu): ~2:1 → ratio ~2.0.
  const pano = await openDetailRatio(page, 147, 'pano')
  expect(pano.ratio).toBeGreaterThan(1.85)
  expect(pano.ratio).toBeLessThan(2.15)

  // Díptico (136, el XI campeón): ratio landscape 3:2 (NO el 16:9 de grilla) +
  // conserva el gutter de álbum físico (decisión 3 de T-08).
  const diptych = await openDetailRatio(page, 136, 'diptych')
  expect(diptych.ratio).toBeGreaterThan(1.35)
  expect(diptych.ratio).toBeLessThan(1.65)
  expect(diptych.gutters, 'el díptico conserva el gutter en el detalle').toBeGreaterThan(0)
})
