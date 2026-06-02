'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { CromoPlaceholder } from './cromo-placeholder'

/**
 * Componente principal del producto: el cromo.
 *
 * Calidad tipo TCG foil (ref: pokemon-cards-css de Simon Goellner). Dos capas
 * de "terminación":
 *
 * 1. INTERACTIVIDAD (pointer-driven, ver `.cromo*` en globals.css):
 *    - 3D tilt que sigue el puntero (perspective + rotateX/Y), spring-back al salir.
 *    - Glare especular que sigue el dedo/mouse.
 *    - Foil holográfico prismático que se corre con el puntero (intensidad por tier).
 *    Todo respeta `prefers-reduced-motion` (la carta queda plana, sin holo/glare).
 *
 * 2. TERMINACIÓN (estática, aplica aunque el arte sea placeholder):
 *    - Frame con bisel interno (doble marco) + inner shadow → "espesor de cartón".
 *    - Nameplate (panel con hairline superior) en vez de solo un gradiente.
 *    - Pip de rareza + número en badge enmarcado.
 *
 * Anatomía por tier (glow + tilt máximo + fuerza del holo en CSS):
 *  - common:    marco neutro, sin holo
 *  - uncommon:  dorado mate, holo sutil
 *  - rare:      celeste, foil + scanlines
 *  - epic:      violeta, foil + glow radial
 *  - legendary: prism border rotando + gold, foil pleno
 *
 * Si no hay `imageUrl` —o si la imagen falla al cargar (objeto R2 faltante)—
 * usa CromoPlaceholder (SVG determinístico por seed), nunca una imagen rota.
 */

type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

type CromoProps = {
  tier: Tier
  name: string
  playerRole?: string
  number?: string | number
  imageUrl?: string
  seed: string
  state?: 'idle' | 'new' | 'repeated'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: {
    width: 160,
    height: 213,
    nameSize: 'text-[14px]',
    roleSize: 'text-[8px]',
    numberSize: 'text-[15px]',
  },
  md: {
    width: 240,
    height: 320,
    nameSize: 'text-[18px]',
    roleSize: 'text-[9px]',
    numberSize: 'text-[18px]',
  },
  lg: {
    width: 320,
    height: 427,
    nameSize: 'text-[22px]',
    roleSize: 'text-[10px]',
    numberSize: 'text-[22px]',
  },
} as const

/**
 * Border por tier. El glow ya NO vive acá: es `--cromo-tier-glow` (box-shadow
 * derivado de la paleta vía `color-mix`, definido por `data-tier` en globals.css)
 * y se fusiona con el inner-shadow del material en un único box-shadow abajo.
 */
const tierBorders: Record<Tier, string> = {
  common: 'border-(--color-tier-common)/50',
  uncommon: 'border-(--color-tier-uncommon)',
  rare: 'border-(--color-tier-rare)',
  epic: 'border-(--color-tier-epic)',
  legendary: 'border-transparent',
}

/** Tilt máximo (grados) por tier. Legendary el que más "se mueve". */
const maxTilt: Record<Tier, number> = {
  common: 6,
  uncommon: 8,
  rare: 10,
  epic: 12,
  legendary: 14,
}

const tierAccent: Record<Tier, string> = {
  common: 'text-(--color-tier-common)',
  uncommon: 'text-(--color-tier-uncommon)',
  rare: 'text-(--color-tier-rare)',
  epic: 'text-(--color-tier-epic)',
  legendary: 'text-(--color-gold)',
}

