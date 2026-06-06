import Link from 'next/link'
import { type SobreType, typeLabels } from '@/components/domain/sobre'
import { Button } from '@/components/ui/button'

/**
 * Sobres extra pendientes en el home (misiones, referidos, bienvenida, etc.).
 *
 * Antes esto era un dead-end: contaba cuántos sobres tenías sin dejar abrirlos.
 * Ahora cada sobre es una fila accionable que linkea a /open/[id] (la apertura
 * es idempotente y vale para cualquier tipo de sobre, no solo el diario).
 *
 * El sobre diario NO va acá: tiene su propia card protagonista arriba.
 */

type ExtraPack = {
  id: string
  type: string
  card_count: number | null
}

export function ExtraPacksCard({ packs }: { packs: ExtraPack[] }) {
  return (
    <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
      <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted) mb-4">
        Sobres extra
      </p>

      <ul className="space-y-3">
        {packs.map((pack) => {
          const label = typeLabels[pack.type as SobreType] ?? 'Sobre'
          const count = pack.card_count ?? 4

          return (
            <li key={pack.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-(--color-text-primary) text-sm font-medium truncate">{label}</p>
                <p className="text-(--color-text-muted) text-xs mt-0.5">{count} cromos adentro</p>
              </div>

              <Button asChild size="sm" variant="primary" className="shrink-0">
                <Link href={`/open/${pack.id}`} aria-label={`Abrir ${label.toLowerCase()}`}>
                  Abrir
                </Link>
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
