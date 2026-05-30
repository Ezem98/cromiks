'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AlbumCardSlot, AlbumData, PageCompletionMap } from '../queries'
import { AlbumFilterBar, type AlbumFilters, applyFilters, defaultFilters } from './album-filter-bar'
import { AlbumPageNav } from './album-page-nav'
import { AlbumSlot } from './album-slot'
import { CardDetailDialog } from './card-detail-dialog'

/**
 * Vista principal del álbum.
 *
 * Layout:
 *  - Header con título de la página actual + progreso
 *  - Grid responsive de slots (4 columns mobile, 5 desktop, 6 wide)
 *  - Page nav abajo
 *
 * Por ahora el click en un slot no abre nada (E1.4 es el detalle del cromo).
 * En esta fase solo prendemos el estado seleccionado para preview.
 *
 * Animaciones:
 *  - Stagger fade-in de los slots al entrar a una página
 *  - Hover scale en owned slots (manejado por AlbumSlot)
 *
 * No usamos `key={pageNumber}` en el grid porque el server component
 * ya re-renderiza al cambiar el query param. AnimatePresence no haría
 * falta — Next maneja el remount.
 */

type AlbumViewProps = {
  data: AlbumData
  /** Username del user (para attribution en shares, opcional) */
  username?: string | null
}

export function AlbumView({ data, username }: AlbumViewProps) {
  const {
    pages,
    currentPage,
    cards,
    totalCards,
    totalOwned,
    pageOwned,
    pageTotalCards,
    pageCompletion,
  } = data
  const [selectedCard, setSelectedCard] = useState<AlbumCardSlot | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filters, setFilters] = useState<AlbumFilters>(defaultFilters)

  // Filtrado client-side de la página actual. useMemo así no recalcula en
  // cada render (ej. al abrir el dialog).
  const visibleCards = useMemo(() => applyFilters(cards, filters), [cards, filters])

  // CTA: primera página (≠ la actual) donde el user tiene ≥1 cromo.
  const jumpToPage = useMemo(
    () => findPageWithOwned(pageCompletion, currentPage.pageNumber),
    [pageCompletion, currentPage.pageNumber],
  )

  const handleSlotClick = (card: AlbumCardSlot) => {
    setSelectedCard(card)
    setDialogOpen(true)
  }

  return (
    <div className="min-h-screen pb-24">
      {/* === Header sticky con info global === */}
      <AlbumHeader totalOwned={totalOwned} totalCards={totalCards} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* === Page title === */}
        <PageHeader
          pageNumber={currentPage.pageNumber}
          title={currentPage.title}
          subtitle={currentPage.subtitle}
          owned={pageOwned}
          total={pageTotalCards}
        />

        {/* === CTA: saltar a una página con cromos tuyos === */}
        {jumpToPage !== null && (
          <Link
            href={`/album?page=${jumpToPage}`}
            scroll={false}
            className={cn(
              'group inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2.5',
              'bg-(--color-surface-raised) border border-white/[0.08]',
              'text-(--color-text-secondary) text-sm',
              'transition-all duration-200',
              'hover:bg-(--color-surface-elevated) hover:border-white/[0.18] hover:text-(--color-text-primary)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-argentina-glow)',
            )}
          >
            <span className="text-(--color-gold)" aria-hidden="true">
              →
            </span>
            Ir a una página con cromos tuyos
            <span className="text-mono text-[11px] text-(--color-text-muted)">P{jumpToPage}</span>
          </Link>
        )}

        {/* === Filtros de la página actual === */}
        <AlbumFilterBar
          filters={filters}
          onChange={setFilters}
          resultCount={visibleCards.length}
          totalCount={cards.length}
        />

        {/* === Grid de cromos === */}
        {visibleCards.length > 0 ? (
          <motion.div
            // key fuerza re-mount al cambiar de página/filtro → stagger fade-in
            key={`${currentPage.pageNumber}-${filters.tiers.join(',')}-${filters.ownership}-${filters.pinnedOnly}`}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.03 },
              },
            }}
            className={cn(
              'grid gap-2.5 sm:gap-3',
              // Responsive: 4 cols mobile → 5 sm → 6 md → 7 lg
              'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7',
            )}
          >
            {visibleCards.map((card) => (
              <motion.div
                key={card.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
              >
                <AlbumSlot card={card} onClick={() => handleSlotClick(card)} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-(--color-text-secondary) text-sm">No hay cromos con ese filtro.</p>
            <p className="text-(--color-text-muted) text-xs mt-1">
              Aflojá un poco los filtros y fijate de nuevo.
            </p>
          </div>
        )}

        {/* === Page nav === */}
        <div className="pt-6">
          <AlbumPageNav
            pages={pages}
            currentPageNumber={currentPage.pageNumber}
            pageCompletion={pageCompletion}
          />
        </div>

        {/* === Empty state, opcional (página sin cromos, sin filtros activos) === */}
        {pageOwned === 0 && (
          <p className="text-center text-(--color-text-muted) text-sm pt-2">
            Aún no tenés cromos de esta página. Seguí abriendo sobres.
          </p>
        )}
      </div>

      {/* Modal de detalle del cromo */}
      <CardDetailDialog
        card={selectedCard}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        username={username}
      />
    </div>
  )
}

