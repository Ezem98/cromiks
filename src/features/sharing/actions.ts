'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { defineAction } from '@/lib/actions'
import { track } from '@/lib/analytics'

/**
 * Server actions para el feature de sharing (E3).
 *
 *  - recordShare: registra un share_event (insert en DB).
 *    El INSERT dispara el trigger trg_advance_share_card que avanza
 *    misiones de tipo share_card.
 *
 * Esta action se llama desde el ShareSheet en el client, después de que el
 * usuario eligió un destino (whatsapp, twitter, copy, native). No fallamos
 * hard si el insert falla — el sharing del lado del user (abrir whatsapp,
 * copiar al portapapeles) ya se ejecutó. El insert solo sirve para tracking
 * y misiones.
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

const recordShareSchema = z.object({
  // card_id es slug text (p.ej. "hinchada-delirio-mexico"), NO uuid.
  cardId: z.string().min(1).max(100),
  channel: z.enum(['whatsapp', 'twitter', 'copy', 'native', 'instagram']),
})

export const recordShare = defineAction({
  name: 'recordShare',
  schema: recordShareSchema,
  rateLimit: 'recordShare',
  expectedErrors: ['insert_failed'],
  fn: async ({ cardId, channel }, { userId, supabase }) => {
    const { error } = await supabase.from('share_events').insert({
      user_id: userId,
      card_id: cardId,
      platform: channelToPlatform[channel],
    })

    if (error) {
      return { ok: false, code: 'insert_failed', message: error.message }
    }

    await track('share_initiated', { channel, target_card_id: cardId }, { distinctId: userId })

    // Revalidamos home porque las misiones pueden haber avanzado / completado.
    revalidatePath('/')
    return { ok: true, data: undefined }
  },
})
