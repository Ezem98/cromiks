'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * LegendaryMoment — "Volvé a verlo".
 *
 * El momento original de una legendaria: facade click-gated sobre un embed de
 * youtube-nocookie. NO carga el iframe (~1MB de JS + cookies) hasta que el user
 * toca play, así respeta el budget de mobile de gama baja (DESIGN.md 13.4:
 * LCP < 1.8s, JS inicial < 150KB). Es el subset "reverent-minimal" de DESIGN.md
 * 12.5 — sin holográfico / partículas / tilt (diferidos a post-beta, TODO T-03).
 *
 * Estados (los 6 del design review):
 *  - default      → still + botón "Volvé a verlo"
 *  - loading      → poster sostenido con pulse hasta que el iframe cargó
 *  - playing      → iframe youtube-nocookie (autoplay + captions)
 *  - error/id malo → mensaje reverente + link-out a YouTube (nunca frame roto)
 *  - no-video     → el caller no monta este componente (videoUrl null)
 *  - reduced-motion → lo maneja el bloque global de globals.css (anim 0.01ms);
 *                     el play es user-initiated, así que reproducir está OK.
 *
 * Accesibilidad: el `LegendaryBrief` (texto del momento, en el dialog) es el
 * alternativo accesible al audio narrado del clip (DESIGN.md 13.3). Pedimos
 * captions con cc_load_policy=1.
 */

const YT_ID = /(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/

function parseYouTubeId(src: string): string | null {
  const m = src.match(YT_ID)
  if (m) return m[1]
  if (/^[A-Za-z0-9_-]{11}$/.test(src.trim())) return src.trim()
  return null
}

type LegendaryMomentProps = {
  /** content.video.source — URL o id de YouTube del momento oficial */
  videoUrl: string
  /** content.video.start — segundo de inicio del clip (opcional) */
  start?: number | null
  cardName: string
}

export function LegendaryMoment({ videoUrl, start, cardName }: LegendaryMomentProps) {
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const videoId = parseYouTubeId(videoUrl)
  const watchUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}${start ? `&t=${start}` : ''}`
    : videoUrl

  // Error / id no parseable: link-out reverente en vez de un player roto.
  if (!videoId) {
    return (
      <MomentShell>
        <p className="text-(--color-text-secondary) text-sm">No pudimos traer el momento acá.</p>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--color-gold) text-sm underline underline-offset-4"
        >
          Verlo en YouTube
        </a>
      </MomentShell>
    )
  }

  if (!playing) {
    return (
      <MomentShell>
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Volvé a ver el momento: ${cardName}`}
          className={cn(
            'group flex w-full min-h-11 items-center justify-center gap-2',
            'rounded-md px-4 py-3 font-semibold',
            'bg-(--color-gold) text-(--color-surface-deep)',
            'transition-transform hover:-translate-y-px',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-argentina-glow)',
          )}
        >
          <PlayIcon className="size-4" />
          Volvé a verlo
        </button>
      </MomentShell>
    )
  }

  return (
    <MomentShell>
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
        {!loaded && (
          <div className="absolute inset-0 grid animate-pulse place-items-center bg-(--color-surface-raised)">
            <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-text-muted)">
              Trayendo el momento…
            </span>
          </div>
        )}
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&cc_load_policy=1&rel=0&modestbranding=1${
            start ? `&start=${start}` : ''
          }`}
          title={`El momento: ${cardName}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 size-full"
        />
      </div>
    </MomentShell>
  )
}

/** Marco gold sutil + entrance fade (reduced-motion lo neutraliza globalmente). */
function MomentShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'space-y-2 rounded-md p-3',
        'border border-(--color-gold)/20',
        'bg-[linear-gradient(135deg,rgba(212,169,60,0.06)_0%,transparent_100%)]',
        'animate-in fade-in slide-in-from-bottom-1 duration-500',
      )}
    >
      {children}
    </div>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
