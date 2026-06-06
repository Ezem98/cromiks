'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'
import { track } from '@/lib/analytics'

/**
 * Server actions del home.
 */

/**
 * Reclama el sobre diario del usuario llamante.
 * Llama a la SQL function security definer.
 *
 * Contrato de errores del RPC (match exacto contra `error.message`, ver dump en
 * supabase/migrations/20260527100000_snapshot_existing_rpcs.sql):
 *  - 'auth_required'          → user sin sesión (defensivo, el wrapper lo
 *                                debería interceptar antes con 'unauthenticated')
 *  - 'streak_not_initialized' → el row de streaks no existe (handle_new_user
 *                                no corrió). Mapeo a `no_streak` (code estable
 *                                para la UI).
 *  - 'already_claimed_today'  → ya reclamó hoy. Mapeo a `already_claimed`.
 */
const RPC_TO_CODE: Record<string, string> = {
  auth_required: 'auth_required',
  streak_not_initialized: 'no_streak',
  already_claimed_today: 'already_claimed',
}

export const claimDailyPack = defineAction({
  name: 'claimDailyPack',
  schema: z.void(),
  rateLimit: 'claimDailyPack',
  expectedErrors: ['auth_required', 'already_claimed', 'no_streak', 'no_pack_returned'],
  fn: async (_input, { userId, supabase }) => {
    const { data, error } = await supabase.rpc('claim_daily_pack')

    if (error) {
      const code = RPC_TO_CODE[error.message]
      if (code) {
        return { ok: false, code }
      }
      return { ok: false, code: 'unknown', message: error.message }
    }

    const row = data?.[0]
    if (!row?.pack_id) {
      return { ok: false, code: 'no_pack_returned' }
    }

    // Streak con un query extra (1/día, costo aceptable). Pack type es siempre 'daily'.
    const { data: streakRow } = await supabase
      .from('streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single()

    await track(
      'daily_pack_claimed',
      { streak: streakRow?.current_streak ?? 0, pack_type: 'daily' },
      { distinctId: userId },
    )

    revalidatePath('/')
    return { ok: true, data: { packId: row.pack_id } }
  },
})

/** Codes que el RPC assign_daily_missions puede lanzar (match contra error.message). */
const ASSIGN_MISSIONS_CODES = new Set(['no_templates_available', 'auth_required'])

/**
 * Asigna 3 misiones diarias al user si todavía no tiene las del ciclo de hoy.
 *
 * Idempotente POR CICLO y a prueba de concurrencia: delega en el RPC
 * security-definer assign_daily_missions, que computa la frontera del ciclo
 * SERVER-SIDE (próxima medianoche AR), toma un advisory lock por user+ciclo,
 * cuenta las misiones del día (cualquier estado, incluido claimed) e inserta
 * solo las que falten. Reclamar las 3 NO dispara reasignación, dos cargas
 * concurrentes no insertan 3 c/u, y el cliente no puede elegir el ciclo ni las
 * misiones (si pudiera, mintearía recompensas infinitas).
 */
export const assignDailyMissions = defineAction({
  name: 'assignDailyMissions',
  schema: z.void(),
  expectedErrors: ['no_templates_available', 'auth_required'],
  fn: async (_input, { supabase }) => {
    const { error } = await supabase.rpc('assign_daily_missions')

    if (error) {
      const code = ASSIGN_MISSIONS_CODES.has(error.message) ? error.message : 'unknown'
      return { ok: false, code, message: error.message }
    }

    revalidatePath('/')
    return { ok: true, data: undefined }
  },
})

/**
 * Helper: redirige a la apertura de un sobre.
 *
 * Nota: este NO usa defineAction porque su valor es el side-effect del
 * redirect (que tira un throw interno). Mantengo la firma simple.
 */
export async function openPack(packId: string): Promise<void> {
  redirect(`/open/${packId}`)
}
