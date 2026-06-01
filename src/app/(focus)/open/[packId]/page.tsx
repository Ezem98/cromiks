import { notFound, redirect } from 'next/navigation'
import { openPack } from '@/features/pack-opening/actions'
import { PackOpeningFlow } from '@/features/pack-opening/components/pack-opening-flow'
import { debugMockResult } from '@/features/pack-opening/debug-data'
import { createClient } from '@/lib/supabase/server'

/**
 * Página de apertura cinematográfica del sobre.
 *
 * Server-side:
 *  1. Valida que el user esté logueado
 *  2. Llama a openPack() — idempotente, maneja existencia/ownership/estado:
 *     - pack_not_found → notFound()
 *     - pack_expired / otros → redirect con error
 *     - ok (primera vez o replay) → renderiza PackOpeningFlow
 *
 * Post B-22: NO hay SELECT previo ni check de `status !== 'pending'`. Eso
 * rompía el flow ante double-render del Server Component (prefetch + render
 * real): la segunda corrida veía `status='opened'` y redirigía a / aunque la
 * primera hubiera abierto el sobre bien. El RPC idempotente + delegar la
 * validación elimina el race.
 *
 * Modo debug (?debug=true en development):
 *  - Skip el openPack real
 *  - Usa mock data con 1 cromo de cada tier (perfecto para probar animaciones)
 *  - Solo funciona en NODE_ENV=development
 */

type Props = {
  params: Promise<{ packId: string }>
  searchParams: Promise<{ debug?: string }>
}

export default async function OpenPackPage({ params, searchParams }: Props) {
  const { packId } = await params
  const { debug } = await searchParams

  // ====== DEBUG MODE ======
  // Solo en development. Bypassa auth + DB para iterar las animaciones con
  // todos los tiers sin sesión. Va ANTES del guard de auth a propósito: deja
  // abrir /open/x?debug=true sin loguearse en dev (prod no se ve afectado).
  if (debug === 'true' && process.env.NODE_ENV === 'development') {
    return <PackOpeningFlow result={debugMockResult} currentStreak={0} />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  // Trae la racha para el contexto del flow
  const { data: streak } = await supabase
    .from('streaks')
    .select('current_streak')
    .eq('user_id', user.id)
    .single()

  const currentStreak = streak?.current_streak ?? 0

  // ====== FLOW REAL ======
  // openPack es idempotente: primera llamada abre el sobre, llamadas
  // subsiguientes (e.g. SC double-render por prefetch) entran al replay path
  // y devuelven las mismas cartas sin re-mutar. Ver migration
  // supabase/migrations/20260527120000_make_open_pack_idempotent.sql
  const result = await openPack({ packId })

  if (!result.ok) {
    if (result.code === 'pack_not_found') {
      notFound()
    }
    console.error('[open pack page] openPack failed:', result.code)
    redirect('/?error=open_failed')
  }

  return <PackOpeningFlow result={result.data} currentStreak={currentStreak} />
}
