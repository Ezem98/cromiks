import { NextResponse } from 'next/server'
import { env } from '@/env'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Health check para el uptime monitor de Better Stack (TP-04 / PR8).
 *
 * Liveness + readiness en un solo hit:
 *  - Si este handler responde, el proceso Next está vivo (liveness).
 *  - El ping a Supabase valida que la dependencia crítica está sana (readiness).
 *
 * force-dynamic + no-store: NUNCA cachear — cada hit refleja el estado real.
 * runtime nodejs: usamos el admin client (SUPABASE_SECRET_KEY), no Edge.
 *
 * No hay middleware en el repo, así que esta ruta es pública (no requiere sesión).
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DB_TIMEOUT_MS = 2_000

async function pingDb(): Promise<'ok' | 'down'> {
  try {
    const supabase = createAdminClient()
    // head:true + count → no trae rows, solo valida que la conexión y el query
    // plan corran contra una tabla estable del catálogo. Barato.
    const query = supabase.from('cards').select('*', { head: true, count: 'exact' })
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('db_timeout')), DB_TIMEOUT_MS),
    )
    const { error } = (await Promise.race([query, timeout])) as { error: unknown }
    return error ? 'down' : 'ok'
  } catch {
    // Timeout, red caída, o cualquier throw → la DB no está sana para nosotros.
    return 'down'
  }
}

export async function GET() {
  const db = await pingDb()
  const healthy = db === 'ok'

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'unhealthy',
      checks: { db },
      environment: env.RAILWAY_ENVIRONMENT_NAME ?? env.NODE_ENV,
      release: env.RAILWAY_GIT_COMMIT_SHA ?? null,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
