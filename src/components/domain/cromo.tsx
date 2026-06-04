'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { type CromoSize, cromoDimensions } from './cromo-dimensions'
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
  size?: CromoSize
  /**
   * Ratio w/h del cromo (la foto en su layout: portrait 3/4 default, landscape
   * 3/2, pano 2). El ancho queda fijo por `size`; el alto sale del ratio. Ver
   * `@/lib/cards/photo-layout` (PHOTO_LAYOUT_RATIO) para los valores canónicos.
   */
  ratio?: number
  /**
   * Díptico: parte la foto en dos paneles con un gutter de álbum físico (la
   * identidad "se arma con 2 mitades" del XI campeón, cromo 136). Espeja el
   * gutter de la grilla (`diptych-slot.tsx`) en el detalle.
   */
  diptych?: boolean
  /** Posición horizontal del gutter del díptico (0..1, default 0.5). */
  gutter?: number
  /**
   * Carga la foto con prioridad (Next/Image `priority` → eager + fetchpriority
   * high + preload). Para cromos above-the-fold que son el LCP (ej. el hero del
   * spotlight del álbum, U-17). Las legendarias ya van priority por su cuenta.
   */
  priority?: boolean
  className?: string
}

const sizeMap = {
  sm: {
    framePad: 6,
    nameSize: 'text-[14px]',
    roleSize: 'text-[8px]',
    numberSize: 'text-[15px]',
  },
  md: {
    framePad: 8,
    nameSize: 'text-[18px]',
    roleSize: 'text-[9px]',
    numberSize: 'text-[18px]',
  },
  lg: {
    framePad: 10,
    nameSize: 'text-[22px]',
    roleSize: 'text-[10px]',
    numberSize: 'text-[22px]',
  },
} as const

/**
 * Passe-partout por tier: el marco "matte" tier-coded que rodea la foto (tipo TCG).
 * Gradiente diagonal = sheen metálico, no un color plano. Legendary usa el dorado
 * (y además el prism-border rotando por fuera). El glow del tier vive aparte en
 * `--cromo-tier-glow` (box-shadow por `data-tier` en globals.css).
 */
function frameSheen(c: string): string {
  return `linear-gradient(150deg, color-mix(in srgb, ${c} 60%, #fff) 0%, ${c} 40%, color-mix(in srgb, ${c} 70%, #000) 100%)`
}

