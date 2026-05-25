'use client'

import { useState } from 'react'
import { MagicLinkForm } from './magic-link-form'
import { OAuthButtons } from './oauth-buttons'
import { OtpVerifyForm } from './otp-verify-form'

/**
 * Orquesta el flow completo de auth:
 *  Fase 1: pedir email O loguearse con Google
 *  Fase 2: validar OTP (solo si eligió email)
 *
 * Si elige Google, el redirect pasa a /auth/callback y nunca llega
 * a la fase 2.
 */

type AuthFlowProps = {
  /** Texto del CTA principal del email. Diferencia signin vs signup. */
  ctaText?: string
}

export function AuthFlow({ ctaText = 'Continuar con email' }: AuthFlowProps) {
  const [phase, setPhase] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')

  if (phase === 'email') {
    return (
      <div className="space-y-5">
        <OAuthButtons />

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-mono text-[10px] uppercase tracking-[0.15em] text-(--color-text-muted)">
            o
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <MagicLinkForm
          ctaText={ctaText}
          onEmailSent={(submittedEmail) => {
            setEmail(submittedEmail)
            setPhase('otp')
          }}
        />
      </div>
    )
  }

  return <OtpVerifyForm email={email} onChangeEmail={() => setPhase('email')} />
}
