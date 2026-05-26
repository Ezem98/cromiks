/**
 * Tipos compartidos del flow de apertura.
 */

export type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/**
 * Cromo que se revela en la apertura.
 *
 * - `isNew`: si es la primera vez que el user lo tiene
 * - `reward`: si era repetida, las monedas que ganó (null si no aplica)
 */
export type RevealedCard = {
  /** ID del cromo en la DB */
  cardId: string
  /** Nombre del jugador */
  name: string
  /** Rol o posición (ej. "Capitán · Argentina") */
  playerRole: string
  /** Número en la camiseta */
  number: number
  /** Rareza */
  tier: Tier
  /** Si es nuevo en el álbum del user */
  isNew: boolean
  /** Recompensa en monedas si era repetida */
  reward: number | null
  /** URL de la foto (null → usa placeholder con seed) */
  imageUrl: string | null
  /** Seed para placeholder determinístico */
  seed: string
}

/**
 * Resultado completo del open_pack.
 */
export type OpenPackResult = {
  packType: string
  cards: RevealedCard[]
  /** Monedas totales ganadas en este sobre (suma de repetidas) */
  coinsEarned: number
  /** Balance de monedas DESPUÉS del open */
  coinsAfter: number
}

/**
 * Fases del flow de apertura.
 *
 * Cambios desde la versión inicial:
 * - Eliminamos `reveal` (la pila ya queda visible al final del tear)
 * - Eliminamos `flip` (ahora es parte del stack — swipe a la top card)
 * - Agregamos `stack` (cards apiladas, swipe individual)
 */
export type Phase = 'anticipation' | 'tear' | 'stack' | 'summary' | 'outro'
