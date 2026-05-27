import { redirect } from 'next/navigation'
import { AlbumView } from '@/features/album/components/album-view'
import { getAlbumData } from '@/features/album/queries'
import { getCurrentUserProfile } from '@/features/profile/queries'

/**
 * Página del álbum — vista de los 205 cromos distribuidos en 10 páginas.
 *
 * Query param:
 *  - `page`: número de página (1..10). Default 1 si no hay o es inválido.
 *
 * Si el usuario llega a `/album` sin page param, defaulteamos a la página 1.
 * Si el page no existe (1..10), getAlbumData lo normaliza al rango válido.
 */

export const metadata = {
  title: 'Tu álbum · Cromiks',
}

type AlbumPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function AlbumPage({ searchParams }: AlbumPageProps) {
  const params = await searchParams
  const pageParam = params.page ? Number.parseInt(params.page, 10) : 1
  const pageNumber = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const data = await getAlbumData(pageNumber)

  if (!data) {
    // El layout (app) ya hace el guard de auth — si llegamos acá sin user
    // es un caso edge. Mandamos a signin como fallback.
    redirect('/signin')
  }

  // Obtener el username del profile del user para attribution en shares (?u=username).
  // Si todavía no terminó el onboarding o no tiene username, share funciona sin attribution.
  const profile = await getCurrentUserProfile()
  const username = profile?.username ?? null

  return <AlbumView data={data} username={username} />
}
