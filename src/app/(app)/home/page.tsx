import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inicio',
}

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
          Tu álbum eterno
        </p>
        <h1 className="text-display text-5xl leading-[0.9]">Bienvenido a Cromiks</h1>
        <p className="text-(--color-text-secondary) text-[16px] leading-relaxed max-w-2xl pt-2">
          Acá vas a ver tus sobres pendientes, tus misiones del día y el progreso del álbum. Por
          ahora es un placeholder — vamos a construir el home real en la próxima sesión.
        </p>
      </div>

      <div className="rounded-[16px] bg-(--color-surface-raised) border border-white/[0.06] p-8">
        <h2 className="text-display text-2xl mb-2">Próximamente</h2>
        <ul className="space-y-2 text-(--color-text-secondary) text-sm">
          <li>· Sobre diario disponible</li>
          <li>· 3 misiones del día</li>
          <li>· Estado del álbum (progreso por página)</li>
          <li>· Streak de claims</li>
          <li>· Atajos a las Legendarias destacadas</li>
        </ul>
      </div>
    </div>
  )
}
