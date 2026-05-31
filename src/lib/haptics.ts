/**
 * Haptic feedback vía `navigator.vibrate`. No-op seguro donde no hay soporte
 * (desktop, iOS Safari) o si el user pidió `prefers-reduced-motion`.
 *
 * Solo se llama desde gestos del usuario (tear-complete, reveal), que es cuando
 * los navegadores permiten vibrar.
 */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return

  // Respetamos reduced-motion: si el user pidió menos estímulo, no zumbamos.
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  try {
    navigator.vibrate(pattern)
  } catch {
    // Algunos navegadores tiran si no hubo gesto previo del user — lo ignoramos.
  }
}
