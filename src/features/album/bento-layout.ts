/**
 * Bento layout del álbum — fuente de verdad de PRESENTACIÓN, por página.
 *
 * Acá vive el placement curado (qué cromo ocupa cuántas columnas y con qué
 * aspect), NO en la DB: el layout es presentación, y al ser un const lo leen
 * la grilla Y el skeleton → el primer load no mueve nada (CLS).
 * El pipeline de imágenes lee su propio `layout` desde el catálogo YAML
 * (content.photo.layout) — runtimes distintos; el test de integridad de este
 * módulo evita que se desincronicen los nombres de layout.
 *
 * Reglas del sistema (las enforcea bento-layout.test.ts):
 *  - Grilla base de 4 columnas EN TODOS los breakpoints (los cromos escalan,
 *    la estructura no cambia → un solo mecanismo de layout, sin media-queries
 *    especiales).
 *  - SIN `grid-auto-flow: dense`: el orden de card_number ES la cronología de
 *    la final (francia es una página narrativa) y dense la reordenaría.
 *  - Cada fila suma EXACTO 4 columnas en orden → cero huecos sin dense.
 *  - Armonía de alturas: dentro de una fila todas las celdas miden lo mismo.
 *    portrait span1 (h=4/3u) ↔ landscape span2 (h=4/3u) tilean perfecto;
 *    pano span4 (h=2u) y el díptico (16:9 → h=2.25u) van en fila propia.
 *
 * FRANCIA — el bento narrativo (diseñado en /plan-design-review 2026-06-03,
 * CURADO foto-por-foto por el dueño 2026-06-03 — T-11):
 *
 *   ┌───────────────────────────────────────────────────┐
 *   │ 136 EL XI DE ARGENTINA (díptico 16:9, full-row)     │ ← apertura
 *   ├─────────────────────────┬─────────────────────────┤
 *   │ 137 XI Francia (×2)     │ 138 Penal a Di María (×2)│ ← preludio
 *   ├─────────────────────────┴─────────────────────────┤
 *   │ 139 GOL MESSI DE PENAL 1-0 (21:9, full-row)        │ ← el primer grito
 *   ├─────────┬──────────────────────────┬──────────────┤
 *   │ 140 Asis│ 141 GOL DI MARÍA (LEG ×2)│ 142 Festejo  │ ← el 2-0
 *   ├─────────┼─────────┬────────────────┴──────────────┤
 *   │ 143     │ 144     │ 145 MESSI 3-2 (×2)            │ ← remontada + 3-2
 *   ├─────────┴─────────┴──┬────────────────────────────┤
 *   │ 146 Mbappé 3-3 (×2)  │ 147 ATAJADA DIBU (LEG ×2)  │ ← el alargue
 *   ├──────────────────────┴────────────────────────────┤
 *   │ 148 PENAL MBAPPÉ (21:9, full-row)                  │ ← abre la tanda
 *   ├─────────┬─────────────────────┬───────────────────┤
 *   │ 149     │ 150 Dibu-Coman (×2) │ 151               │ ← la tanda
 *   ├─────────┼─────────────────────┼───────────────────┤
 *   │ 152     │ 153 Tchouameni (×2) │ 154               │
 *   ├─────────┴─────────────────────┴───────────────────┤
 *   │ 155 PENAL KOLO MUANI (21:9, full-row)              │ ← última bala
 *   ├────────────────────────────────────────────────────┤
 *   │ 156 EL PENAL DE MONTIEL — CAMPEÓN (pano full, LEG) │ ← CLÍMAX
 *   ├─────────┬──────────────────┬───────────────────────┤
 *   │ 157 Fest│ 158 Corren (×2)  │ 159 Llanto            │ ← desahogo
 *   ├─────────┴────────┬─────────┼───────────────────────┤
 *   │ 160 Mbappé (×2)  │ 161     │ 162                   │
 *   ├─────────┬────────┴┬────────┴───────────────────────┤
 *   │ 163     │ 164     │ 165 BESO A LA COPA (LEG ×2)    │ ← cierre
 *   └─────────┴─────────┴────────────────────────────────┘
 *
 * Jerarquía de bandas full-row (alto en unidades de columna):
 *   bandas 21:9 (139/148/155) 1.71u < clímax pano (156) 2u < díptico 16:9 (136) 2.25u
 */

export type CromoLayout = 'portrait' | 'landscape' | 'pano'

export type BentoCell = {
  /** card_number del cromo (la grilla matchea contra AlbumCardSlot.cardNumber) */
  card: number
  layout: CromoLayout
  /** Columnas que ocupa en la grilla base de 4 */
  span: 1 | 2 | 3 | 4
  /**
   * Clase de aspect que PISA la del layout para la celda. El díptico usa 16:9:
   * el WebP es 3:2 (la foto del plantel) pero a full-row 3:2 sería monumental;
   * la celda recorta simétrico con object-cover y el dato completo queda en el
   * asset. Tiene que venir con `ratio` (para la armonía de filas).
   */
  aspectClass?: string
  /** Ratio efectivo w/h de la celda cuando aspectClass pisa el del layout. */
  ratio?: number
  /** Render especial: díptico (dos paneles + gutter de álbum físico). */
  diptych?: boolean
  /**
   * Posición horizontal del gutter del díptico (0..1, default 0.5). Tunear
   * ±0.02-0.03 si el centro cae sobre una cara del plantel.
   */
  gutter?: number
}

/** Columnas de la grilla bento — mismas en todos los breakpoints. */
export const BENTO_COLS = 4

