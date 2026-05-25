import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthFlow } from '@/features/auth/components/auth-flow'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Volvé a tu álbum.',
}

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>
}

const errorMessages: Record<string, string> = {
  missing_code: 'El link no era válido. Probá pedir un código nuevo.',
  invalid_code: 'El link venció o ya fue usado. Probá pedir un código nuevo.',
  oauth_failed: 'No pudimos conectar con Google. Probá con email.',
  oauth_no_url: 'Algo salió mal con el login. Probá con email.',
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const errorMsg = params.error ? errorMessages[params.error] : null

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
            Bienvenido de vuelta
          </p>
          <h1 className="text-display text-5xl leading-[0.9]">Entrar a Cromiks</h1>
          <p className="text-(--color-text-secondary) text-[15px] leading-relaxed pt-2">
            Te mandamos un código por email. Sin contraseñas.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-[10px] border border-(--color-danger)/30 bg-(--color-danger)/10 p-3 text-[13px] text-(--color-danger)">
            {errorMsg}
          </div>
        )}

        <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
          <AuthFlow ctaText="Entrar" />
        </div>

        <p className="text-center text-[13px] text-(--color-text-muted)">
          ¿Todavía no tenés cuenta?{' '}
          <Link
            href="/signup"
            className="text-(--color-argentina-glow) hover:underline underline-offset-2"
          >
            Sumate
          </Link>
        </p>
      </div>
    </div>
  )
}
