import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Cliente admin de Supabase.
 * BYPASSEA RLS — usar con extremo cuidado, solo para tareas confiables del server.
 *
 * Casos de uso:
 * - Scripts de seed/migration
 * - Webhooks que necesitan modificar data de cualquier user
 * - Cron jobs
 * - Server actions que validan permisos custom antes de actuar
 *
 * NUNCA exponer al cliente. NUNCA usar en server components que devuelven data al user.
 *
 * @example
 * import { createAdminClient } from '@/lib/supabase/admin'
 * const supabase = createAdminClient()
 * await supabase.from('cards').insert(...)
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is not defined')
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
