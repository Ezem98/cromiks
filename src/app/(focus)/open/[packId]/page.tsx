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
 *  2. Valida que el pack exista, sea del user y esté pending
 *  3. Llama a openPack() para asignar cromos y marcar el pack como opened
 *  4. Pasa el resultado al client component PackOpeningFlow
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

  // ====== DEBUG MODE ======
  // Solo activo en development. Bypassa toda la lógica de DB para
  // mostrar las animaciones con todos los tiers.
  if (debug === 'true' && process.env.NODE_ENV === 'development') {
    return <PackOpeningFlow result={debugMockResult} currentStreak={currentStreak} />
  }

  // ====== FLOW REAL ======
  // Verificar que el pack existe y pertenece al user
  const { data: pack } = await supabase
    .from('packs')
    .select('id, status')
    .eq('id', packId)
    .eq('user_id', user.id)
    .single()

  if (!pack) {
    notFound()
  }

  if (pack.status !== 'pending') {
    redirect('/')
  }

  // Abrir el sobre (asigna cromos, marca pack como opened)
  const result = await openPack({ packId })

  if (!result.ok) {
    // Si falla, redirigimos al home con error info
    // (En el futuro podemos mostrar una error page específica)
    console.error('[open pack page] openPack failed:', result.code)
    redirect('/?error=open_failed')
  }

  return <PackOpeningFlow result={result.data} currentStreak={currentStreak} />
}
