import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

/**
 * Data fetchers para misiones.
 *
 * Cada misión incluye:
 *  - user_mission data (id, status, progress, target, expires_at)
 *  - template data (title, description, type)
 *  - reward info (coins, pack_type, card_count)
 *
 * La vista expandida también debería incluir el icono por type, pero eso lo
 * resolvemos en componente (es UI, no data).
 */

export type MissionStatus = Database['public']['Enums']['mission_status']
export type MissionType = Database['public']['Enums']['mission_type']
export type PackType = Database['public']['Enums']['pack_type']

export type MissionWithReward = {
  /** ID del row de user_missions */
  id: string
  /** ID del template (para deduplicar en UI si hace falta) */
  templateId: string
  title: string
  description: string
  type: MissionType
  status: MissionStatus
  progress: number
  target: number
  expiresAt: string | null
  reward: {
    coins: number | null
    packType: PackType | null
    cardCount: number | null
  }
}

/**
 * Trae todas las misiones del user con sus templates joineadas.
 *
 * Status incluidos: active, completed (no traemos claimed/expired para no
 * desordenar la lista — eso vive en una vista de historial separada).
 *
 * Por ahora solo trae misiones del día (expires_at hoy o no expiry).
 * Cuando agreguemos misiones semanales / permanentes, expandimos el filtro.
 */
export async function getMissionsForUser(): Promise<MissionWithReward[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const today = new Date().toISOString().slice(0, 10)

  // Trae user_missions + join inner con mission_templates en una sola query.
  // Esto reemplaza el patrón de 2 queries del home original.
  const { data, error } = await supabase
    .from('user_missions')
    .select(
      `
      id,
      mission_template_id,
      status,
      progress,
      target,
      expires_at,
      mission_templates!inner (
        id,
        title,
        description,
        type,
        reward_coins,
        reward_pack_type,
        reward_card_count
      )
    `,
    )
    .eq('user_id', user.id)
    .in('status', ['active', 'completed'])
    .or(`expires_at.gte.${today}T00:00:00,expires_at.is.null`)
    .order('status', { ascending: false }) // 'completed' antes que 'active' (claimable first)

  if (error) {
    console.error('[missions] getMissionsForUser:', error.message)
    return []
  }

  if (!data) return []

  return data.map((row) => {
    // El join inline retorna mission_templates como un objeto, no array,
    // por usar !inner. Pero TS lo tipea como `MissionTemplates | null`.
    const tpl = row.mission_templates as unknown as {
      id: string
      title: string
      description: string
      type: MissionType
      reward_coins: number | null
      reward_pack_type: PackType | null
      reward_card_count: number | null
    } | null

    return {
      id: row.id,
      templateId: row.mission_template_id,
      title: tpl?.title ?? 'Misión',
      description: tpl?.description ?? '',
      type: (tpl?.type ?? 'open_pack') as MissionType,
      status: row.status as MissionStatus,
      progress: row.progress,
      target: row.target,
      expiresAt: row.expires_at,
      reward: {
        coins: tpl?.reward_coins ?? null,
        packType: tpl?.reward_pack_type ?? null,
        cardCount: tpl?.reward_card_count ?? null,
      },
    }
  })
}
