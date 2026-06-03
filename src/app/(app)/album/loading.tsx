import { AlbumSkeleton } from '@/features/album/components/album-skeleton'

/**
 * Loading state del álbum — fallback de Suspense a nivel RUTA. No conoce
 * ?page= (limitación del App Router) → skeleton uniforme. El boundary
 * page-aware (que sí renderiza el skeleton del bento para francia) vive en
 * page.tsx; este fallback solo cubre el primer instante del stream.
 */
export default function AlbumLoading() {
  return <AlbumSkeleton />
}
