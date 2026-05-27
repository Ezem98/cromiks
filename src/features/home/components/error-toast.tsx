'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

/**
 * Cliente listener que dispara un toast cuando la home recibe un query param
 * `?error=...`. Se usa para superficiar errores de flows externos (apertura
 * de sobre fallida, etc.) que redirigen al home.
 *
 * Códigos soportados — agregar acá cuando aparezcan nuevos:
 *  - open_failed: openPack tiró error en (focus)/open/[packId]/page.tsx
 *
 * Se monta una sola vez por valor de `code` (useRef evita doble fire en
 * StrictMode dev).
 */

const errorCopy: Record<string, { title: string; description: string }> = {
  open_failed: {
    title: 'No pudimos abrir tu sobre',
    description: 'Probá de nuevo o reportá si el problema persiste.',
  },
}

export function ErrorToast({ code }: { code: string | null }) {
  const firedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!code || firedFor.current === code) return
    firedFor.current = code

    const copy = errorCopy[code] ?? {
      title: 'Algo salió mal',
      description: 'Probá de nuevo en un momento.',
    }
    toast.error(copy.title, { description: copy.description })
  }, [code])

  return null
}
