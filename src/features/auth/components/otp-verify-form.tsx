'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { OTPInput } from '@/components/ui/otp-input'
import { signInWithOtp, verifyOtp } from '@/features/auth/actions'

/**
 * Form para verificar el OTP de 6 dígitos.
 *
 * Llega desde MagicLinkForm cuando el email fue enviado.
 * - Auto-submit cuando los 6 dígitos están completos
 * - Botón "Mandar otro código" si no llegó
 * - Botón "Cambiar email" para volver atrás
 *
 * Tras un verify exitoso, redirige a / (el server-side va a decidir si
 * mostrar onboarding o no).
 */

type OtpVerifyFormProps = {
  email: string
  onChangeEmail: () => void
}

const errorMessages: Record<string, string> = {
  invalid_token_format: 'El código son 6 dígitos.',
  invalid_token: 'Código incorrecto. Revisalo de nuevo.',
  expired: 'Este código venció. Te mandamos uno nuevo.',
  no_user: 'No se pudo crear la sesión. Probá de nuevo.',
  unknown: 'Algo salió mal. Probá de nuevo.',
}

export function OtpVerifyForm({ email, onChangeEmail }: OtpVerifyFormProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, startVerify] = useTransition()
  const [isResending, startResend] = useTransition()

  const handleComplete = (value: string) => {
    setError(null)
    setCode(value)

    startVerify(async () => {
      const result = await verifyOtp(email, value)
      if (!result.ok) {
        setError(result.error ?? 'unknown')

        // Si expiró, auto-pedir un nuevo código
        if (result.error === 'expired') {
          startResend(async () => {
            await signInWithOtp(email)
          })
        }
        return
      }

      // Éxito: redirigir a / (el server decide si manda a /onboarding)
      router.push('/')
      router.refresh()
    })
  }

  const handleResend = () => {
    startResend(async () => {
      const result = await signInWithOtp(email)
      if (result.ok) {
        toast.success('Mandamos otro código', {
          description: 'Revisá tu email.',
        })
        setError(null)
        setCode('')
      } else {
        toast.error('No pudimos mandar el código', {
          description: 'Probá de nuevo en un rato.',
        })
      }
    })
  }

  const isLoading = isVerifying || isResending

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)">
          Mandamos un código a
        </p>
        <p className="text-(--color-text-primary) font-medium break-all">{email}</p>
      </div>

      <div className="space-y-3">
        <OTPInput
          value={code}
          onChange={setCode}
          onComplete={handleComplete}
          hasError={!!error}
          disabled={isLoading}
          autoFocus
        />
        {error && (
          <p className="text-[13px] text-(--color-danger) text-center">
            {errorMessages[error] ?? errorMessages.unknown}
          </p>
        )}
        {isVerifying && (
          <p className="text-[13px] text-(--color-text-muted) text-center">Verificando…</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={handleResend}
          disabled={isLoading}
          className="w-full"
        >
          {isResending ? 'Mandando…' : 'Mandar otro código'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onChangeEmail}
          disabled={isLoading}
          className="w-full text-(--color-text-muted)"
        >
          ← Cambiar email
        </Button>
      </div>
    </div>
  )
}
