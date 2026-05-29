import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/env'
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
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
