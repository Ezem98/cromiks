/**
 * Layout de la foto de un cromo — fuente ÚNICA del ratio por layout.
 *
 * El layout sale del catálogo (`content.photo.layout`) y el seed lo guarda tal
 * cual en `cards.content` (jsonb). Es el ratio BASE con el que la CLI recorta el
 * WebP: portrait 3:4 / landscape 3:2 / pano 2:1. Distinto del override de GRILLA
 * del bento (ej. 139 se muestra en banda 21:9, 136 en 16:9): esos viven en
 * `features/album/bento-layout.ts` y son solo diagramación de la página.
 *
 * Todas las superficies que muestran la foto a tamaño real (detalle, reveal lite)
 * usan el layout BASE, no el override — así el cromo se ve en el ratio en que se
 * recortó la foto, sin recortes extra. `bento-layout` reexporta `LAYOUT_RATIO`
 * desde acá para no tener dos copias del mismo número (la tercera vive en el
 * pipeline Python, `RATIO_PRESETS`, sincronizada por test).
 */

export type PhotoLayout = 'portrait' | 'landscape' | 'pano'

/** Ratio w/h por layout. Espeja RATIO_PRESETS del pipeline (scripts/assets). */
export const PHOTO_LAYOUT_RATIO: Record<PhotoLayout, number> = {
  portrait: 3 / 4,
  landscape: 3 / 2,
  pano: 2,
}

/**
 * Extrae el layout del bloque `content.photo` de un cromo (el jsonb crudo de la
 * DB). Defensivo: cualquier forma inesperada (content array de placeholder, sin
 * photo, layout desconocido) cae a 'portrait', el default histórico del cromo.
 */
export function parsePhotoLayout(content: unknown): PhotoLayout {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return 'portrait'
  const photo = (content as Record<string, unknown>).photo
  if (!photo || typeof photo !== 'object') return 'portrait'
  const layout = (photo as Record<string, unknown>).layout
  return layout === 'landscape' || layout === 'pano' ? layout : 'portrait'
}
