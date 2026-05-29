import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

/**
 * Cliente de Supabase para el browser.
 * Usar SOLO en componentes con 'use client'.
 *
 * NEXT_PUBLIC_* con process.env (no el `env` de t3-oss): este módulo corre en el
 * browser y el guard client de @t3-oss/env-nextjs rompería la hidratación. Next
 * las inlinea igual; la validación de presencia la cubre src/env.ts en build/server.
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