/**
 * Header con info global del álbum.
 *
 * - Título "Tu álbum"
 * - Progreso global X / N + barra (N = scope activo del álbum)
 */
function AlbumHeader({ totalOwned, totalCards }: { totalOwned: number; totalCards: number }) {
  const percentage =
    totalCards === 0 ? 0 : Math.min(100, Math.round((totalOwned / totalCards) * 100))

  return (
    <div className="sticky top-0 z-30 backdrop-blur-md bg-(--color-surface-deep)/85 border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div>
            <p className="text-mono text-[10px] uppercase tracking-[0.2em] text-(--color-text-muted)">
              Tu álbum
            </p>
            <h1 className="text-display text-2xl sm:text-3xl text-(--color-text-primary) leading-none mt-1">
              Eterno Diciembre
            </h1>
          </div>

          <div className="text-right">
            <p className="text-display text-3xl text-(--color-text-primary) leading-none">
              {totalOwned}
              <span className="text-(--color-text-muted) text-base"> / {totalCards}</span>
            </p>
            <p className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-gold) mt-1">
              {percentage}%
            </p>
          </div>
        </div>

        {/* Progress bar global */}
        <div className="h-1 bg-(--color-surface-elevated) rounded-full overflow-hidden">
          <div
            className="h-full bg-(--color-argentina-glow) rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Encuentra la página a la que apuntar el CTA "ir a una página con cromos".
 *
 * Reglas:
 *  - Devuelve la PRÓXIMA página (en orden de pageNumber) con ≥1 cromo owned,
 *    arrancando después de la actual y dando la vuelta (wrap) si hace falta.
 *  - Excluye la página actual.
 *  - Devuelve null si ninguna otra página tiene cromos (all-or-none): nada
 *    útil a dónde saltar → el CTA se oculta.
 */
function findPageWithOwned(
  pageCompletion: PageCompletionMap,
  currentPageNumber: number,
): number | null {
  const pagesWithOwned = [...pageCompletion.entries()]
    .filter(([pageNumber, c]) => c.owned > 0 && pageNumber !== currentPageNumber)
    .map(([pageNumber]) => pageNumber)
    .sort((a, b) => a - b)

  if (pagesWithOwned.length === 0) return null

  // Próxima por orden circular: la primera mayor a la actual, sino la primera.
  return pagesWithOwned.find((p) => p > currentPageNumber) ?? pagesWithOwned[0]
}

/**
 * Header de la página actual del álbum.
 *
 * Muestra el page number como índice, título, subtítulo opcional,
 * y completion de la página (X / Y).
 */
function PageHeader({
  pageNumber,
  title,
  subtitle,
  owned,
  total,
}: {
  pageNumber: number
  title: string
  subtitle: string | null
  owned: number
  total: number
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {/* Page number badge */}
        <div
          className={cn(
            'flex items-center justify-center size-10 sm:size-12 rounded-md shrink-0',
            'bg-(--color-surface-raised) border border-white/[0.08]',
          )}
        >
          <span className="text-display text-xl sm:text-2xl text-(--color-text-primary) leading-none">
            {pageNumber}
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="text-display text-lg sm:text-xl text-(--color-text-primary) leading-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-(--color-text-secondary) text-xs sm:text-sm mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Page completion */}
      <div className="shrink-0 text-right">
        <p className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          En esta página
        </p>
        <p className="text-display text-lg text-(--color-text-primary) leading-none mt-1">
          {owned}
          <span className="text-(--color-text-muted) text-sm"> / {total}</span>
        </p>
      </div>
    </div>
  )
}
