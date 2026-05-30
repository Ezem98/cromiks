import { expect, test } from '@playwright/test'

/**
 * Health endpoint · target del uptime monitor de Better Stack (PR8 / TP-04).
 *
 * Verifica que `GET /api/health` responda 200 + `status: 'ok'` con la DB sana,
 * para no romper el monitor en un refactor. Es un request API (sin browser):
 * el job e2e de CI ya levanta el server con SUPABASE_SECRET_KEY, así que el
 * ping a Supabase funciona.
 */
test('GET /api/health responde 200 ok', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)

  const body = await res.json()
  expect(body.status).toBe('ok')
  expect(body.checks.db).toBe('ok')
})
