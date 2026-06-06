import { Cromo } from '@/components/domain/cromo'

/**
 * La Legendaria viva del hero de la landing.
 *
 * Prueba visual del diferenciador: la landing promete que los cromos "se mueven,
 * suenan y te devuelven el momento". Acá se muestra uno de verdad, con el mismo
 * <Cromo> del producto (holo + tilt + glare pointer-driven, borde prisma rotando,
 * glow gold). Arte placeholder por seed: cero IP, nunca una imagen rota.
 *
 * Identidad IP-safe: "La Tercera" (la tercera estrella) + la fecha de la final.
 * Sin nombrar jugadores ni marcas, coherente con la regla de la landing.
 *
 * Dos tamaños por viewport (el ancho del Cromo es fijo por `size`): md en mobile
 * para no desbordar pantallas angostas, lg en desktop como protagonista.
 *
 * Movimiento: idle float sutil + el prisma rotando (loop permitido en Rare+,
 * DESIGN.md §8.3). El reset global de `prefers-reduced-motion` apaga ambos → la
 * carta queda estática (y el tilt/holo del Cromo también, por su propio CSS).
 */

const CARD = {
  tier: 'legendary',
  name: 'La Tercera',
  playerRole: '18·12·2022',
  number: '11',
  seed: 'la-tercera-hero',
} as const

export function HeroLegendary() {
  return (
    <div className="relative flex justify-center">
      {/* Spotlight gold ambiente detrás de la carta (decorativo) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[420px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--color-gold) 16%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-5">
        {/* Idle float (lo apaga prefers-reduced-motion vía el reset global) */}
        <div style={{ animation: 'float 6s ease-in-out infinite' }}>
          <div className="lg:hidden">
            <Cromo {...CARD} size="md" />
          </div>
          <div className="hidden lg:block">
            <Cromo {...CARD} size="lg" />
          </div>
        </div>

        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
          Movela. Es de verdad.
        </p>
      </div>
    </div>
  )
}
