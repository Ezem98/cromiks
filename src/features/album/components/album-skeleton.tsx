import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { BENTO_BY_PAGE, cellAspectClass, pageHasBento, SPAN_CLASS } from '../bento-layout'

/**
 * Skeleton del álbum — replica la estructura de <AlbumView> (header sticky +
 * page header + grid + nav) para que no haya layout shift cuando llega la
 * data real (DESIGN.md 13.4: CLS < 0.05).
 *
 * Bento-aware: si `pageNumber` tiene bento curado (francia), el grid skeleton
 * usa EL MISMO const que la grilla real (bento-layout.ts) → mismas celdas,
 * mismos spans, mismos aspect → el primer paint no se mueve. Sin pageNumber
 * (el loading.tsx a nivel ruta no conoce ?page=) cae a la grilla uniforme.
 */
export function AlbumSkeleton({ pageNumber }: { pageNumber?: number }) {
  const bentoCells = pageNumber !== undefined ? BENTO_BY_PAGE[pageNumber] : undefined

  return (
    <div className="min-h-screen pb-24">
      {/* === Header global (matchea AlbumHeader) === */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-(--color-surface-deep)/85 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-40" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
          {/* Progress bar */}
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* === Page header (matchea PageHeader) === */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Skeleton className="size-10 sm:size-12 rounded-md shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>

        {/* === Grid skeleton: bento real o uniforme === */}
        {bentoCells && pageNumber !== undefined && pageHasBento(pageNumber) ? (
          <div className="grid gap-2.5 sm:gap-3 grid-cols-4">
            {bentoCells.map((cell) => (
              <Skeleton
                key={cell.card}
                className={cn(
                  SPAN_CLASS[cell.span],
                  cellAspectClass(cell),
                  'w-full rounded-[10px]',
                )}
              />
            ))}
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-2.5 sm:gap-3',
              'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7',
            )}
          >
            {Array.from({ length: 21 }, (_, i) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: lista estática de placeholders sin identidad
                key={i}
                className="aspect-[3/4] w-full rounded-[10px]"
              />
            ))}
          </div>
        )}

        {/* === Page nav (dots + flechas) === */}
        <div className="pt-6 flex items-center justify-between gap-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex items-center gap-2">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: lista estática de placeholders sin identidad
                key={i}
                className="size-2.5 rounded-full"
              />
            ))}
          </div>
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>
    </div>
  )
}
