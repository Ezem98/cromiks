import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases de Tailwind respetando precedencia.
 *
 * @example
 * cn('p-4 bg-red-500', isActive && 'bg-blue-500')
 * // 'p-4 bg-blue-500' (la segunda gana porque tw-merge resuelve conflictos)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
