/**
 * IDs de los cromos de la PRIMERA FILA above-the-fold del álbum — los que cargan
 * la foto con prioridad (eager + fetchpriority=high) para que sean el LCP sin
 * flash de gradiente en frío (U-17). El resto queda lazy.
 *
 * Acumula el `span` de cada celda en orden hasta llenar `eagerCols`:
 *  - bento (francia): `eagerCols = BENTO_COLS` (4) → la fila 1; el díptico hero
 *    (span 4) llena la fila solo, así que es el único priorizado.
 *  - grilla uniforme: `eagerCols ≈ 7` (la fila más ancha en lg) y cada celda es
 *    span 1 → las primeras ~7 celdas (en mobile son ~2 filas de thumbnails chicos).
 */
export function firstRowPriorityIds<T extends { id: string }>(
  cards: T[],
  eagerCols: number,
  spanOf: (card: T) => number,
): Set<string> {
  const ids = new Set<string>()
  let filled = 0
  for (const card of cards) {
    if (filled >= eagerCols) break
    ids.add(card.id)
    filled += spanOf(card)
  }
  return ids
}
