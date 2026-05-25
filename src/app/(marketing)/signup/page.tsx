import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthFlow } from '@/features/auth/components/auth-flow'

export const metadata: Metadata = {
  title: 'Sumarme',
  description: 'Empezá tu álbum eterno de Argentina Mundial 2022.',
}

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
            Empezá tu álbum
          </p>
          <h1 className="text-display text-5xl leading-[0.9]">
            Sumate a<br />
            <span className="prism-text">Cromiks</span>
          </h1>
          <p className="text-(--color-text-secondary) text-[15px] leading-relaxed pt-2">
            El primer álbum digital donde los cromos épicos se mueven, suenan y te devuelven el
            momento original.
          </p>
        </div>

        <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-6">
          <AuthFlow ctaText="Crear mi álbum" />
        </div>

        <p className="text-center text-[13px] text-(--color-text-muted)">
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/signin"
            className="text-(--color-argentina-glow) hover:underline underline-offset-2"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
