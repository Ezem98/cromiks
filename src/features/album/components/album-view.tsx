'use client'

import { motion } from 'motion/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AlbumCardSlot, AlbumData } from '../queries'
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

        {/* === Grid de cromos === */}
        <motion.div
          // key fuerza re-mount al cambiar de página → stagger fade-in
          key={currentPage.pageNumber}
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
          {cards.map((card) => (
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

        {/* === Page nav === */}
        <div className="pt-6">
          <AlbumPageNav
            pages={pages}
            currentPageNumber={currentPage.pageNumber}
            pageCompletion={pageCompletion}
          />
        </div>

        {/* === Empty state, opcional === */}
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
 * - Progreso global X / 205 + barra
 */
function AlbumHeader({ totalOwned, totalCards }: { totalOwned: number; totalCards: number }) {
  const percentage = totalCards === 0 ? 0 : Math.round((totalOwned / totalCards) * 100)

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
