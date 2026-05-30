import { cn } from '@/lib/utils'
import type { AlbumCardSlot } from '../queries'

/**
 * Un slot del álbum.
 *
 * Estados visuales:
 *  - Owned: muestra una mini representación del cromo (border tier-coded,
 *    nombre + número visibles). Badge de copies si tiene > 1.
 *  - Missing: silhouette gris con el número del cromo grande al centro.
 *    Visualmente "vacío", indica al user qué slot le falta.
 *
 * NOTA: NO usamos el componente <Cromo/> completo porque sería:
 *  1. Demasiado grande (renderizar 20 Cromos por página x animaciones = lag)
 *  2. Detallado de más para una vista de overview
 *
 * Acá el slot es un thumbnail. El detalle completo del cromo se ve en
 * E1.4 (modal de detalle al hacer click).
 *
 * El click handler lo maneja el parent (AlbumView) para abrir el detalle.
 */

type AlbumSlotProps = {
  card: AlbumCardSlot
  onClick?: () => void
}

const tierBorders: Record<AlbumCardSlot['tier'], string> = {
  common: 'border-(--color-tier-common)/40',
  uncommon: 'border-(--color-tier-uncommon)/70',
  rare: 'border-(--color-tier-rare)',
  epic: 'border-(--color-tier-epic)',
  legendary: 'border-transparent',
}

const tierGlows: Record<AlbumCardSlot['tier'], string> = {
  common: '',
  uncommon: 'shadow-[0_0_8px_rgba(212,169,60,0.15)]',
  rare: 'shadow-[0_0_10px_rgba(91,163,224,0.25)]',
  epic: 'shadow-[0_0_12px_rgba(185,127,227,0.25)]',
  legendary: 'shadow-[0_0_14px_rgba(212,169,60,0.3)]',
}

const tierTextColors: Record<AlbumCardSlot['tier'], string> = {
  common: 'text-(--color-tier-common)',
  uncommon: 'text-(--color-tier-uncommon)',
  rare: 'text-(--color-tier-rare)',
  epic: 'text-(--color-tier-epic)',
  legendary: 'text-(--color-gold)',
}

export function AlbumSlot({ card, onClick }: AlbumSlotProps) {
  if (!card.owned) {
    return <MissingSlot cardNumber={card.cardNumber} tier={card.tier} onClick={onClick} />
  }

  return <OwnedSlot card={card} onClick={onClick} />
}

/**
 * Silueta del tier para el ghost pip — el mismo tinte que usa el pin/número
 * del owned slot, pero desaturado. Es foreshadowing: "acá va a ir un cromo".
 */
const tierGhostColors: Record<AlbumCardSlot['tier'], string> = {
  common: 'text-(--color-tier-common)',
  uncommon: 'text-(--color-tier-uncommon)',
  rare: 'text-(--color-tier-rare)',
  epic: 'text-(--color-tier-epic)',
  legendary: 'text-(--color-gold)',
}

/**
 * Slot vacío — placeholder para un cromo no obtenido aún.
 *
 * Diseño:
 *  - Background dark con border dashed, tinte del tier sutil (foreshadowing)
 *  - Silueta cromo-shaped a baja opacidad, tintada por tier
 *  - Número del cromo grande al centro (le indica al user cuál le falta)
 *  - Pip de rareza fantasma (tier-tinted, desaturado) abajo a la derecha —
 *    como el pin del owned slot pero apagado: "acá va una <tier>".
 *
 * Debe leerse como foreshadowing, no como ruido: todo a baja opacidad,
 * dark/premium. El detalle sube levemente en hover.
 */
function MissingSlot({
  cardNumber,
  tier,
  onClick,
}: {
  cardNumber: number
  tier: AlbumCardSlot['tier']
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative aspect-[3/4] w-full rounded-[10px] overflow-hidden',
        'border border-dashed transition-all duration-200',
        'flex items-center justify-center',
        'bg-(--color-surface-base)/40',
        // Border sutilmente tinted del tier para dar pista
        tier === 'common' && 'border-white/[0.06] hover:border-white/[0.1]',
        tier === 'uncommon' &&
          'border-(--color-tier-uncommon)/15 hover:border-(--color-tier-uncommon)/30',
        tier === 'rare' && 'border-(--color-tier-rare)/20 hover:border-(--color-tier-rare)/40',
        tier === 'epic' && 'border-(--color-tier-epic)/20 hover:border-(--color-tier-epic)/40',
        tier === 'legendary' && 'border-(--color-gold)/25 hover:border-(--color-gold)/50',
        'hover:bg-(--color-surface-base)/70',
      )}
      aria-label={`Cromo ${cardNumber}, no obtenido`}
    >
      {/* Silueta cromo-shaped tintada por tier, muy baja opacidad. Sube en hover. */}
      <MissingSilhouette tier={tier} />

      {/* Número grande al centro, por encima de la silueta */}
      <span
        className={cn(
          'relative z-10 text-display leading-none opacity-30 group-hover:opacity-50 transition-opacity',
          'text-(--color-text-muted)',
          'text-[clamp(20px,4vw,28px)]',
        )}
      >
        {cardNumber}
      </span>

      {/* Pip de rareza fantasma — el mismo glifo que el pin del owned, desaturado */}
      <span
        className={cn(
          'absolute bottom-1.5 right-1.5 z-10',
          'opacity-25 saturate-50 group-hover:opacity-40 transition-opacity',
          tierGhostColors[tier],
        )}
        aria-hidden="true"
      >
        <PinIcon className="size-3" />
      </span>
    </button>
  )
}

