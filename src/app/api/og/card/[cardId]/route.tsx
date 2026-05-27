import * as Sentry from '@sentry/nextjs'
import { headers } from 'next/headers'
import { ImageResponse } from 'next/og'
import { getRateLimiter } from '@/lib/ratelimit'
import { createClient } from '@/lib/supabase/server'

/**
 * Endpoint OG image: GET /api/og/card/[cardId]?u=username
 *
 * Genera dinámicamente una imagen 1200×630 (estándar Open Graph / Twitter Card)
 * representando el cromo cardId. Si se pasa ?u=username, agrega "compartido por @username".
 *
 * Implementación: usa `ImageResponse` de next/og que internamente usa Satori
 * (JSX → SVG) + Resvg (SVG → PNG). Todo server-side.
 *
 * IMPORTANTE — Limitaciones de Satori:
 *  - TODOS los <div> deben tener `display: flex` explícito si tienen más de
 *    un child. JSX trata strings con interpolación como múltiples children
 *    (ej: "Hola #{n}" = "Hola #" + n = 2 children). Por las dudas, todos los
 *    divs acá usan display: flex aunque tengan un solo child visible.
 *  - Subset de CSS: flexbox sí, grid limitado, no filter, no box-shadow inset
 *  - linear/radial-gradient soportado
 *  - Fonts: usa system default si no se proveen. Para custom fonts hay que
 *    fetchearlos y pasarlos como ArrayBuffer al constructor.
 *
 * Cache: la imagen es determinística por cardId (+username opcional). Vercel
 * cachea por defecto. Si cambia el contenido (foto del cromo), invalidar.
 */

export const runtime = 'nodejs'

// Cache de 1h. La imagen es determinística por (cardId, username), pero si
// cambia la foto/nombre/rareza del cromo en DB necesitamos que se regenere
// eventualmente. Sin esto Vercel cachea para siempre y los posts viejos
// muestran data vieja (B-07). 1h es un balance razonable.
export const revalidate = 3600

type RouteParams = {
  params: Promise<{ cardId: string }>
}

/** Imagen OG estática de fallback — se devuelve si la pipeline de Satori falla
 *  o el cromo no existe. Sin esto los crawlers de WhatsApp/Twitter no muestran
 *  preview cuando algo se rompe del lado del render (B-08). */
function fallbackImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0E14 0%, #1F1810 50%, #0A0E14 100%)',
        color: '#E6ECF2',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 64,
          letterSpacing: 10,
          color: '#D4A93C',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        Cromiks
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 22,
          color: '#A6B0BD',
          letterSpacing: 3,
          paddingTop: 16,
          textTransform: 'uppercase',
        }}
      >
        Eterno Diciembre
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}

export async function GET(request: Request, { params }: RouteParams) {
  // Anti-abuso: limitamos por IP porque el endpoint es público (sin user). El
  // render con Satori es caro (Resvg + fetch de fonts), así que sin esto un
  // bucle desde cualquier máquina puede comernos los recursos del servidor.
  // Fail-open si no hay Redis (dev sin Upstash) — el limiter retorna success.
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await getRateLimiter('ogCard').limit(`og:${ip}`)
  if (!success) {
    return new Response('Rate limited', { status: 429 })
  }

  try {
    return await buildCardImage(request, params)
  } catch (err) {
    // Si Satori falla (CSS inválido, font 404, gradient mal armado), devolvemos
    // la imagen estática en vez de 500. Los crawlers reciben algo mostrable.
    // Reportamos a Sentry para ver el error real — no es un caso esperado.
    const { cardId } = await params
    Sentry.captureException(err, { tags: { route: 'og-card', cardId } })
    return fallbackImage()
  }
}

