import { cn } from '@/lib/utils'
import { type BentoCell, cellAspectClass } from '../bento-layout'
import type { AlbumCardSlot } from '../queries'
import { tierBorders, tierGhostColors, tierGlows } from './album-slot'

/**
 * DiptychSlot — el render especial del XI de Argentina (cromo 136, bento de
 * francia). UN cromo ancho presentado como DOS PANELES cosidos: una sola
 * imagen con un "gutter de álbum físico" al medio (gap fino mostrando el
 * fondo de la página, como la separación entre dos figuritas pegadas).
 * Decisión de /plan-design-review 2026-06-03: afordancia visual del
 * "se arma con 2 mitades", SIN mecánica de coleccionable (es 1 carta,
 * 1 número, 1 drop — el 2-mitades real quedó post-beta, ver TODOS T-09).
 *
 *   ┌──────────────────┬─┬──────────────────┐
 *   │                  │ │                  │   ← una sola <img> (object-cover),
 *   │   mitad izq      │g│   mitad der      │     el gutter es un overlay en
 *   │   del plantel    │ │   del plantel    │     cell.gutter (default 50%)
 *   │                  │ │                  │
 *   └──────────────────┴─┴──────────────────┘
 *
 * Missing: ghost de DOS paneles con la formación insinuada (11 puntitos en
 * dos filas) — "acá va la formación" — más el número grande, mismo lenguaje
 * de foreshadowing que MissingSlot.
 *
 * NO reusa AlbumSlot adentro: dos slots con borde/radio propios mostrarían
 * una costura doble; acá el marco es UNO y el gutter es interno.
 */

type DiptychSlotProps = {
  card: AlbumCardSlot
  cell: BentoCell
  onClick?: () => void
}

export function DiptychSlot({ card, cell, onClick }: DiptychSlotProps) {
  const aspect = cellAspectClass(cell)
  const gutterLeft = `${((cell.gutter ?? 0.5) * 100).toFixed(1)}%`

  if (!card.owned) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group relative w-full rounded-[10px] overflow-hidden',
          aspect,
          'border border-dashed transition-all duration-200',
          'flex items-center justify-center',
          'bg-(--color-surface-base)/40 hover:bg-(--color-surface-base)/70',
          // 136 es uncommon — mismo tinte de foreshadowing que MissingSlot
          'border-(--color-tier-uncommon)/15 hover:border-(--color-tier-uncommon)/30',
        )}
        aria-label={`Cromo ${card.cardNumber}, no obtenido`}
      >
        {/* La formación insinuada: 11 puntitos en 5-6, esquivando el gutter */}
        <FormationGhost tier={card.tier} />

        {/* Gutter fantasma: ya se lee que esto son dos paneles */}
        <DiptychGutter left={gutterLeft} ghost />

        <span
          className={cn(
            'relative z-10 text-display leading-none opacity-30 group-hover:opacity-50 transition-opacity',
            'text-(--color-text-muted)',
            'text-[clamp(24px,5vw,36px)]',
          )}
        >
          {card.cardNumber}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-[10px]',
        aspect,
        'border transition-all duration-200',
        'flex flex-col justify-end overflow-hidden',
        'bg-(--color-surface-elevated)',
        'hover:scale-[1.01] hover:z-10',
        tierBorders[card.tier],
        tierGlows[card.tier],
      )}
      aria-label={`${card.name}, cromo ${card.cardNumber}`}
    >
      {/* Una sola foto (el WebP 3:2 del plantel); la celda 16:9 recorta con sesgo
          hacia abajo (62%): conserva los botines de la fila delantera y recorta
          tribuna, que sobra arriba (design review F-001). */}
      {card.imageUrl ? (
        // biome-ignore lint/performance/noImgElement: img normal, mismo criterio que album-slot
        <img
          src={card.imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover object-[50%_62%]"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #1f1a12 0%, #3d3220 100%)' }}
          aria-hidden="true"
        />
      )}

      {/* El gutter de álbum físico: parte la foto en dos paneles */}
      <DiptychGutter left={gutterLeft} />

      {/* Número — chip oscuro, mismo tratamiento que el owned slot */}
      <div className="absolute top-1.5 right-1.5 z-20">
        <span
          className={cn(
            'inline-flex items-center rounded-md px-1.5 py-0.5 leading-none',
            'text-display text-[clamp(12px,2.5vw,16px)]',
            'bg-(--color-surface-deep)/70 backdrop-blur-sm border border-white/10',
            'text-(--color-tier-uncommon)',
          )}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          {card.cardNumber}
        </span>
      </div>

      {/* Badge de copies */}
      {card.copies > 1 && (
        <div className="absolute top-1.5 left-1.5 z-20">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-1.5 py-0.5',
              'text-mono text-[9px] leading-none',
              'bg-(--color-surface-deep)/85 backdrop-blur-sm',
              'text-(--color-gold) border border-(--color-gold)/30',
            )}
          >
            ×{card.copies}
          </span>
        </div>
      )}

      {/* Nameplate sobre el gutter (un solo label para el díptico entero) */}
      <div
        className="relative z-20 px-3 pb-2 pt-6"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 60%)',
        }}
      >
        <p className="text-display text-white leading-tight truncate text-[clamp(10px,2vw,13px)]">
          {card.name.toUpperCase()}
        </p>
      </div>
    </button>
  )
}

/**
 * El gutter: gap vertical mostrando el fondo de la página (--surface-deep),
 * con hairlines blancos que definen el borde interno de cada "figurita".
 * `ghost` = versión apagada para el estado missing.
 */
function DiptychGutter({ left, ghost = false }: { left: string; ghost?: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-y-0 z-10 w-1.5 -translate-x-1/2',
        ghost ? 'bg-(--color-surface-deep)/50' : 'bg-(--color-surface-deep)',
      )}
      style={{ left }}
      aria-hidden="true"
    >
      <div className={cn('absolute inset-y-0 left-0 w-px', ghost ? 'bg-white/5' : 'bg-white/10')} />
      <div
        className={cn('absolute inset-y-0 right-0 w-px', ghost ? 'bg-white/5' : 'bg-white/10')}
      />
    </div>
  )
}

/**
 * La formación insinuada para el estado missing: 11 puntitos (5 atrás, 6
 * adelante) repartidos en los dos paneles, esquivando el gutter central.
 * Mismo lenguaje que MissingSilhouette: currentColor, opacidad bajísima.
 */
function FormationGhost({ tier }: { tier: AlbumCardSlot['tier'] }) {
  // Fila de atrás (5) y de adelante (6), x en viewBox 320 — nada entre 152-168
  // para que el gutter (50%) no pise un "jugador".
  const back = [48, 100, 144, 220, 272]
  const front = [28, 76, 124, 196, 244, 292]
  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 size-full',
        // Más presencia que los ghosts portrait (0.07): esta celda es el hero
        // full-row y a 0.08 los puntos desaparecían a escala de página
        // (design review F-002). Sigue siendo penumbra, no ruido.
        'opacity-[0.11] group-hover:opacity-[0.16] transition-opacity duration-200',
        tierGhostColors[tier],
      )}
    >
      {back.map((x) => (
        <circle key={`b${x}`} cx={x} cy={72} r={12} fill="currentColor" />
      ))}
      {front.map((x) => (
        <circle key={`f${x}`} cx={x} cy={118} r={12} fill="currentColor" />
      ))}
    </svg>
  )
}
