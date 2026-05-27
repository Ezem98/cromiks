import { z } from 'zod'

/**
 * Schemas Zod reutilizables para validación de inputs en server actions.
 *
 * Todas las RPCs reciben UUIDs (cardId, packId, userMissionId). Si la action
 * los pasa malformados a Supabase, el RPC tira un error genérico que cae al
 * branch `unknown` y rompe la UX. Validar acá nos da:
 *  - Error claro (`invalid_input`) antes de tocar la DB
 *  - Type narrowing seguro en el resto del cuerpo de la action
 */

export const uuidSchema = z.uuid()

/**
 * Parsea un UUID. Si es válido devuelve el string; si no, devuelve null.
 * Las actions deben retornar `{ ok: false, error: 'invalid_input' }` cuando esto sea null.
 */
export function parseUuid(value: unknown): string | null {
  const result = uuidSchema.safeParse(value)
  return result.success ? result.data : null
}
