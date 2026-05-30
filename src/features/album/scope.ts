import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Scope activo del álbum.
 *
 * `pages.is_active` es el gate de la beta: roll_cards solo sortea cromos de
 * páginas activas (o falla con `no_active_cards`). El álbum y el home tienen que
 * reflejar el MISMO set, si no el usuario ve páginas que nunca va a poder llenar
 * y un progreso que nunca llega al total (T-04).
 *
 * Regla: si AL MENOS una página está activa → el álbum está gateado y solo cuenta
 * ese set. Si NINGUNA está activa (estado pre-beta / dev) → no está gateado,
 * devolvemos `null` = "mostrar todo" (comportamiento legacy del álbum completo).
 */

type PageActiveRow = { id: string; is_active: boolean | null }

/** Devuelve los page_ids activos, o `null` si el álbum no está gateado (mostrar todo). */
export function resolveActivePageIds(pages: PageActiveRow[]): string[] | null {
  const active = pages.filter((p) => p.is_active).map((p) => p.id)
  return active.length > 0 ? active : null
}

export type AlbumScope = {
  /** page_ids obtenibles, o null si el álbum no está gateado (mostrar todo). */
  activePageIds: string[] | null
  /** Cantidad de cromos obtenibles (del set activo, o el total del álbum si no gateado). */
  totalCards: number
}

/**
 * Resuelve el scope activo + la cantidad de cromos obtenibles. Lo usan el álbum
 * (`getAlbumData`) y el home (`getHomeData`) para que el progreso "X / N" sea
 * consistente y refleje lo que realmente se puede coleccionar hoy.
 */
export async function getAlbumScope(
  supabase: SupabaseClient<Database>,
  albumId: string,
): Promise<AlbumScope> {
  const { data: pages } = await supabase
    .from('pages')
    .select('id, is_active')
    .eq('album_id', albumId)

  const activePageIds = resolveActivePageIds(pages ?? [])

  let countQuery = supabase
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('album_id', albumId)
  if (activePageIds) countQuery = countQuery.in('page_id', activePageIds)
  const { count } = await countQuery

  return { activePageIds, totalCards: count ?? 0 }
}
