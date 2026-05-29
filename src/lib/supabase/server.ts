import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/env'
import type { Database } from '@/types/database.types'

/**
 * Cliente de Supabase para server components, server actions y route handlers.
 * Maneja las cookies de sesión automáticamente.
 * Respeta RLS — opera con permisos del user autenticado.
 *
 * @example
 * // En un server component:
 * import { createClient } from '@/lib/supabase/server'
 * const supabase = await createClient()
 * const { data } = await supabase.from('cards').select('*')
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // setAll puede fallar si se llama desde un Server Component.
            // Se puede ignorar si hay un middleware refreshing tokens.
          }
        },
      },
    },
  )
}
