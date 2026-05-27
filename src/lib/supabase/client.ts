import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

/**
 * Cliente de Supabase para el browser.
 * Usar SOLO en componentes con 'use client'.
 *
 * @example
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 * const supabase = createClient()
 * const { data } = await supabase.from('cards').select('*')
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error('Supabase env vars are not defined')
  }

  return createBrowserClient<Database>(url, key)
}