export function Cromo({
  tier,
  name,
  playerRole,
  number,
  imageUrl,
  seed,
  state = 'idle',
  size = 'md',
  className,
}: CromoProps) {
  const dims = sizeMap[size]
  const isLegendary = tier === 'legendary'
  const isRare = tier === 'rare'
  const isEpic = tier === 'epic'
  const rootRef = useRef<HTMLDivElement>(null)
  // Si el objeto de R2 falta (404) pese a estar `published`, caemos al placeholder
  // en vez de mostrar una imagen rota. Guardamos la URL que falló (no un bool) para
  // que un imageUrl nuevo no quede suprimido por el error de uno viejo.
  const [erroredUrl, setErroredUrl] = useState<string | null>(null)

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width // 0..1
    const py = (e.clientY - r.top) / r.height // 0..1
    const tilt = maxTilt[tier]
    el.style.setProperty('--cx', `${(px * 100).toFixed(2)}%`)
    el.style.setProperty('--cy', `${(py * 100).toFixed(2)}%`)
    el.style.setProperty('--rx', `${((0.5 - py) * tilt).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${((px - 0.5) * tilt).toFixed(2)}deg`)
    el.style.setProperty('--glare', '1')
    el.dataset.interacting = 'true'
  }

  const handlePointerLeave = () => {
    const el = rootRef.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--glare', '0')
    el.dataset.interacting = 'false'
  }

  return (
    <div
      ref={rootRef}
      data-tier={tier}
      className={cn('cromo relative', state === 'repeated' && 'opacity-75', className)}
      style={{ width: dims.width, height: dims.height }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Legendary: borde prism rotando (loop permitido en Rare+ por DESIGN.md 8.3) */}
      {isLegendary && (
        <div
          className="absolute -inset-[2px] rounded-[18px] prism-border-rotating"
          aria-hidden="true"
        />
      )}

      {/* Card body */}
      <div
        className={cn(
          'relative size-full overflow-hidden rounded-[16px] border',
          'flex flex-col justify-end',
          // Un solo box-shadow: highlight superior + viñeta interna ("espesor de cartón
          // foil") + glow del tier (--cromo-tier-glow, por data-tier en globals.css).
          // Van juntos a propósito: dos clases shadow-[] se pisan (--tw-shadow).
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_34px_rgba(0,0,0,0.4),var(--cromo-tier-glow)]',
          tierBorders[tier],
        )}
      >
        {/* Arte o placeholder. onError → placeholder (objeto R2 faltante, no rota). */}
        <div className="absolute inset-0">
          {imageUrl && erroredUrl !== imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes={`${dims.width}px`}
              className="object-cover"
              priority={isLegendary}
              // La CLI ya entrega el WebP 3:4 en tamaño final → saltamos el
              // optimizer de Next (CPU/sharp en Railway) para una imagen ya óptima.
              unoptimized
              onError={() => setErroredUrl(imageUrl)}
            />
          ) : (
            <CromoPlaceholder seed={seed} tier={tier} />
          )}
        </div>

        {/* Rare: scanlines foil (estático, sutil) */}
        {isRare && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(120deg, transparent 0px, rgba(91, 163, 224, 0.13) 1px, transparent 2px, transparent 7px)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Epic: glow radial central */}
        {isEpic && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(185, 127, 227, 0.2) 0%, transparent 60%)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Legendary: glow gold radial */}
        {isLegendary && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(255, 217, 107, 0.2) 0%, transparent 55%)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Foil holográfico (pointer-driven, ver globals.css) */}
        <div className="cromo-holo" aria-hidden="true" />
        {/* Glare especular (pointer-driven) */}
        <div className="cromo-glare" aria-hidden="true" />

        {/* Frame interno (bisel) — el "doble marco" tipo TCG */}
        <div
          className={cn(
            'pointer-events-none absolute inset-[3px] z-10 rounded-[12px]',
            'border border-white/10',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
          )}
          aria-hidden="true"
        />

        {/* Pip de rareza arriba-izquierda */}
        <div className="absolute top-2.5 left-2.5 z-20">
          <RarityPip tier={tier} />
        </div>

        {/* Número en badge enmarcado arriba-derecha */}
        {number !== undefined && (
          <div className="absolute top-2.5 right-2.5 z-20">
            <span
              className={cn(
                'inline-flex items-center rounded-md px-1.5 py-0.5 leading-none',
                'text-display',
                dims.numberSize,
                'bg-(--color-surface-deep)/55 backdrop-blur-sm',
                'border border-white/10',
                tierAccent[tier],
              )}
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
            >
              {number}
            </span>
          </div>
        )}

        {/* Nameplate: panel con hairline superior (no solo gradiente) */}
        <div
          className={cn(
            'relative z-20 px-4 pt-7 pb-4',
            'border-t',
            isLegendary ? 'border-(--color-gold)/30' : 'border-white/10',
          )}
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.72) 45%, rgba(0,0,0,0.92) 100%)',
          }}
        >
          <div className={cn('text-display text-white leading-[0.95]', dims.nameSize)}>
            {name.toUpperCase()}
          </div>
          {playerRole && (
            <div
              className={cn(
                'text-mono uppercase mt-1 leading-none',
                dims.roleSize,
                isLegendary ? 'text-(--color-gold)/90' : 'text-white/65',
              )}
            >
              {playerRole}
            </div>
          )}
        </div>
      </div>

      {/* Estado: ¡Nuevo! badge flotante */}
      {state === 'new' && (
        <div className="absolute -top-2 -right-2 z-30">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium leading-none',
              'bg-(--color-argentina-glow) text-(--color-surface-deep)',
              'shadow-[0_0_16px_rgba(107,185,255,0.5)]',
            )}
          >
            ¡Nuevo!
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Pip de rareza: gema chica tier-coded. Legendary = estrella dorada.
 */
function RarityPip({ tier }: { tier: Tier }) {
  if (tier === 'legendary') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-4 text-(--color-gold) drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2L14.2 8.5L21 9L15.5 13L17.5 19.5L12 15.8L6.5 19.5L8.5 13L3 9L9.8 8.5L12 2Z" />
      </svg>
    )
  }
  const dot: Record<Exclude<Tier, 'legendary'>, string> = {
    common: 'bg-(--color-tier-common)',
    uncommon: 'bg-(--color-tier-uncommon)',
    rare: 'bg-(--color-tier-rare)',
    epic: 'bg-(--color-tier-epic)',
  }
  return (
    <span
      className={cn('block size-2.5 rotate-45 rounded-[2px] border border-white/20', dot[tier])}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
      aria-hidden="true"
    />
  )
}