async function buildCardImage(request: Request, params: RouteParams['params']) {
  const { cardId } = await params
  const url = new URL(request.url)
  const username = url.searchParams.get('u') ?? null

  // Fetch card data desde Supabase
  const supabase = await createClient()
  const { data: card } = await supabase
    .from('cards')
    .select('id, card_number, name, rarity, metadata, content')
    .eq('id', cardId)
    .single()

  if (!card) {
    return fallbackImage()
  }

  const metadata = (card.metadata ?? {}) as {
    position?: string
    club?: string
    number?: string | number
  }
  const content = (card.content ?? {}) as { photo?: { source?: string } }
  const photoSource = content?.photo?.source
  const hasRealPhoto =
    !!photoSource && photoSource !== '' && photoSource !== 'TODO' && photoSource.startsWith('http')

  const playerRole = [metadata.position, metadata.club].filter(Boolean).join(' · ')
  const isLegendary = card.rarity === 'legendary'

  // Paletas tier-coded (Satori-friendly: hex literales, sin CSS vars)
  const palette = getPalette(card.rarity)

  // Pre-construimos strings interpolados como variables para evitar que JSX
  // los splitee en múltiples children (causa #1 de errores en Satori).
  const cardNumberLabel = `· cromo #${card.card_number}`
  const cardCountLabel = `${card.card_number} / 205`
  const attribution = username
    ? `Compartido por @${username}`
    : 'Coleccioná el álbum eterno · cromiks.app'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: palette.bgGradient,
        color: '#E6ECF2',
        fontFamily: 'sans-serif',
        padding: 60,
      }}
    >
      {/* Top: brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            letterSpacing: 6,
            color: '#D4A93C',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Cromiks
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 16,
            letterSpacing: 3,
            color: '#A6B0BD',
            textTransform: 'uppercase',
          }}
        >
          Eterno Diciembre
        </div>
      </div>

      {/* Middle: cromo + info */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 60,
          paddingTop: 30,
          paddingBottom: 30,
        }}
      >
        <CromoBlock
          name={card.name}
          number={metadata.number != null ? String(metadata.number) : ''}
          cardNumber={card.card_number}
          imageUrl={hasRealPhoto ? photoSource : undefined}
          palette={palette}
        />

        {/* Info */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {isLegendary && (
            <div
              style={{
                display: 'flex',
                fontSize: 14,
                letterSpacing: 4,
                color: '#D4A93C',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              ★ Momento eterno
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.05,
              color: '#E6ECF2',
              flexWrap: 'wrap',
            }}
          >
            {card.name}
          </div>
          {playerRole && (
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                color: palette.accent,
                letterSpacing: 1,
              }}
            >
              {playerRole}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              paddingTop: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${palette.accent}33`,
                color: palette.accent,
                fontSize: 16,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {tierLabel(card.rarity)}
            </div>
            <div
              style={{
                display: 'flex',
                color: '#A6B0BD',
                fontSize: 18,
              }}
            >
              {cardNumberLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: attribution */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 16,
            color: '#A6B0BD',
          }}
        >
          {attribution}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 14,
            color: '#A6B0BD',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {cardCountLabel}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  )
}

/**
 * Renderiza una representación visual del cromo dentro de la OG image.
 * Si tiene foto real la mostramos como background. Si no, gradient + número grande.
 */
function CromoBlock({
  name,
  number,
  cardNumber,
  imageUrl,
  palette,
}: {
  name: string
  number: string
  cardNumber: number
  imageUrl: string | undefined
  palette: ReturnType<typeof getPalette>
}) {
  // Cromo dimensions dentro de la OG (1200×630)
  const width = 320
  const height = 440
  const truncatedName = name.length > 22 ? `${name.slice(0, 22)}…` : name
  const numberFooter = `#${cardNumber}`

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 16,
        border: `2px solid ${palette.accent}`,
        background: palette.cromoBg,
        overflow: 'hidden',
      }}
    >
      {/* Foto o gradient */}
      {imageUrl ? (
        // biome-ignore lint/performance/noImgElement: Satori usa img standard
        <img
          src={imageUrl}
          alt=""
          width={width}
          height={Math.round(height * 0.78)}
          style={{
            objectFit: 'cover',
            width: '100%',
            height: '78%',
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '78%',
            background: palette.placeholderBg,
            fontSize: 140,
            fontWeight: 800,
            color: palette.accent,
          }}
        >
          {number || '?'}
        </div>
      )}

      {/* Footer del cromo: nombre + número */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '22%',
          padding: '0 12px',
          background: 'rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            fontWeight: 700,
            color: '#E6ECF2',
            textAlign: 'center',
          }}
        >
          {truncatedName}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 12,
            color: palette.accent,
            letterSpacing: 2,
            textTransform: 'uppercase',
            paddingTop: 4,
          }}
        >
          {numberFooter}
        </div>
      </div>
    </div>
  )
}

/**
 * Mapping de tier → paleta de colores literales (no usamos CSS vars porque
 * Satori no las soporta).
 */
function getPalette(tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') {
  switch (tier) {
    case 'legendary':
      return {
        accent: '#D4A93C',
        bgGradient: 'linear-gradient(135deg, #0A0E14 0%, #1F1810 50%, #0A0E14 100%)',
        cromoBg: '#0A0E14',
        placeholderBg: 'linear-gradient(135deg, #1F1810 0%, #0A0E14 100%)',
      }
    case 'epic':
      return {
        accent: '#B97FE3',
        bgGradient: 'linear-gradient(135deg, #0A0E14 0%, #1A1428 50%, #0A0E14 100%)',
        cromoBg: '#0A0E14',
        placeholderBg: 'linear-gradient(135deg, #1A1428 0%, #0A0E14 100%)',
      }
    case 'rare':
      return {
        accent: '#6BB9FF',
        bgGradient: 'linear-gradient(135deg, #0A0E14 0%, #0F2540 50%, #0A0E14 100%)',
        cromoBg: '#0A0E14',
        placeholderBg: 'linear-gradient(135deg, #0F2540 0%, #0A0E14 100%)',
      }
    case 'uncommon':
      return {
        accent: '#D4A93C',
        bgGradient: 'linear-gradient(135deg, #0A0E14 0%, #1F1A12 50%, #0A0E14 100%)',
        cromoBg: '#0A0E14',
        placeholderBg: 'linear-gradient(135deg, #1F1A12 0%, #0A0E14 100%)',
      }
    default:
      return {
        accent: '#7E8896',
        bgGradient: 'linear-gradient(135deg, #0A0E14 0%, #161B22 50%, #0A0E14 100%)',
        cromoBg: '#0A0E14',
        placeholderBg: 'linear-gradient(135deg, #161B22 0%, #0A0E14 100%)',
      }
  }
}

function tierLabel(tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') {
  const labels: Record<string, string> = {
    common: 'Común',
    uncommon: 'Inusual',
    rare: 'Rara',
    epic: 'Épica',
    legendary: 'Legendaria',
  }
  return labels[tier] ?? 'Común'
}
