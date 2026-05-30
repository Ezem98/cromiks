'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { joinWaitlist } from '@/features/landing/actions'
import { errorCopy } from '@/lib/errors'

/**
 * Captura de email para la beta (PR7 marketing, 11.4b).
 *
 * Convive con /signup: el form deja el mail, el link de abajo manda a entrar ya.
 * Reutilizable en el hero y en el CTA final de la landing.
 *
 * Al éxito muestra un estado de confirmación (no resetea el form) para que el
 * usuario vea que quedó adentro.
 */

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      // Locale del navegador (es/en/pt/it…) para segmentar el broadcast después.
      const locale = navigator.language?.slice(0, 2)
      const result = await joinWaitlist({ email, locale })

      if (!result.ok) {
        // 'already_subscribed' no es un error feo: lo mostramos como info amable.
        if (result.code === 'already_subscribed') {
          setDone(true)
          toast.success(errorCopy('already_subscribed'))
          return
        }
        setError(result.code)
        return
      }

      setDone(true)
      toast.success('Listo. Cuando abramos, sos de los primeros.')
    })
  }

  if (done) {
    return (
      <div className="w-full max-w-sm mx-auto text-center space-y-2">
        <p className="text-(--color-success) text-[15px] font-medium">
          Listo. Cuando abramos, sos de los primeros.
        </p>
        <p className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)">
          Te avisamos por mail.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="tu@email.com"
          aria-label="Tu email para la beta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          hasError={!!error}
          inputSize="lg"
          required
        />
        <Button type="submit" variant="primary" size="lg" disabled={isPending || !email}>
          {isPending ? 'Anotándote…' : 'Avisame'}
        </Button>
      </div>

      {error ? (
        <p className="text-[13px] text-(--color-danger) text-center">{errorCopy(error)}</p>
      ) : (
        <p className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted) text-center">
          Dejá tu mail y entrás a la beta ·{' '}
          <Link href="/signup" className="text-(--color-argentina-glow) hover:underline">
            o sumate ya →
          </Link>
        </p>
      )}
    </form>
  )
}
