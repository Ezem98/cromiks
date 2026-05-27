import { expect, test } from '@playwright/test'

/**
 * Smoke test — golden path post-auth.
 *
 * Cubre lo crítico del MVP post-onboarding:
 *   /home (AppShell + daily-pack-card) → navegación → /album → cromo owned visible
 *
 * Por qué NO valida el flow de pack-opening:
 *   El page `(focus)/open/[packId]/page.tsx` llama a `openPack` (mutación) dentro
 *   del render del Server Component. Eso se dispara dos veces (probablemente por
 *   prefetch automático de Next + render del cliente), y el segundo intento falla
 *   con `pack_not_pending`. Es un bug latente prod-impactante que necesita su
 *   propio PR (mover la mutación a un client effect con guard idempotente).
 *
 *   Como workaround, el global-setup pre-siembra 3 user_cards directamente vía
 *   admin SDK. Eso garantiza álbum con contenido sin depender del flow roto.
 *
 *   Cuando se arregle el bug, se puede sumar un test específico para el flow de
 *   open → animación → álbum con cromo nuevo.
 */
test('smoke: home + album + owned slot visible', async ({ page }) => {
  // 1. /home carga con AppShell (guard de auth pasó, profile existe)
  await page.goto('/home')
  await expect(page).toHaveURL(/\/home/)

  // 2. El daily-pack-card debe estar visible en alguno de sus 3 estados.
  // No clickeamos para evitar el bug del pack-opening flow — solo verificamos
  // que el shell renderea sin errores.
  const dailyCardCopy = page.getByText(/sobre|racha|volv[eé] mañana/i).first()
  await expect(dailyCardCopy).toBeVisible({ timeout: 10_000 })

  // 3. Navegar al álbum
  await page.goto('/album')
  await expect(page).toHaveURL(/\/album/)

  // 4. Verificar que existe al menos un cromo OBTENIDO. El aria-label de
  // OwnedSlot matchea "<name>, cromo <n>"; MissingSlot matchea
  // "Cromo <n>, no obtenido". El pre-seed del global-setup garantiza al menos 3.
  const ownedSlots = page.locator('button[aria-label*="cromo"]:not([aria-label*="no obtenido"])')
  await expect(ownedSlots.first()).toBeVisible({ timeout: 10_000 })
  expect(await ownedSlots.count()).toBeGreaterThan(0)
})
