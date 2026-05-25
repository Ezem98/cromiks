import { notFound } from 'next/navigation'
import { Playground } from '@/components/playground'

/**
 * Página de styleguide interna.
 *
 * Solo accesible en development. En production devuelve 404.
 *
 * Útil para:
 * - Ver todos los componentes del design system en un lugar
 * - Validar visualmente cuando agregamos componentes nuevos
 * - Onboarding rápido para colaboradores nuevos
 */
export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <main className="min-h-screen">
      <div className="border-b border-white/[0.06] bg-(--color-surface-base) px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold) mb-2">
            Interno · solo en development
          </p>
          <h1 className="text-display text-5xl mb-2">Styleguide</h1>
          <p className="text-(--color-text-secondary)">
            El design system de Cromiks en un solo lugar. Esta página crece junto con el proyecto.
          </p>
        </div>
      </div>

      <Playground />
    </main>
  )
}
