'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { AlbumPage } from '../queries'

/**
 * Navegación entre páginas del álbum.
 *
 * Cada dot representa una página. Estados visuales:
 *  - Vacía (sin cromos owned): dot neutro gris
 *  - Con algunos cromos: dot dorado tenue + relleno parcial proporcional
 *  - Completada (100%): dot dorado lleno con halo sutil
 *  - Actual: dot ensanchado azul (independiente del completion)
 *
 * Hover: tooltip con "X / Y" para ver el progreso sin entrar a la página.
 *
 * Cada dot/link navega via Next Link a `?page=N` (server-side fetch).
 */

type AlbumPageNavProps = {
  pages: AlbumPage[]
  currentPageNumber: number
  /**
   * Completion por página: pageNumber → { owned, total }.
   * Si no se pasa, los dots se muestran neutros.
   */
  pageCompletion?: Map<number, { owned: number; total: number }>
}

export function AlbumPageNav({ pages, currentPageNumber, pageCompletion }: AlbumPageNavProps) {
  const prevPage = currentPageNumber > 1 ? currentPageNumber - 1 : null
  const nextPage = currentPageNumber < pages.length ? currentPageNumber + 1 : null

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      <PageArrowButton targetPage={prevPage} direction="prev" ariaLabel="Página anterior" />

      <div className="flex items-center gap-2 flex-1 justify-center max-w-md">
        {pages.map((page) => (
          <PageDot
            key={page.id}
            page={page}
            isCurrent={page.pageNumber === currentPageNumber}
            completion={pageCompletion?.get(page.pageNumber)}
          />
        ))}
      </div>

      <PageArrowButton targetPage={nextPage} direction="next" ariaLabel="Siguiente página" />
    </div>
  )
}

/**
 * Un dot individual del nav. Renderiza el estado visual según completion
 * y muestra tooltip al hover con el progreso exacto.
 */
function PageDot({
  page,
  isCurrent,
  completion,
}: {
  page: AlbumPage
  isCurrent: boolean
  completion?: { owned: number; total: number }
}) {
  const owned = completion?.owned ?? 0
  const total = completion?.total ?? 0
  const ratio = total > 0 ? owned / total : 0
  const isComplete = total > 0 && owned === total
  const hasAny = owned > 0

  return (
    <Link
      href={`/album?page=${page.pageNumber}`}
      scroll={false}
      className={cn(
        'group relative flex items-center justify-center h-2.5 rounded-full transition-all duration-200',
        // Width: la página actual se ensancha
        isCurrent ? 'w-8' : 'w-2.5',
        // Background base
        isCurrent && 'bg-(--color-argentina-glow)',
        !isCurrent && isComplete && 'bg-(--color-gold)',
        !isCurrent && !isComplete && hasAny && 'bg-(--color-gold)/25 hover:bg-(--color-gold)/40',
        !isCurrent && !hasAny && 'bg-(--color-surface-elevated) hover:bg-white/15',
        // Halo sutil en páginas completadas (no current)
        !isCurrent && isComplete && 'shadow-[0_0_8px_rgba(212,169,60,0.4)]',
      )}
      aria-label={`Página ${page.pageNumber}: ${page.title}${
        completion ? ` (${owned} de ${total})` : ''
      }`}
      aria-current={isCurrent ? 'page' : undefined}
    >
      {/* Relleno parcial — solo en páginas non-current con completion parcial */}
      {!isCurrent && !isComplete && hasAny && (
        <span
          className="absolute inset-0 rounded-full bg-(--color-gold)/70"
          style={{
            clipPath: `inset(0 ${100 - ratio * 100}% 0 0)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip — aparece al hover */}
      {completion && (
        <span
          className={cn(
            'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
            'pointer-events-none whitespace-nowrap',
            'px-2 py-1 rounded-md',
            'bg-(--color-surface-deep) border border-white/[0.08]',
            'text-mono text-[10px] text-(--color-text-primary)',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            'z-20',
          )}
        >
          <span className="text-(--color-text-muted)">P{page.pageNumber}</span>
          <span className="mx-1 text-white/30">·</span>
          <span className={cn(isComplete ? 'text-(--color-gold)' : 'text-(--color-text-primary)')}>
            {owned}/{total}
          </span>
        </span>
      )}
    </Link>
  )
}

/**
 * Botón prev/next con estado disabled cuando no hay más páginas.
 */
function PageArrowButton({
  targetPage,
  direction,
  ariaLabel,
}: {
  targetPage: number | null
  direction: 'prev' | 'next'
  ariaLabel: string
}) {
  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon

  if (targetPage === null) {
    return (
      <span
        className={cn(
          'flex items-center justify-center size-9 rounded-full',
          'bg-(--color-surface-elevated)/40 text-(--color-text-muted)/40 cursor-not-allowed',
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
    )
  }

  return (
    <Link
      href={`/album?page=${targetPage}`}
      scroll={false}
      className={cn(
        'flex items-center justify-center size-9 rounded-full transition-all duration-200',
        'bg-(--color-surface-elevated) text-(--color-text-primary)',
        'hover:bg-white/[0.08] active:scale-95',
      )}
      aria-label={ariaLabel}
    >
      <Icon className="size-4" />
    </Link>
  )
}
