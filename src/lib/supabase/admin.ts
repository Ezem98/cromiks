import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/env'
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
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
