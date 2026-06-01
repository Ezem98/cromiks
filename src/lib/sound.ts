/**
 * SFX del pack-opening, sintetizados con Web Audio API.
 *
 * Por qué síntesis y no samples: funciona sin assets ni licencias, y es un
 * arpegio corto que escala con la rareza. Si más adelante querés samples reales
 * (Kenney / Pixabay / Mixkit, CC0), el punto de swap es `playArpeggio` →
 * reemplazarlo por un loader de AudioBuffer desde `public/sounds/`.
 *
 * Guards: no-op en SSR, sin Web Audio, o con mute (`localStorage['cromiks:muted']`).
 * El AudioContext se crea/resume on-demand; estos sonidos siempre se disparan
 * desde un gesto del user (tap de abrir, swipe del reveal), así que la política
 * de autoplay del browser los permite.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function isMuted(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem('cromiks:muted') === 'true'
  } catch {
    return false
  }
}

// Notas (Hz) por rank de rareza: 0 = una nota suave … 4 = arpegio ascendente.
const TIER_NOTES: readonly (readonly number[])[] = [
  [523.25], // C5
  [523.25, 659.25], // C5 E5
  [523.25, 659.25, 783.99], // C5 E5 G5
  [523.25, 659.25, 783.99, 1046.5], // + C6
  [523.25, 659.25, 783.99, 1046.5, 1318.51], // + E6
]

type ArpeggioOpts = { gap?: number; dur?: number; gain?: number; type?: OscillatorType }

function playArpeggio(notes: readonly number[], opts: ArpeggioOpts = {}): void {
  const ac = getCtx()
  if (!ac) return

  const now = ac.currentTime
  const gap = opts.gap ?? 0.06
  const dur = opts.dur ?? 0.35
  const peak = opts.gain ?? 0.18
  const type = opts.type ?? 'triangle'

  notes.forEach((freq, i) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.value = freq

    const t0 = now + i * gap
    // Envelope: ataque rápido + decay exponencial. Evita el "click" del corte seco.
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  })
}

function clampRank(rank: number): number {
  if (rank < 0) return 0
  if (rank > 4) return 4
  return Math.floor(rank)
}

/** Tick del reveal de una card. Corto; escala con la rareza (rank 0..4). */
export function playReveal(rank = 0): void {
  if (isMuted()) return
  playArpeggio(TIER_NOTES[clampRank(rank)], { gap: 0.04, dur: 0.18, gain: 0.12 })
}

/** Estallido del "complete" del tear. Más grande y sostenido; escala con la rareza máxima. */
export function playComplete(rank = 0): void {
  if (isMuted()) return
  playArpeggio(TIER_NOTES[clampRank(rank)], { gap: 0.07, dur: 0.5, gain: 0.2 })
}