/** Ratio w/h por layout (espeja RATIO_PRESETS del pipeline Python). */
export const LAYOUT_RATIO: Record<CromoLayout, number> = {
  portrait: 3 / 4,
  landscape: 3 / 2,
  pano: 2,
}

/** Clases Tailwind LITERALES (el JIT escanea este archivo). */
export const LAYOUT_ASPECT_CLASS: Record<CromoLayout, string> = {
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[3/2]',
  pano: 'aspect-[2/1]',
}

export const SPAN_CLASS: Record<BentoCell['span'], string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
}

/* eslint-disable no-irregular-whitespace */
export const FRANCIA_BENTO: BentoCell[] = [
  // R1 — apertura: el plantel campeón, partido en dos como en el álbum físico
  {
    card: 136,
    layout: 'landscape',
    span: 4,
    diptych: true,
    gutter: 0.5,
    aspectClass: 'aspect-[16/9]',
    ratio: 16 / 9,
  },
  // R2 — el preludio: el rival y la falta que abrió todo
  { card: 137, layout: 'landscape', span: 2 },
  { card: 138, layout: 'landscape', span: 2 },
  // R3 — el primer grito: banda cinemascope
  { card: 139, layout: 'landscape', span: 4, aspectClass: 'aspect-[21/9]', ratio: 21 / 9 },
  // R4 — el 2-0
  { card: 140, layout: 'portrait', span: 1 },
  { card: 141, layout: 'landscape', span: 2 }, // LEGENDARY: gol de Di María
  { card: 142, layout: 'portrait', span: 1 },
  // R5 — la remontada de Mbappé + el 3-2 de Messi
  { card: 143, layout: 'portrait', span: 1 },
  { card: 144, layout: 'portrait', span: 1 }, // la volea, plano cerrado (curaduría)
  { card: 145, layout: 'landscape', span: 2 }, // epic: Messi 3-2
  // R6 — el alargue: el 3-3 y LA atajada
  { card: 146, layout: 'landscape', span: 2 },
  { card: 147, layout: 'landscape', span: 2 }, // LEGENDARY: atajada a Kolo Muani
  // R7 — la tanda abre con banda: el primer penal
  { card: 148, layout: 'landscape', span: 4, aspectClass: 'aspect-[21/9]', ratio: 21 / 9 },
  // R8-R9 — la tanda: penales en celdas, las atajadas/erradas anchas
  { card: 149, layout: 'portrait', span: 1 },
  { card: 150, layout: 'landscape', span: 2 }, // epic: Dibu ataja a Coman
  { card: 151, layout: 'portrait', span: 1 },
  { card: 152, layout: 'portrait', span: 1 },
  { card: 153, layout: 'landscape', span: 2 }, // Tchouameni la tira afuera
  { card: 154, layout: 'portrait', span: 1 },
  // R10 — la última bala de Francia, banda
  { card: 155, layout: 'landscape', span: 4, aspectClass: 'aspect-[21/9]', ratio: 21 / 9 },
  // R11 — clímax: campeones del mundo
  { card: 156, layout: 'pano', span: 4 }, // LEGENDARY: el penal de Montiel
  // R12 — desahogo
  { card: 157, layout: 'portrait', span: 1 },
  { card: 158, layout: 'landscape', span: 2 },
  { card: 159, layout: 'portrait', span: 1 },
  // R13 — la otra cara
  { card: 160, layout: 'landscape', span: 2 }, // Mbappé y la Copa, composición ancha
  { card: 161, layout: 'portrait', span: 1 },
  { card: 162, layout: 'portrait', span: 1 },
  // R14 — los premios + el cierre
  { card: 163, layout: 'portrait', span: 1 },
  { card: 164, layout: 'portrait', span: 1 }, // el bisht, plano vertical (curaduría)
  { card: 165, layout: 'landscape', span: 2 }, // LEGENDARY: el beso a la copa
]
/* eslint-enable no-irregular-whitespace */

/** Páginas con bento curado (page_number → placement). Solo francia en la beta. */
export const BENTO_BY_PAGE: Record<number, BentoCell[]> = {
  8: FRANCIA_BENTO,
}

const CELL_INDEX: Record<number, Map<number, BentoCell>> = Object.fromEntries(
  Object.entries(BENTO_BY_PAGE).map(([page, cells]) => [
    page,
    new Map(cells.map((c) => [c.card, c])),
  ]),
)

/** ¿La página tiene bento curado? (sin bento → grilla uniforme actual) */
export function pageHasBento(pageNumber: number): boolean {
  return pageNumber in BENTO_BY_PAGE
}

/** Celda del bento para un cromo, o undefined (→ celda default portrait 1×1). */
export function getBentoCell(pageNumber: number, cardNumber: number): BentoCell | undefined {
  return CELL_INDEX[pageNumber]?.get(cardNumber)
}

/** Ratio efectivo w/h de la celda (el override del díptico pisa el del layout). */
export function cellRatio(cell: BentoCell): number {
  return cell.ratio ?? LAYOUT_RATIO[cell.layout]
}

/** Alto de la celda en unidades de columna (span/ratio) — para armonía de filas. */
export function cellHeightUnits(cell: BentoCell): number {
  return cell.span / cellRatio(cell)
}

/** Clase de aspect de la celda (override del díptico, sino la del layout). */
export function cellAspectClass(cell: BentoCell): string {
  return cell.aspectClass ?? LAYOUT_ASPECT_CLASS[cell.layout]
}

/** Clampea un span a las columnas de la grilla (guard contra spans inválidos). */
export function spanClamp(span: number, cols: number = BENTO_COLS): number {
  return Math.max(1, Math.min(span, cols))
}
