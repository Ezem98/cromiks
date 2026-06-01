/**
 * resolveCardImage — gate ÚNICO de imagen de cromo (T4 del pipeline de imágenes).
 *
 * Las 5 superficies que muestran un cromo (álbum, /cromo, /u, OG, pack-opening)
 * pasan SIEMPRE por acá para decidir qué imagen sirven. Un solo lugar = un solo
 * gate de takedown: si esto devuelve null, la superficie cae al CromoPlaceholder.
 *
 * Reglas (a propósito conservadoras):
 *  - Solo `status='published'` con `r2_key` sirve imagen. pending / takedown /
 *    sin asset → null. (En prod la fila en takedown ni siquiera es visible por
 *    la RLS de card_assets, así que esto es defensa en profundidad.)
 *  - La URL servida es SIEMPRE de nuestro R2 (`${base}/${r2_key}`). NUNCA un host
 *    externo: `source_url` queda en card_assets solo como provenance.
 *  - Si la base pública de R2 no está configurada (R2 sin cablear todavía, T7),
 *    devolvemos null → placeholder. Nunca armamos una URL rota.
 *
 * Es una función pura (la base se puede inyectar) para que el test de T12 no
 * dependa del entorno.
 */

/** Campos de una fila de card_assets que el resolver necesita para decidir. */
export type CardImageAsset =
  | {
      status?: string | null
      r2_key?: string | null
    }
  | null
  | undefined

/**
 * Base pública del CDN de assets (R2 bindeado a dominio propio, ej.
 * `https://assets.cromiks.app`). La cablea T7 en el entorno / env.ts. Se lee acá
 * en crudo (con fail-safe) para no acoplar T4 al wiring de T7.
 */
const R2_PUBLIC_BASE_ENV = 'NEXT_PUBLIC_R2_PUBLIC_BASE'

export function resolveCardImage(
  asset: CardImageAsset,
  baseOverride?: string | null,
): string | null {
  if (!asset || asset.status !== 'published') return null

  const key = asset.r2_key?.trim().replace(/^\/+/, '')
  if (!key) return null

  // baseOverride !== undefined permite que el test fuerce una base (o la ausencia
  // de base, pasando null/''). Sin override, se lee del entorno.
  const rawBase = baseOverride !== undefined ? baseOverride : process.env[R2_PUBLIC_BASE_ENV]
  const base = rawBase?.trim().replace(/\/+$/, '')
  if (!base) return null

  return `${base}/${key}`
}
