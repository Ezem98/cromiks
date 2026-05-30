'use client'

import { CopyIcon, MessageCircleIcon, SendIcon, Share2Icon } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { recordShare, type ShareChannel } from '../actions'

/**
 * Sheet con opciones de compartir un cromo.
 *
 * Targets:
 *  - WhatsApp: abre wa.me con el link
 *  - Twitter: abre el web intent con texto + link
 *  - Copy link: copia al portapapeles
 *  - Native share (mobile only): usa Web Share API si está disponible
 *
 * Cada target llama a recordShare() después de ejecutar la acción del lado del
 * user (abrir whatsapp, copiar, etc). Si recordShare falla, no rollbackeamos —
 * el sharing ya se hizo, solo perdemos el tracking. Toast de warning silencioso.
 *
 * URL que se comparte: /cromo/[cardId]?u=username
 * - cardId: el cromo
 * - u (opcional): el username del que comparte, para attribution en OG image
 *
 * Si el user todavía no tiene username (campo pendiente), compartimos sin ?u=.
 */

type ShareSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** ID del cromo a compartir */
  cardId: string
  /** Nombre del cromo (para usar en el texto) */
  cardName: string
  /** Username del que comparte (opcional). Si está, se agrega ?u= a la URL */
  username?: string | null
}

export function ShareSheet({ open, onOpenChange, cardId, cardName, username }: ShareSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [hasNativeShare, setHasNativeShare] = useState(false)

  // Detectar si el navegador soporta navigator.share (mayormente mobile).
  // useEffect porque navigator solo existe en client.
  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  // Construir URL absoluta del cromo. Usamos window.location.origin para que
  // funcione tanto en localhost como en producción sin hardcodear el dominio.
  const buildShareUrl = (): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const path = `/cromo/${cardId}`
    const query = username ? `?u=${encodeURIComponent(username)}` : ''
    return `${origin}${path}${query}`
  }

  const shareText = `Mirá este cromo de mi álbum eterno: "${cardName}"`

  /**
   * Llama a recordShare server-side. AWAIT obligatorio antes de cerrar el sheet
   * (onOpenChange(false)) — si no, el componente unmountea antes de que el server
   * action ejecute y el insert se cancela. Fail silencioso si recordShare devuelve
   * !ok porque el share del lado del user ya pasó.
   */
  const track = async (channel: ShareChannel) => {
    const result = await recordShare({ cardId, channel })
    if (!result.ok) {
      console.warn('[share] recordShare failed:', result.code)
    }
  }

  const handleWhatsApp = () => {
    // window.open debe ejecutarse sincrónicamente para no caer en popup blockers.
    const url = buildShareUrl()
    const text = `${shareText}\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    startTransition(async () => {
      await track('whatsapp')
      toast.success('Compartido en WhatsApp')
      onOpenChange(false)
    })
  }

  const handleTwitter = () => {
    const url = buildShareUrl()
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    )
    startTransition(async () => {
      await track('twitter')
      toast.success('Compartido en X')
      onOpenChange(false)
    })
  }

  const handleCopy = () => {
    startTransition(async () => {
      const url = buildShareUrl()
      try {
        await navigator.clipboard.writeText(url)
        await track('copy')
        toast.success('Link copiado al portapapeles')
        onOpenChange(false)
      } catch {
        toast.error('No pude copiar. Probá manualmente.')
      }
    })
  }

  const handleNativeShare = async () => {
    // navigator.share también requiere user gesture sync — antes de cualquier await.
    const url = buildShareUrl()
    try {
      await navigator.share({
        title: cardName,
        text: shareText,
        url,
      })
    } catch (err) {
      const isAbortError = err instanceof Error && err.name === 'AbortError'
      if (!isAbortError) {
        toast.error('No pude compartir')
      }
      return
    }
    startTransition(async () => {
      await track('native')
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-(--color-surface-deep) border-white/[0.08] rounded-t-2xl"
      >
        <SheetHeader>
          <SheetTitle className="text-(--color-text-primary)">Compartir cromo</SheetTitle>
          <SheetDescription className="text-(--color-text-secondary)">{cardName}</SheetDescription>
        </SheetHeader>

        <div className="grid gap-2 px-4 pb-8 pt-2">
          {hasNativeShare && (
            <Button
              variant="primary"
              onClick={handleNativeShare}
              disabled={isPending}
              className="w-full justify-start"
            >
              <Share2Icon className="size-4 mr-2" />
              Compartir…
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleWhatsApp}
            disabled={isPending}
            className="w-full justify-start"
          >
            <MessageCircleIcon className="size-4 mr-2 text-(--color-text-secondary)" />
            WhatsApp
          </Button>

          <Button
            variant="ghost"
            onClick={handleTwitter}
            disabled={isPending}
            className="w-full justify-start"
          >
            <SendIcon className="size-4 mr-2 text-(--color-text-secondary)" />X
          </Button>

          <Button
            variant="ghost"
            onClick={handleCopy}
            disabled={isPending}
            className="w-full justify-start"
          >
            <CopyIcon className="size-4 mr-2" />
            Copiar link
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
