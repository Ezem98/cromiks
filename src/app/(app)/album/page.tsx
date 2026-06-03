import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AlbumSkeleton } from '@/features/album/components/album-skeleton'
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
 *
 * Suspense ACÁ (además del loading.tsx de la ruta) porque este boundary SÍ
 * conoce ?page= → para francia el fallback renderiza el skeleton del BENTO
 * (mismo const que la grilla real, bento-layout.ts) y el primer paint no se
 * mueve cuando llega la data (CLS < 0.05, DESIGN.md 13.4). key=pageNumber
 * re-muestra el fallback al navegar entre páginas.
 *
 * Caveat conocido: getAlbumData normaliza el page pedido al set activo (ej.
 * /album sin param con solo francia activa → cae en francia). En ese caso el
 * fallback es el uniforme y el swap al bento ocurre al llegar la data — es
 * input-adjacent (navegación por click) así que no computa para CLS. Los
 * links internos (page nav) siempre llevan ?page= explícito y matchean.
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

  return (
    <Suspense key={pageNumber} fallback={<AlbumSkeleton pageNumber={pageNumber} />}>
      <AlbumContent pageNumber={pageNumber} />
    </Suspense>
  )
}

/** El fetch + render real — suspende dentro del boundary page-aware de arriba. */
async function AlbumContent({ pageNumber }: { pageNumber: number }) {
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
