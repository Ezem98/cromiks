import { expect, test } from '@playwright/test'

/**
 * Smoke E2E · Golden path post-auth.
 *
 * Flow: /home → reclamar daily pack → /open/[packId] → saltar animación 3D →
 *       summary → /album con cromo nuevo owned.
 *
 * Valida implícitamente:
 *   - B-22 fix (open_pack idempotente — no redirect a /?error=open_failed
 *     ante el double-render del Server Component)
 *   - B-23 fix (error codes alineados con el RPC)
 *
 * El global-setup pre-siembra un pack daily PENDING (T-14) — NO user_cards: las
 * cartas las rola open_pack al abrir, así que el golden path real (open → álbum)
 * sigue siendo la fuente de truth. Lo único que se pre-hace es el CLAIM, que
 * dependía de claim_daily_pack en runtime (rate-limit + cold-start) y flakeaba.
 */
test('smoke: golden path home → open pack → album', async ({ page }) => {
  // 1. Home (en `/`): con el pack pending sembrado, el home muestra "Abrir sobre"
  // (modo hasPending → router.push a /open, sin claim). `/home` redirige a `/`.
  // Timeout amplio: primera compilación de la ruta en CI puede tardar (cold-start).
  await page.goto('/')
  await expect(page).toHaveURL(/localhost:\d+\/$/)

  const openButton = page.getByRole('button', { name: /abrir sobre|reclamar sobre diario/i })
  await expect(openButton).toBeVisible({ timeout: 25_000 })
  await openButton.click()

  // 2. PendingMode hace router.push(`/open/${packId}`). El Server Component ejecuta
  // openPack y NO debe redirigir a /?error=open_failed (B-22: RPC idempotente
  // sobrevive al double-render del prefetch + render).
  await expect(page).toHaveURL(/\/open\/[\w-]+/, { timeout: 15_000 })

  // 3. Saltar animación 3D. El botón con aria-label="Saltar animación" es
  // visible mientras phase ∈ {intro, tear, stack, outro} (no en summary).
  // Timeout generoso porque el GLTF del sobre tarda en cargar en headless.
  const skipButton = page.getByRole('button', { name: /saltar animaci[oó]n/i })
  await expect(skipButton).toBeVisible({ timeout: 20_000 })
  await skipButton.click()

  // 4. Summary: link "Ver en el álbum" navega a /album
  const goToAlbum = page.getByRole('link', { name: /ver en el [aá]lbum/i })
  await expect(goToAlbum).toBeVisible({ timeout: 10_000 })
  await goToAlbum.click()

  // 5. /album con cromos owned. Verificamos vía el contador del header
  // ("X / N") porque los cromos sorteados caen en páginas aleatorias y la
  // página 1 puede no tener ninguno owned por azar. NO hardcodeamos el total:
  // es 205 si el álbum no está gateado, o los cromos de la(s) página(s)
  // is_active durante la beta (ej. "X / 30" con francia activa).
  await expect(page).toHaveURL(/\/album/, { timeout: 10_000 })
  const ownedCounter = page.getByText(/[1-9]\d*\s*\/\s*\d+/).first()
  await expect(ownedCounter).toBeVisible({ timeout: 10_000 })
})

/**
 * Secundario · UI rendering del flow sin DB.
 *
 * Usa ?debug=true (que el page activa cuando el server corre con
 * NODE_ENV=development — true durante `pnpm dev`, que es lo que levanta
 * Playwright tanto local como en CI). Valida que PackOpeningFlow + 3D scene
 * renderea sin errores con mock data. NO valida el RPC ni la idempotencia
 * (eso lo hace el test principal).
 */
test('smoke: pack-opening UI renders en debug mode', async ({ page }) => {
  // packId ficticio — debug mode bypassa la validación de DB.
  await page.goto('/open/00000000-0000-4000-8000-000000000000?debug=true')

  const skipButton = page.getByRole('button', { name: /saltar animaci[oó]n/i })
  await expect(skipButton).toBeVisible({ timeout: 20_000 })
  await skipButton.click()

  // Debe llegar al summary sin errores de cliente
  const goToAlbum = page.getByRole('link', { name: /ver en el [aá]lbum/i })
  await expect(goToAlbum).toBeVisible({ timeout: 10_000 })
})
