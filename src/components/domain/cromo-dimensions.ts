/**
 * Dimensiones en px del cromo, ancladas al ANCHO por tamaño y derivando el alto
 * del ratio del layout. Puro (sin React) para testear sin RTL.
 *
 * Anclar el ancho hace que un cromo apaisado tenga el mismo ancho que uno
 * portrait y solo cambie el alto — encaja igual en el contenedor (modal, stack).
 * Con ratio=3/4 (portrait, el default histórico) reproduce EXACTO los tamaños
 * viejos: sm 160×213, md 240×320, lg 320×427.
 */

export type CromoSize = 'sm' | 'md' | 'lg'

const BASE_WIDTH: Record<CromoSize, number> = {
  sm: 160,
  md: 240,
  lg: 320,
}

export function cromoDimensions(size: CromoSize, ratio: number): { width: number; height: number } {
  const width = BASE_WIDTH[size]
  // ratio = w/h → h = w/ratio. Guard contra ratio inválido (0/NaN) → portrait.
  const safeRatio = ratio > 0 ? ratio : 3 / 4
  return { width, height: Math.round(width / safeRatio) }
}
