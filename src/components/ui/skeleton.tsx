import { cn } from '@/lib/utils'

/**
 * Skeleton — placeholder de carga liviano.
 *
 * Un pulse sutil sobre `--color-surface-raised` redondeado. Sin librería
 * (boneyard se evaluó y se descartó: overkill para lo que necesitamos).
 *
 * Uso: pasale className para el tamaño/forma del bloque que reemplaza.
 *   <Skeleton className="h-4 w-24" />
 *   <Skeleton className="aspect-[3/4] w-full rounded-[10px]" />
 *
 * Respeta `prefers-reduced-motion` vía el bloque global de globals.css
 * (las animaciones se neutralizan a ~0ms, el bloque queda como fondo estático).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-(--color-surface-raised)', className)}
    />
  )
}