const tierFrame: Record<Tier, string> = {
  common: frameSheen('var(--color-tier-common)'),
  uncommon: frameSheen('var(--color-tier-uncommon)'),
  rare: frameSheen('var(--color-tier-rare)'),
  epic: frameSheen('var(--color-tier-epic)'),
  legendary: frameSheen('var(--color-gold)'),
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
  ratio = 3 / 4,
  diptych = false,
  gutter = 0.5,
  priority = false,
  className,
}: CromoProps) {
  const dims = sizeMap[size]
  const { width, height } = cromoDimensions(size, ratio)
  // Cromo apaisado (landscape/pano): la nameplate baja su padding para no comerse
  // la foto, que es más baja que en portrait. T-08.
  const wide = ratio > 1
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
      style={{ width, height }}
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

      {/* Frame (passe-partout): matte tier-coded que rodea la foto, tipo TCG. El arte
          ya no va a sangre — queda enmarcado y recesado adentro del marco. */}
      <div
        className={cn(
          'relative size-full overflow-hidden rounded-[16px]',
          // Hairline oscuro que define la silueta + glow del tier. Un solo box-shadow:
          // dos clases shadow-[] se pisan en --tw-shadow.
          'shadow-[0_0_0_1px_rgba(0,0,0,0.45),var(--cromo-tier-glow)]',
        )}
        style={{ padding: dims.framePad, background: tierFrame[tier] }}
      >
        {/* Ventana del arte: recesada dentro del marco (inner shadow = "hundido"). */}
        <div
          className={cn(
            'relative size-full overflow-hidden rounded-[10px]',
            'flex flex-col justify-end',
            'border border-black/40',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_2px_12px_rgba(0,0,0,0.55)]',
          )}
        >
          {/* Arte o placeholder. onError → placeholder (objeto R2 faltante, no rota). */}
          <div className="absolute inset-0">
            {imageUrl && erroredUrl !== imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                fill
                sizes={`${width}px`}
                className="object-cover"
                priority={priority || isLegendary}
                // La CLI ya entrega el WebP 3:4 en tamaño final → saltamos el
                // optimizer de Next (CPU/sharp en Railway) para una imagen ya óptima.
                unoptimized
                onError={() => setErroredUrl(imageUrl)}
              />
            ) : (
              <CromoPlaceholder seed={seed} tier={tier} />
            )}
          </div>

          {/* Díptico: el gutter de álbum físico parte la foto en dos paneles.
              Mismo lenguaje que `diptych-slot.tsx` en la grilla; va sobre la foto
              y el foil (z-10) pero debajo del número/nameplate (z-20). */}
          {diptych && (
            <div
              data-testid="cromo-diptych-gutter"
              className="pointer-events-none absolute inset-y-0 z-10 w-1.5 -translate-x-1/2 bg-(--color-surface-deep)"
              style={{ left: `${(gutter * 100).toFixed(1)}%` }}
              aria-hidden="true"
            >
              <div className="absolute inset-y-0 left-0 w-px bg-white/10" />
              <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
            </div>
          )}

          {/* Rare: scanlines foil (estático, sutil) */}
          {isRare && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'repeating-linear-gradient(120deg, transparent 0px, color-mix(in srgb, var(--color-tier-rare) 13%, transparent) 1px, transparent 2px, transparent 7px)',
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
                  'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--color-tier-epic) 20%, transparent) 0%, transparent 60%)',
              }}
              aria-hidden="true"
            />
          )}

          {/* Legendary: glow radial (amarillo del prism, tier-legendary-3) */}
          {isLegendary && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--color-tier-legendary-3) 20%, transparent) 0%, transparent 55%)',
              }}
              aria-hidden="true"
            />
          )}

          {/* Foil holográfico (pointer-driven, ver globals.css) */}
          <div className="cromo-holo" aria-hidden="true" />
          {/* Glare especular (pointer-driven) */}
          <div className="cromo-glare" aria-hidden="true" />

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

          {/* Nameplate: panel oscurecido por gradiente. SIN border-top: ese hairline
              (border-white/10) Chromium lo compositaba como una costura OSCURA de 1px
              que cruzaba toda la carta sobre el gradiente transparente. El gradiente
              solo ya separa el panel; el borde sobraba y quedaba feo. */}
          <div
            className={cn('relative z-20 px-4', wide ? 'pt-5 pb-3' : 'pt-7 pb-4')}
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.72) 45%, rgba(0,0,0,0.92) 100%)',
            }}
          >
            {/* Filete art-deco — acento premium sutil (legendary/epic) */}
            {(isLegendary || isEpic) && (
              <DecoRule
                className={cn(
                  'mb-1.5',
                  isLegendary ? 'text-(--color-gold)/80' : 'text-(--color-tier-epic)/70',
                )}
              />
            )}
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
      </div>

      {/* Estado: ¡Nuevo! badge flotante */}
      {state === 'new' && (
        <div className="absolute -top-2 -right-2 z-30">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium leading-none',
              'bg-(--color-argentina-glow) text-(--color-surface-deep)',
              'shadow-[0_0_16px_color-mix(in_srgb,var(--color-argentina-glow)_50%,transparent)]',
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
 * Pip de rareza: gema chica tier-coded. Legendary = sol de mayo dorado
 * (símbolo argentino sin escudo AFA — ver visual-references.md).
 */
function RarityPip({ tier }: { tier: Tier }) {
  if (tier === 'legendary') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-4 text-(--color-gold) drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        aria-hidden="true"
      >
        {/* Sunburst de 8 rayos (tips r=11, valles r=5.5) */}
        <polygon
          points="12,1 14.11,6.92 19.78,4.22 17.08,9.89 23,12 17.08,14.11 19.78,19.78 14.11,17.08 12,23 9.89,17.08 4.22,19.78 6.92,14.11 1,12 6.92,9.89 4.22,4.22 9.89,6.92"
          fill="currentColor"
        />
        {/* Aro interno del sol (rasgo del sol de mayo) */}
        <circle
          cx="12"
          cy="12"
          r="3.6"
          fill="none"
          stroke="var(--color-surface-deep)"
          strokeWidth="0.9"
          opacity="0.5"
        />
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

/**
 * Filete art-deco: línea — rombo — línea. Acento sutil en la nameplate de los
 * tiers premium. Hereda el color por `currentColor` (lo setea el caller).
 */
function DecoRule({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 6"
      className={cn('h-1.5 w-12', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <line x1="0" y1="3" x2="19" y2="3" strokeLinecap="round" />
      <polygon points="24,0.5 27,3 24,5.5 21,3" fill="currentColor" stroke="none" />
      <line x1="29" y1="3" x2="48" y2="3" strokeLinecap="round" />
    </svg>
  )
}
