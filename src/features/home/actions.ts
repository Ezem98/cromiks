'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Server actions del home.
 */

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string }

/**
 * Reclama el sobre diario del usuario llamante.
 * Llama a la SQL function security definer.
 */
export async function claimDailyPack(): Promise<ActionResult<{ packId: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('claim_daily_pack')

  if (error) {
    if (error.message.includes('already_claimed_today')) {
      return { ok: false, error: 'already_claimed' }
    }
    if (error.message.includes('streak_not_initialized')) {
      return { ok: false, error: 'no_streak' }
    }
    console.error('[home] claimDailyPack:', error.message)
    return { ok: false, error: 'unknown' }
  }

  const row = data?.[0]
  if (!row?.pack_id) {
    return { ok: false, error: 'no_pack_returned' }
  }

  revalidatePath('/')
  return { ok: true, data: { packId: row.pack_id } }
}

/**
 * Asigna 3 misiones diarias al user si todavía no tiene activas hoy.
 *
 * Idempotente: si ya tiene 3 misiones activas con expires_at hoy, no hace nada.
 *
 * Usa admin client porque queremos bypassear RLS para insertar en user_missions
 * (los inserts directos están bloqueados por RLS — solo via functions).
 */
export async function assignDailyMissions(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'unauthenticated' }
  }

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(3, 0, 0, 0) // 00:00 AR = 03:00 UTC
  const expiresAt = tomorrow.toISOString()

  // Check si ya tiene misiones diarias activas hoy
  const { data: existing } = await supabase
    .from('user_missions')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['active', 'completed'])
    .gte('expires_at', `${today}T00:00:00`)
    .lte('expires_at', `${today}T23:59:59`)

  if (existing && existing.length >= 3) {
    return { ok: true }
  }

  const slotsToFill = 3 - (existing?.length ?? 0)

  // Pickear N misiones random del pool con weighted random
  const admin = createAdminClient()
  const { data: templates } = await admin
    .from('mission_templates')
    .select('id, weight, config')
    .eq('is_daily_pool', true)
    .order('weight', { ascending: false })

  if (!templates || templates.length === 0) {
    return { ok: false, error: 'no_templates_available' }
  }

  // Weighted random sin reemplazo
  const pool = [...templates]
  const picked: typeof templates = []

  for (let i = 0; i < slotsToFill && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, t) => sum + (t.weight ?? 100), 0)
    let r = Math.random() * totalWeight

    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight ?? 100
      if (r <= 0) {
        picked.push(pool[j])
        pool.splice(j, 1)
        break
      }
    }
  }

  // Insertar
  const rows = picked.map((tpl) => ({
    user_id: user.id,
    mission_template_id: tpl.id,
    status: 'active' as const,
    progress: 0,
    target: (tpl.config as { target_count?: number })?.target_count ?? 1,
    expires_at: expiresAt,
  }))

  const { error } = await admin.from('user_missions').insert(rows)

  if (error) {
    console.error('[home] assignDailyMissions insert:', error.message)
    return { ok: false, error: 'insert_failed' }
  }

  revalidatePath('/')
  return { ok: true }
}

/**
 * Helper: redirige a la apertura de un sobre.
 */
export async function openPack(packId: string): Promise<void> {
  redirect(`/open/${packId}`)
}
