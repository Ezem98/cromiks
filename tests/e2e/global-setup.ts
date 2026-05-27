import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E auth setup.
 *
 * El proyecto Supabase usa implicit flow (tokens en hash fragment), no PKCE.
 * El callback de la app (`exchangeCodeForSession`) solo entiende PKCE, así que
 * navegar al `action_link` directo lo rompe.
 *
 * Estrategia:
 *   1. Admin SDK crea user idempotente + genera magic link.
 *   2. Browser navega al link → Supabase /verify → redirect con tokens en `#hash`.
 *   3. Parseamos los tokens, decodificamos el JWT para el `sub`, traemos el user
 *      completo vía admin SDK.
 *   4. Construimos el sessionObject que `@supabase/ssr` espera.
 *   5. Lo encodeamos como `base64-<base64url(JSON)>`, chunkeamos si supera 3180
 *      chars URL-encoded (formato exacto de @supabase/ssr 0.10.3) e inyectamos
 *      las cookies en el browser context.
 *   6. Verificamos navegando a /home (ruta protegida del route group (app)) —
 *      si redirige a /signin, las cookies están mal y abortamos.
 *   7. Persistimos `storageState` para que cada test arranque autenticado.
 */
export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY
  const email = process.env.PLAYWRIGHT_TEST_USER_EMAIL

  if (!supabaseUrl || !serviceKey || !email) {
    throw new Error(
      '[e2e setup] Falta NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o PLAYWRIGHT_TEST_USER_EMAIL en el entorno',
    )
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const cookieKey = `sb-${projectRef}-auth-token`
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const baseHostname = new URL(baseURL).hostname
  const storageStatePath = 'tests/.auth/user.json'

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Si el user e2e ya existe, lo borramos completo. Esto fuerza a que el
  // trigger `handle_new_user` (si existe a nivel proyecto) re-cree las base
  // rows (streaks, user_coins, profiles, etc) en estado conocido. Más limpio
  // que adivinar qué tablas resetear y respeta cualquier setup que no esté
  // versionado en migrations.
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) throw new Error(`[e2e setup] listUsers falló: ${listErr.message}`)
  const existing = listData?.users.find((u) => u.email === email)
  if (existing) {
    const { error: deleteErr } = await admin.auth.admin.deleteUser(existing.id)
    if (deleteErr) {
      throw new Error(`[e2e setup] deleteUser falló: ${deleteErr.message}`)
    }
  }

  // 2) Crear user fresh — el trigger handle_new_user (si está configurado) debe
  // inicializar las base rows del user automáticamente.
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (createErr || !createData?.user) {
    throw new Error(`[e2e setup] createUser falló: ${createErr?.message ?? 'sin data.user'}`)
  }
  const userId = createData.user.id

  // 3) Marcar onboarding completo + upsert profile con username determinista.
  // El layout (app) chequea user_metadata.onboarded y la existencia del row en profiles.
  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { onboarded: true },
  })
  if (updateErr) throw new Error(`[e2e setup] updateUserById falló: ${updateErr.message}`)

  const { error: profileErr } = await admin
    .from('profiles')
    .upsert(
      { id: userId, username: `e2e_${userId.slice(0, 8)}`, language: 'es' },
      { onConflict: 'id' },
    )
  if (profileErr) throw new Error(`[e2e setup] upsert profiles falló: ${profileErr.message}`)

  // 4) Magic link → action_link que redirige al callback con tokens en hash
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${baseURL}/auth/callback?next=/home` },
  })
  if (linkErr || !linkData?.properties?.action_link) {
    throw new Error(`[e2e setup] generateLink falló: ${linkErr?.message ?? 'sin action_link'}`)
  }

  // 3) Navegar al action_link y capturar tokens del hash final
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(linkData.properties.action_link, { waitUntil: 'load' })

  const finalUrl = new URL(page.url())
  const hashParams = new URLSearchParams(finalUrl.hash.replace(/^#/, ''))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const expiresAtStr = hashParams.get('expires_at')
  const expiresInStr = hashParams.get('expires_in')
  const tokenType = hashParams.get('token_type') ?? 'bearer'

  if (!accessToken || !refreshToken) {
    await browser.close()
    throw new Error(`[e2e setup] No se encontraron tokens en el hash. URL final: ${page.url()}`)
  }

  const expiresIn = expiresInStr ? Number(expiresInStr) : 3600
  const expiresAt = expiresAtStr ? Number(expiresAtStr) : Math.floor(Date.now() / 1000) + expiresIn

  // 4) Decodificar JWT y traer user completo
  const jwtPayload = decodeJwt(accessToken)
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(jwtPayload.sub)
  if (userErr || !userData?.user) {
    await browser.close()
    throw new Error(`[e2e setup] getUserById falló: ${userErr?.message ?? 'sin user'}`)
  }

  // 5) sessionObject con el shape que @supabase/ssr persiste
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires_at: expiresAt,
    token_type: tokenType,
    user: userData.user,
  }

  const encodedValue = `base64-${base64UrlEncode(JSON.stringify(session))}`
  const chunks = chunkCookieValue(cookieKey, encodedValue)

  await ctx.clearCookies()
  await ctx.addCookies(
    chunks.map(({ name, value }) => ({
      name,
      value,
      domain: baseHostname,
      path: '/',
      sameSite: 'Lax' as const,
      httpOnly: false,
      expires: Math.floor(Date.now() / 1000) + 400 * 24 * 60 * 60,
    })),
  )

  // 6) Sanity check: ruta protegida no debe redirigir a /signin
  await page.goto(`${baseURL}/home`, { waitUntil: 'domcontentloaded' })
  if (page.url().includes('/signin')) {
    await browser.close()
    throw new Error(
      `[e2e setup] Cookies inyectadas pero /home redirigió a /signin. URL final: ${page.url()}`,
    )
  }

  await mkdir(dirname(storageStatePath), { recursive: true })
  await ctx.storageState({ path: storageStatePath })
  await browser.close()
}

/**
 * base64url sin padding, conforme RFC 4648 §5.
 * Es lo que usa @supabase/ssr 0.10 con `cookieEncoding: 'base64url'` (default).
 */
function base64UrlEncode(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decodifica el payload de un JWT (sin verificar firma — solo lo usamos para
 * extraer el `sub` y mapear al user via admin SDK).
 */
function decodeJwt(token: string): { sub: string; email?: string; exp?: number } {
  const [, payload] = token.split('.')
  if (!payload) throw new Error('JWT inválido — no tiene payload')
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
  const buf = Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64')
  return JSON.parse(buf.toString('utf8'))
}

/**
 * Replica el chunker de @supabase/ssr (dist/main/utils/chunker.js).
 * Si el value URL-encoded supera 3180 chars, se parte en chunks `.0`, `.1`...
 * Respetando boundaries de unicode multi-byte.
 */
function chunkCookieValue(key: string, value: string): { name: string; value: string }[] {
  const MAX = 3180
  let encoded = encodeURIComponent(value)
  if (encoded.length <= MAX) return [{ name: key, value }]

  const chunks: string[] = []
  while (encoded.length > 0) {
    let head = encoded.slice(0, MAX)
    const lastPct = head.lastIndexOf('%')
    if (lastPct > MAX - 3) head = head.slice(0, lastPct)
    let decoded = ''
    while (head.length > 0) {
      try {
        decoded = decodeURIComponent(head)
        break
      } catch (e) {
        if (e instanceof URIError && head.at(-3) === '%' && head.length > 3) {
          head = head.slice(0, head.length - 3)
        } else {
          throw e
        }
      }
    }
    chunks.push(decoded)
    encoded = encoded.slice(head.length)
  }
  return chunks.map((v, i) => ({ name: `${key}.${i}`, value: v }))
}
