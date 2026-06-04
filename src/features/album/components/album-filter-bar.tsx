'use client'

import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AlbumCardSlot } from '../queries'

/**
 * Barra de filtros del álbum.
 *
 * Filtra los cromos de la PÁGINA ACTUAL client-side por:
 *  - búsqueda de texto (nombre del jugador o número de cromo)
 *  - tier (multi-select: ninguno = todos)
 *  - ownership (single: todas | las que tengo | las que me faltan)
 *  - pinned (toggle: solo destacadas)
 *
 * Mobile (T-10): el buscador queda siempre visible y el resto (posesión +
 * destacadas + rarezas) se colapsa tras un toggle "Filtrar" con badge de conteo,
 * para no empujar el primer cromo bajo el fold. Desktop muestra todo.
 *
 * Controles claramente clickeables (DESIGN.md 11.1 / 13), keyboard-accessible
 * (button + aria-pressed), touch targets ≥44px (min-h-11). El estado vive en la
 * URL (ver `../filters-url` + AlbumView) → sobrevive page-nav, back y share.
 */

type Tier = AlbumCardSlot['tier']
type Ownership = 'all' | 'owned' | 'missing'

export type AlbumFilters = {
  /** Búsqueda de texto: matchea nombre o número de cromo. Vacío = sin búsqueda. */
  q: string
  /** Tiers seleccionados. Vacío = todos los tiers. */
  tiers: Tier[]
  ownership: Ownership
  pinnedOnly: boolean
}

export const defaultFilters: AlbumFilters = {
  q: '',
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

/**
 * Dot de color por tier — leyenda mínima color→rareza dentro del chip. Es la
 * ÚNICA excepción que DESIGN.md §4.5 permite al "tier color solo en cromos": un
 * puntito, nunca el chip entero (el estado activo sigue siendo argentina-glow).
 * Mismos tokens que el cromo (legendary = gold).
 */
const tierDotColor: Record<Tier, string> = {
  common: 'bg-(--color-tier-common)',
  uncommon: 'bg-(--color-tier-uncommon)',
  rare: 'bg-(--color-tier-rare)',
  epic: 'bg-(--color-tier-epic)',
  legendary: 'bg-(--color-gold)',
}

/**
 * Tratamiento ÚNICO de chip seleccionado en toda la barra (posesión, destacadas
 * y tier). El color de tier NO se usa acá: vive exclusivamente en los cromos
 * (DESIGN.md §4.5). El tier se identifica por el label + el dot; el estado activo
 * es neutro argentina-glow.
 */
const chipBase =
  'inline-flex min-h-11 items-center rounded-md px-3.5 text-sm border transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-argentina-glow)'
const chipActive =
  'border-(--color-argentina-glow) bg-(--color-argentina-glow)/10 text-(--color-argentina-glow)'
const chipInactive =
  'border-white/[0.08] text-(--color-text-secondary) hover:border-white/[0.18] hover:text-(--color-text-primary)'

/** ¿El cromo matchea la búsqueda de texto (nombre o número)? Puro. */
export function matchesQuery(card: AlbumCardSlot, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return card.name.toLowerCase().includes(needle) || String(card.cardNumber).includes(needle)
}

/**
 * Aplica los filtros a la lista de cromos. Pura — testeable y memoizable.
 */
export function applyFilters(cards: AlbumCardSlot[], filters: AlbumFilters): AlbumCardSlot[] {
  return cards.filter((card) => {
    if (!matchesQuery(card, filters.q)) return false
    if (filters.tiers.length > 0 && !filters.tiers.includes(card.tier)) return false
    if (filters.ownership === 'owned' && !card.owned) return false
    if (filters.ownership === 'missing' && card.owned) return false
    if (filters.pinnedOnly && !card.isPinned) return false
    return true
  })
}

export function isDefault(filters: AlbumFilters): boolean {
  return (
    filters.q.trim() === '' &&
    filters.tiers.length === 0 &&
    filters.ownership === 'all' &&
    !filters.pinnedOnly
  )
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
  // Disclosure mobile: la barra completa son 9 controles; colapsada por default.
  const [expanded, setExpanded] = useState(false)
  // Filtros activos detrás del toggle (la búsqueda queda fuera, siempre visible).
  const activeCount =
    (filters.ownership !== 'all' ? 1 : 0) + (filters.pinnedOnly ? 1 : 0) + filters.tiers.length

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
      {/* Búsqueda — siempre visible (mobile y desktop). El power-user que vuelve
          busca por nombre/número sin desplegar nada. */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-(--color-text-muted)"
          aria-hidden="true"
        />
        <input
          type="search"
          inputMode="search"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder="Buscar por nombre o número"
          aria-label="Buscar cromos por nombre o número"
          className={cn(
            'w-full min-h-11 rounded-md pl-9 pr-9 text-sm',
            'bg-(--color-surface-deep)/60 border border-white/[0.08]',
            'text-(--color-text-primary) placeholder:text-(--color-text-muted)',
            'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-(--color-argentina-glow)',
            // El clear nativo del type=search lo ocultamos: usamos el nuestro (X).
            '[&::-webkit-search-cancel-button]:appearance-none',
          )}
        />
        {filters.q && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, q: '' })}
            aria-label="Limpiar búsqueda"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-md',
              'text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-white/[0.06]',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--color-argentina-glow)',
            )}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Toggle "Filtrar" — solo mobile. Posesión + destacadas + rarezas (9
          controles) colapsan acá para no empujar el primer cromo bajo el fold
          (T-10). El badge muestra cuántos de esos filtros hay activos. */}
      <button
        type="button"
        className={cn(
          'sm:hidden flex w-full items-center justify-between min-h-11',
          'text-sm text-(--color-text-secondary)',
          'rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-argentina-glow)',
        )}
        aria-expanded={expanded}
        aria-controls="album-filter-panel"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filtrar
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-medium bg-(--color-argentina-glow)/15 text-(--color-argentina-glow)">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn('size-4 transition-transform duration-200', expanded && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {/* Panel: oculto en mobile salvo expanded; siempre visible sm+ */}
      <div
        id="album-filter-panel"
        className={cn('space-y-3', expanded ? 'block' : 'hidden sm:block')}
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
                className={cn(chipBase, active ? chipActive : chipInactive)}
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
            className={cn(chipBase, 'gap-1.5', filters.pinnedOnly ? chipActive : chipInactive)}
          >
            <StarIcon className="size-3.5" />
            Destacadas
          </button>
        </fieldset>

        {/* Tiers — multi-select chips, cada uno con su dot de color (leyenda) */}
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
                className={cn(chipBase, 'gap-2', active ? chipActive : chipInactive)}
              >
                <span
                  className={cn('size-2 shrink-0 rounded-full', tierDotColor[tier])}
                  aria-hidden="true"
                />
                {tierLabels[tier]}
              </button>
            )
          })}
        </fieldset>

        {/* Result count + clear */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <p className="text-mono text-[11px] uppercase tracking-[0.12em] text-(--color-text-muted)">
            {resultCount === totalCount
              ? `${totalCount} cromos`
              : `${resultCount} de ${totalCount}`}
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
