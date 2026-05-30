import 'server-only'

import { env } from '@/env'

/**
 * Sync de contactos a Resend (PR7 marketing, 11.4b).
 *
 * La fuente de verdad de la waitlist es la tabla `public.waitlist` en Supabase.
 * Acá, además, registramos el email como contacto en Resend para poder mandar el
 * broadcast de lanzamiento. Es best-effort: si Resend falla, NO rompemos el alta
 * del usuario (ya quedó en Supabase) — solo logueamos.
 *
 * Usa la Contacts API nueva (account-level, sin audience_id):
 *   POST https://api.resend.com/contacts  { email, segments: [{ id }] }
 * (segments es array de objetos {id}, NO de strings — verificado contra la API.)
 *
 * El segment id es público (no secreto), así que va hardcodeado, igual que el
 * DSN de Sentry y el host de PostHog (ver env.ts).
 *
 * Usa RESEND_CONTACTS_API_KEY (key full_access), NO RESEND_API_KEY (esa es
 * solo-envío y la API de contactos la rechaza con 401 restricted_api_key). Si la
 * key de contactos no está seteada, el sync es no-op (fail-open) — la tabla
 * `waitlist` en Supabase sigue siendo la fuente de verdad.
 */

// Segmento "Waitlist · beta" — destino del broadcast de lanzamiento de junio 2026.
const WAITLIST_SEGMENT_ID = '5e866e10-3d2a-46a1-91db-4d920befb008'

const RESEND_CONTACTS_ENDPOINT = 'https://api.resend.com/contacts'

/**
 * Agrega (o reactiva) un email en Resend, dentro del segmento de waitlist.
 * Fail-silent: nunca tira al caller. El locale queda en la tabla `waitlist` de
 * Supabase (fuente de verdad); acá no lo mandamos porque las custom properties
 * de Resend exigen estar pre-declaradas y no aportan al broadcast de lanzamiento.
 */
export async function addWaitlistContact(email: string): Promise<void> {
  const apiKey = env.RESEND_CONTACTS_API_KEY
  if (!apiKey) return // no-op: sin key de contactos, Supabase queda como fuente de verdad

  try {
    const res = await fetch(RESEND_CONTACTS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        segments: [{ id: WAITLIST_SEGMENT_ID }],
      }),
    })

    if (!res.ok) {
      // 409/422 (ya existe) no es un problema real para nosotros.
      console.warn('[resend] addWaitlistContact non-ok', { status: res.status })
    }
  } catch (err) {
    // Resend caído / sin red: el alta ya quedó en Supabase, no bloqueamos.
    console.warn('[resend] addWaitlistContact error', err)
  }
}
