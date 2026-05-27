'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseUuid } from '@/lib/validation'

/**
 * Server actions para el feature de sharing (E3).
 *
 * Acciones:
 *  - recordShare: registra un share_event (insert en DB).
 *    El INSERT dispara el trigger trg_advance_share_card que avanza
 *    misiones de tipo share_card.
 *
 * Esta action se llama desde el ShareSheet en el client, después de que el
 * usuario eligió un destino (whatsapp, twitter, copy, native).
 *
 * No fallamos hard si el insert falla — el sharing del lado del user
 * (abrir whatsapp, copiar al portapapeles) ya se ejecutó. El insert solo
 * sirve para tracking y misiones.
 */

export type ShareChannel = 'whatsapp' | 'twitter' | 'copy' | 'native' | 'instagram'

// Mapeo del canal de UI al enum share_platform de la DB.
const channelToPlatform = {
  whatsapp: 'whatsapp',
  twitter: 'twitter',
  instagram: 'instagram',
  copy: 'copy_link',
  native: 'other',
} as const satisfies Record<ShareChannel, string>

export async function recordShare(
  cardId: string,
  channel: ShareChannel,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validCardId = parseUuid(cardId)
  if (!validCardId || !(channel in channelToPlatform)) {
    return { ok: false, error: 'invalid_input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'unauthenticated' }
  }

  const { error } = await supabase.from('share_events').insert({
    user_id: user.id,
    card_id: validCardId,
    platform: channelToPlatform[channel],
  })

  if (error) {
    console.error('[sharing] recordShare:', error.message)
    return { ok: false, error: 'insert_failed' }
  }

  // Revalidamos home porque las misiones pueden haber avanzado / completado.
  revalidatePath('/')
  return { ok: true }
}
