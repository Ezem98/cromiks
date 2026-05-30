'use client'

import { cn } from '@/lib/utils'
import type { AlbumCardSlot } from '../queries'

/**
 * Barra de filtros del álbum.
 *
 * Filtra los cromos de la PÁGINA ACTUAL client-side por:
 *  - tier (multi-select: ninguno = todos)
 *  - ownership (single: todas | las que tengo | las que me faltan)
 *  - pinned (toggle: solo destacadas)
 *
 * Controles claramente clickeables (DESIGN.md 11.1 / 13), keyboard-accessible
 * (button + aria-pressed), touch targets ≥44px (min-h-11). Muestra un contador
 * de resultados y un botón para limpiar cuando hay algún filtro activo.
 */

type Tier = AlbumCardSlot['tier']
type Ownership = 'all' | 'owned' | 'missing'

export type AlbumFilters = {
  /** Tiers seleccionados. Vacío = todos los tiers. */
  tiers: Tier[]
  ownership: Ownership
  pinnedOnly: boolean
}

export const defaultFilters: AlbumFilters = {
  tiers: [],
  ownership: 'all',
  pinnedOnly: false,
}

const TIER_ORDER: Tier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const tierLabels: Record<Tier, string> = {
  common: 'Común',
  uncommon: 'Poco común',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Legendaria',
}

const ownershipLabels: Record<Ownership, string> = {
  all: 'Todas',
  owned: 'Las que tengo',
  missing: 'Las que me faltan',
}

/** Color del tier para el pill seleccionado. Solo en cromos (DESIGN.md 4.5). */
const tierActiveClasses: Record<Tier, string> = {
  common: 'border-(--color-tier-common) text-(--color-tier-common) bg-(--color-tier-common)/10',
  uncommon:
    'border-(--color-tier-uncommon) text-(--color-tier-uncommon) bg-(--color-tier-uncommon)/10',
  rare: 'border-(--color-tier-rare) text-(--color-tier-rare) bg-(--color-tier-rare)/10',
  epic: 'border-(--color-tier-epic) text-(--color-tier-epic) bg-(--color-tier-epic)/10',
  legendary: 'border-(--color-gold) text-(--color-gold) bg-(--color-gold)/10',
}

/**
 * Aplica los filtros a la lista de cromos. Pura — testeable y memoizable.
 */
export function applyFilters(cards: AlbumCardSlot[], filters: AlbumFilters): AlbumCardSlot[] {
  return cards.filter((card) => {
    if (filters.tiers.length > 0 && !filters.tiers.includes(card.tier)) return false
    if (filters.ownership === 'owned' && !card.owned) return false
    if (filters.ownership === 'missing' && card.owned) return false
    if (filters.pinnedOnly && !card.isPinned) return false
    return true
  })
}

function isDefault(filters: AlbumFilters): boolean {
  return filters.tiers.length === 0 && filters.ownership === 'all' && !filters.pinnedOnly
}

type AlbumFilterBarProps = {
  filters: AlbumFilters
  onChange: (filters: AlbumFilters) => void
  resultCount: number
  totalCount: number
}

export function AlbumFilterBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: AlbumFilterBarProps) {
  const hasActiveFilters = !isDefault(filters)

  const toggleTier = (tier: Tier) => {
    const next = filters.tiers.includes(tier)
      ? filters.tiers.filter((t) => t !== tier)
      : [...filters.tiers, tier]
    onChange({ ...filters, tiers: next })
  }

  const cycleOwnership = (value: Ownership) => {
    onChange({ ...filters, ownership: value })
  }

  return (
    <section
      aria-label="Filtros del álbum"
      className={cn(
        'rounded-[10px] p-3 sm:p-4 space-y-3',
        'bg-(--color-surface-base)/60 border border-white/[0.06]',
      )}
    >
      {/* Ownership — segmented control (single-select) */}
      <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0 m-0">
        <legend className="sr-only">Filtrar por posesión</legend>
        {(['all', 'owned', 'missing'] as Ownership[]).map((value) => {
          const active = filters.ownership === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => cycleOwnership(value)}
              className={cn(
                'inline-flex min-h-11 items-center rounded-md px-3.5 text-sm',
                'border transition-all duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-argentina-glow)',
                active
                  ? 'border-(--color-argentina-glow) bg-(--color-argentina-glow)/10 text-(--color-argentina-glow)'
                  : 'border-white/[0.08] text-(--color-text-secondary) hover:border-white/[0.18] hover:text-(--color-text-primary)',
              )}
            >
              {ownershipLabels[value]}
            </button>
          )
        })}

        {/* Pinned toggle */}
        <button
          type="button"
          aria-pressed={filters.pinnedOnly}
          onClick={() => onChange({ ...filters, pinnedOnly: !filters.pinnedOnly })}
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 rounded-md px-3.5 text-sm',
            'border transition-all duration-200',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-argentina-glow)',
            filters.pinnedOnly
              ? 'border-(--color-gold) bg-(--color-gold)/10 text-(--color-gold)'
              : 'border-white/[0.08] text-(--color-text-secondary) hover:border-white/[0.18] hover:text-(--color-text-primary)',
          )}
        >
          <StarIcon className="size-3.5" />
          Destacadas
        </button>
      </fieldset>

      {/* Tiers — multi-select chips */}
      <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0 m-0">
        <legend className="sr-only">Filtrar por rareza</legend>
        {TIER_ORDER.map((tier) => {
          const active = filters.tiers.includes(tier)
          return (
            <button
              key={tier}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTier(tier)}
              className={cn(
                'inline-flex min-h-11 items-center rounded-md px-3.5 text-sm',
                'border transition-all duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-argentina-glow)',
                active
                  ? tierActiveClasses[tier]
                  : 'border-white/[0.08] text-(--color-text-secondary) hover:border-white/[0.18] hover:text-(--color-text-primary)',
              )}
            >
              {tierLabels[tier]}
            </button>
          )
        })}
      </fieldset>

      {/* Result count + clear */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <p className="text-mono text-[11px] uppercase tracking-[0.12em] text-(--color-text-muted)">
          {resultCount === totalCount ? `${totalCount} cromos` : `${resultCount} de ${totalCount}`}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange(defaultFilters)}
            className={cn(
              'inline-flex min-h-11 items-center text-sm text-(--color-text-secondary)',
              'underline-offset-4 hover:text-(--color-text-primary) hover:underline',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-argentina-glow) rounded-sm',
            )}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </section>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2L13.5 8.5L20 9L15 13L16.5 19.5L12 16L7.5 19.5L9 13L4 9L10.5 8.5L12 2Z" />
    </svg>
  )
}
