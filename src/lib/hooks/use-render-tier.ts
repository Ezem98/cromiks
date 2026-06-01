'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Render tier — decide si renderizamos la experiencia 3D completa ('full') o
 * el fallback 2D liviano ('lite').
 *
 * Unifica TODAS las señales de "¿qué tan pesado puedo renderizar?" en un solo
 * lugar, en vez de mirar solo `prefers-reduced-motion` sueltas por componente:
 *  - Accesibilidad: prefers-reduced-motion
 *  - Ahorro de datos: prefers-reduced-data, connection.saveData, effectiveType
 *  - Capacidad del device: deviceMemory, soporte de WebGL
 *  - Preferencia explícita del user (override persistido) — gana sobre la auto
 *  - Degradación transitoria de sesión (context-loss de WebGL) — NO persiste
 *
 * Los componentes 3D (anticipation/tear/stack) consumen `tier` y caen al path
 * 2D que YA existe cuando es 'lite'.
 */

export type RenderTier = 'full' | 'lite'

/** `null` = auto (sin preferencia explícita del user). */
export type TierOverride = RenderTier | null

export type TierReason =
  | 'override'
  | 'no-webgl'
  | 'session-degraded'
  | 'reduced-motion'
  | 'reduced-data'
  | 'save-data'
  | 'slow-network'
  | 'low-memory'
  | 'auto-full'

const STORAGE_KEY = 'cromiks:render-tier'
const TIER_EVENT = 'cromiks:render-tier-change'

/** deviceMemory (en GB) <= esto fuerza lite. Conservador para no nukear el core. */
const LOW_MEMORY_GB = 2

const SLOW_NETWORK_TYPES = new Set(['slow-2g', '2g', '3g'])

/**
 * Degradación de sesión (módulo-level, en memoria). La setea el context-loss de
 * WebGL. NO persiste: una hiccup de GPU no debe atrapar al user en lite para
 * siempre, solo durante esta navegación.
 */
let sessionDegraded = false

/**
 * Probe de WebGL — cacheado a nivel módulo. Crear un context es caro y el
 * soporte no cambia durante la sesión, así que lo hacemos una sola vez.
 */
let webglSupported: boolean | null = null

function detectWebgl(): boolean {
  if (webglSupported !== null) return webglSupported
  if (typeof document === 'undefined') return true // SSR: asumimos sí; se recomputa en cliente
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    webglSupported = gl != null
  } catch {
    webglSupported = false
  }
  return webglSupported
}

type NetworkInfo = {
  saveData?: boolean
  effectiveType?: string
  addEventListener?: (type: string, cb: () => void) => void
  removeEventListener?: (type: string, cb: () => void) => void
}

function getConnection(): NetworkInfo | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { connection?: NetworkInfo }).connection
}

function readOverride(): TierOverride {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'full' || v === 'lite' ? v : null
  } catch {
    return null
  }
}

function writeOverride(value: TierOverride) {
  if (typeof window === 'undefined') return
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // localStorage bloqueado (incógnito estricto, etc.) — lo ignoramos
  }
}

/**
 * Computa el tier automático (sin contar override ni degradación de sesión).
 * Devuelve también el motivo, útil para debug/telemetría.
 * Solo se llama en cliente (dentro de un effect), nunca durante el render.
 */
function detectAutoTier(): { tier: RenderTier; reason: TierReason } {
  if (typeof window === 'undefined') return { tier: 'full', reason: 'auto-full' }

  if (!detectWebgl()) return { tier: 'lite', reason: 'no-webgl' }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return { tier: 'lite', reason: 'reduced-motion' }

  if (window.matchMedia('(prefers-reduced-data: reduce)').matches)
    return { tier: 'lite', reason: 'reduced-data' }

  const conn = getConnection()
  if (conn?.saveData === true) return { tier: 'lite', reason: 'save-data' }
  if (conn?.effectiveType && SLOW_NETWORK_TYPES.has(conn.effectiveType))
    return { tier: 'lite', reason: 'slow-network' }

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (typeof memory === 'number' && memory <= LOW_MEMORY_GB)
    return { tier: 'lite', reason: 'low-memory' }

  return { tier: 'full', reason: 'auto-full' }
}

type UseRenderTier = {
  tier: RenderTier
  reason: TierReason
  /** Preferencia explícita del user (persistida). `null` = auto. */
  override: TierOverride
  /** Setea/limpia la preferencia persistente. Sincroniza todas las instancias. */
  setOverride: (value: TierOverride) => void
  /** Degrada a lite por esta sesión (context-loss). No persiste. */
  degradeToLite: () => void
}

export function useRenderTier(): UseRenderTier {
  const [override, setOverrideState] = useState<TierOverride>(null)
  const [auto, setAuto] = useState<{ tier: RenderTier; reason: TierReason }>({
    tier: 'full',
    reason: 'auto-full',
  })
  const [degraded, setDegraded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const sync = () => {
      setOverrideState(readOverride())
      setAuto(detectAutoTier())
      setDegraded(sessionDegraded)
    }
    sync()

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqData = window.matchMedia('(prefers-reduced-data: reduce)')
    mqMotion.addEventListener('change', sync)
    mqData.addEventListener('change', sync)
    window.addEventListener(TIER_EVENT, sync)
    window.addEventListener('storage', sync)
    const conn = getConnection()
    conn?.addEventListener?.('change', sync)

    return () => {
      mqMotion.removeEventListener('change', sync)
      mqData.removeEventListener('change', sync)
      window.removeEventListener(TIER_EVENT, sync)
      window.removeEventListener('storage', sync)
      conn?.removeEventListener?.('change', sync)
    }
  }, [])

  const setOverride = useCallback((value: TierOverride) => {
    writeOverride(value)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(TIER_EVENT))
  }, [])

  const degradeToLite = useCallback(() => {
    sessionDegraded = true
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(TIER_EVENT))
  }, [])

  // Resolución final del tier, por prioridad:
  //  1. no-WebGL → floor duro (ni el override lo pisa: no hay con qué renderizar)
  //  2. degradación de sesión (context-loss) → lite
  //  3. override explícito del user
  //  4. detección automática
  let tier: RenderTier
  let reason: TierReason
  if (auto.reason === 'no-webgl') {
    tier = 'lite'
    reason = 'no-webgl'
  } else if (degraded) {
    tier = 'lite'
    reason = 'session-degraded'
  } else if (override) {
    tier = override
    reason = 'override'
  } else {
    tier = auto.tier
    reason = auto.reason
  }

  return { tier, reason, override, setOverride, degradeToLite }
}