/**
 * Silueta de cromo para el slot vacío: una figura abstracta (cabeza + hombros)
 * en `currentColor`, a opacidad muy baja, tintada por tier vía text-color.
 * Mantenemos el SVG inline y mínimo (no reusamos CromoPlaceholder, que dibuja
 * fondo opaco + gradients y "tapa" el estado vacío) para que lea como foreshadowing.
 */
function MissingSilhouette({ tier }: { tier: AlbumCardSlot['tier'] }) {
  return (
    <svg
      viewBox="0 0 240 320"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 size-full',
        'opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-200',
        tierGhostColors[tier],
      )}
    >
      {/* Cabeza */}
      <circle cx="120" cy="104" r="42" fill="currentColor" />
      {/* Hombros / torso */}
      <path d="M 36 230 Q 120 152 204 230 L 188 320 L 52 320 Z" fill="currentColor" />
    </svg>
  )
}

/**
 * Slot con cromo obtenido — thumbnail compacto del cromo.
 *
 * Diseño:
 *  - Background dark con border del tier
 *  - Glow sutil del tier
 *  - Nombre del jugador abajo (truncated)
 *  - Número del cromo arriba a la derecha
 *  - Badge "×N" si copies > 1
 *  - Pin indicator si está pineada
 */
function OwnedSlot({ card, onClick }: { card: AlbumCardSlot; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative aspect-[3/4] w-full rounded-[10px]',
        'border transition-all duration-200',
        'flex flex-col justify-end overflow-hidden',
        'bg-(--color-surface-elevated)',
        'hover:scale-[1.03] hover:z-10',
        tierBorders[card.tier],
        tierGlows[card.tier],
      )}
      aria-label={`${card.name}, cromo ${card.cardNumber}`}
    >
      {/* Background del cromo: imagen si tiene, sino gradient tier-coded */}
      <SlotBackground card={card} />

      {/* Foil holográfico en hover — solo legendary/epic (P4). CSS puro, sin
          pointer-JS, así la grilla no pierde perf con 20 cartas. */}
      {(card.tier === 'legendary' || card.tier === 'epic') && (
        <div className="cromo-slot-holo" data-tier={card.tier} aria-hidden="true" />
      )}

      {/* Número arriba a la derecha */}
      <div
        className={cn(
          'absolute top-1.5 right-1.5 z-10',
          'text-display leading-none',
          'text-[clamp(12px,2.5vw,16px)]',
          tierTextColors[card.tier],
        )}
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
      >
        {card.cardNumber}
      </div>

      {/* Badge de copies (si tiene más de 1) */}
      {card.copies > 1 && (
        <div className="absolute top-1.5 left-1.5 z-10">
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

      {/* Pin indicator (si está pineada) */}
      {card.isPinned && (
        <div className="absolute bottom-1.5 right-1.5 z-10">
          <PinIcon className="size-3 text-(--color-gold) drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        </div>
      )}

      {/* Nombre del jugador abajo */}
      <div
        className="relative z-10 px-2 pb-2 pt-6"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 60%)',
        }}
      >
        <p className="text-display text-white leading-tight truncate text-[clamp(9px,2vw,11px)]">
          {card.name.toUpperCase()}
        </p>
      </div>
    </button>
  )
}

/**
 * Background del slot — la "foto" o un gradient tier-coded como fallback.
 *
 * Como muchas cards aún no tienen `photo.source` real (están en "TODO"),
 * la mayoría usa el gradient. Cuando lleguen las fotos reales, se renderean.
 */
function SlotBackground({ card }: { card: AlbumCardSlot }) {
  if (card.imageUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: usamos img normal para evitar el overhead de next/image en thumbnails chicos
      <img
        src={card.imageUrl}
        alt=""
        className="absolute inset-0 size-full object-cover"
        loading="lazy"
      />
    )
  }

  return <SlotGradientBg tier={card.tier} />
}

/**
 * Fallback visual cuando no hay foto: gradient con tinte tier-coded.
 */
function SlotGradientBg({ tier }: { tier: AlbumCardSlot['tier'] }) {
  const gradients: Record<AlbumCardSlot['tier'], string> = {
    common: 'linear-gradient(135deg, #1a1f28 0%, #2a323f 100%)',
    uncommon: 'linear-gradient(135deg, #1f1a12 0%, #3d3220 100%)',
    rare: 'linear-gradient(135deg, #0f2540 0%, #1f3a5c 100%)',
    epic: 'linear-gradient(135deg, #1a1426 0%, #3a2b5c 100%)',
    legendary: 'linear-gradient(135deg, #050309 0%, #1a1426 100%)',
  }

  return (
    <div className="absolute inset-0" style={{ background: gradients[tier] }} aria-hidden="true" />
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2L13.5 8.5L20 9L15 13L16.5 19.5L12 16L7.5 19.5L9 13L4 9L10.5 8.5L12 2Z" />
    </svg>
  )
}
