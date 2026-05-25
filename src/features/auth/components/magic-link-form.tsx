'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInWithOtp } from '@/features/auth/actions'

/**
 * Form para iniciar el flow de magic link.
 *
 * 1. User ingresa email
 * 2. Se llama a signInWithOtp(email)
 * 3. Si OK, llama onEmailSent(email) para que el padre cambie a la fase de OTP
 */

type MagicLinkFormProps = {
  onEmailSent: (email: string) => void
  /** Texto del CTA. Default: "Continuar con email". */
  ctaText?: string
}

const errorMessages: Record<string, string> = {
  email_invalid: 'Ese email no se ve válido. Revisá la dirección.',
  rate_limited: 'Estás yendo muy rápido. Esperá unos minutos y probá de nuevo.',
  unknown: 'Algo salió mal. Probá de nuevo en un rato.',
}

export function MagicLinkForm({
  onEmailSent,
  ctaText = 'Continuar con email',
}: MagicLinkFormProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await signInWithOtp(email)
      if (!result.ok) {
        setError(result.error ?? 'unknown')
        return
      }
      toast.success('Te mandamos un código', {
        description: 'Revisá tu email — llegó un código de 6 dígitos.',
      })
      onEmailSent(email.trim().toLowerCase())
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="auth-email"
          className="block text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)"
        >
          Email
        </label>
        <Input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          hasError={!!error}
          inputSize="lg"
          required
        />
        {error && (
          <p className="text-[13px] text-(--color-danger)">
            {errorMessages[error] ?? errorMessages.unknown}
          </p>
        )}
      </div>

      <Button type="submit" variant="primary" size="full" disabled={isPending || !email}>
        {isPending ? 'Mandando código...' : ctaText}
      </Button>

      <p className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted) text-center">
        Sin contraseñas. Te mandamos un código por email.
      </p>
    </form>
  )
}
