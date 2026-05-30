import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingShell } from '@/components/layout/marketing-shell'

export const metadata: Metadata = {
  title: 'Términos y privacidad',
  description: 'Términos de uso y política de privacidad de Cromiks.',
}

/**
 * /legal — términos de uso + política de privacidad (PR7 marketing, 11.6).
 *
 * Ruta top-level (igual que /about) para ser visible logueado o no.
 *
 * Tono: formal, sobrio, tercera persona — la ÚNICA excepción a la voz de marca
 * (DESIGN.md §3.2, fila "Comunicación legal"). Una sola página con dos secciones
 * ancladas en #terminos y #privacidad (el footer linkea a cada una).
 *
 * Alcance: homenaje no comercial, bajo riesgo. No pretende ser un dictamen legal
 * (ver disclaimer al final). Contenido basado en la infra real del proyecto.
 */

const LAST_UPDATED = '29 de mayo de 2026'

export default function LegalPage() {
  return (
    <MarketingShell>
      <article className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <header className="space-y-3 mb-12">
          <h1 className="text-display text-[clamp(36px,6vw,56px)] leading-[0.95]">
            Términos y privacidad
          </h1>
          <p className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)">
            Última actualización: {LAST_UPDATED}
          </p>
          <nav className="flex gap-4 text-[14px] pt-2">
            <Link href="#terminos" className="text-(--color-argentina-glow) hover:underline">
              Términos de uso
            </Link>
            <Link href="#privacidad" className="text-(--color-argentina-glow) hover:underline">
              Privacidad
            </Link>
          </nav>
        </header>

        {/* ============================ TÉRMINOS ============================ */}
        <section id="terminos" className="scroll-mt-24 space-y-6">
          <h2 className="text-display text-3xl">Términos de uso</h2>

          <LegalBlock title="1. Naturaleza del servicio">
            Cromiks es un homenaje no comercial al fútbol argentino. Es un servicio gratuito, en
            etapa de prueba (beta), que se ofrece «tal cual está», sin garantías de disponibilidad
            ni de funcionamiento ininterrumpido.
          </LegalBlock>

          <LegalBlock title="2. Ausencia de afiliación">
            Cromiks no tiene relación oficial con la AFA, la FIFA, Adidas, clubes ni jugadores. Las
            marcas, nombres y demás signos distintivos pertenecen a sus respectivos titulares y se
            mencionan, cuando corresponde, con fines descriptivos.
          </LegalBlock>

          <LegalBlock title="3. Cuenta del usuario">
            El usuario es responsable del acceso a su cuenta y de la actividad que se realice a
            través de ella. El servicio está pensado para personas con una edad mínima razonable
            para usar servicios en línea.
          </LegalBlock>

          <LegalBlock title="4. Economía del juego">
            Las monedas, sobres y cromos dentro de Cromiks no tienen valor monetario, no se compran
            ni se canjean por dinero y no son transferibles fuera del producto. Cromiks no utiliza
            criptomonedas, NFT ni activos similares.
          </LegalBlock>

          <LegalBlock title="5. Donaciones">
            Cromiks puede ofrecer un mecanismo de donación voluntaria. Las donaciones son
            voluntarias, no reembolsables y se destinan a una fundación. Esta cláusula se aplica
            únicamente cuando dicho mecanismo se encuentre habilitado.
          </LegalBlock>

          <LegalBlock title="6. Propiedad intelectual">
            El código, la identidad visual y los contenidos originales de Cromiks pertenecen al
            proyecto. Los recursos de terceros se utilizan bajo sus respectivas licencias,
            detalladas en la{' '}
            <Link href="/about" className="text-(--color-argentina-glow) hover:underline">
              página Sobre Cromiks
            </Link>
            .
          </LegalBlock>

          <LegalBlock title="7. Cambios y baja del servicio">
            Al tratarse de un proyecto personal en beta, el servicio puede modificarse, suspenderse
            o discontinuarse en cualquier momento y sin previo aviso.
          </LegalBlock>
        </section>

        {/* ============================ PRIVACIDAD ============================ */}
        <section
          id="privacidad"
          className="scroll-mt-24 space-y-6 border-t border-white/[0.06] mt-16 pt-16"
        >
          <h2 className="text-display text-3xl">Política de privacidad</h2>

          <LegalBlock title="1. Datos de la cuenta">
            Para crear una cuenta se utiliza el correo electrónico mediante Supabase Auth (código
            por email u OAuth). Cromiks no almacena contraseñas propias.
          </LegalBlock>

          <LegalBlock title="2. Analítica de producto">
            Se utiliza PostHog para entender cómo se usa el producto (eventos de uso y feature
            flags), con el fin de mejorarlo. No se venden datos a terceros.
          </LegalBlock>

          <LegalBlock title="3. Monitoreo de errores">
            Se utiliza Sentry para registrar errores técnicos y poder corregirlos. La grabación de
            sesiones (session replay) se encuentra desactivada.
          </LegalBlock>

          <LegalBlock title="4. Prevención de abuso">
            Se utiliza Upstash para limitar la cantidad de solicitudes por dirección IP y proteger
            el servicio frente a usos abusivos.
          </LegalBlock>

          <LegalBlock title="5. Correo electrónico">
            Se utiliza Resend para el envío de correos (por ejemplo, el código de acceso y, si el
            usuario lo dejó, el aviso de lanzamiento de la lista de espera).
          </LegalBlock>

          <LegalBlock title="6. Pagos">
            Cromiks no guarda medios de pago. En caso de habilitarse donaciones, el procesamiento lo
            realiza Mercado Pago; los datos de pago son administrados por dicho proveedor y no por
            Cromiks.
          </LegalBlock>

          <LegalBlock title="7. Perfiles públicos">
            El nombre de usuario, el nombre para mostrar y el avatar pueden ser visibles
            públicamente. Las funciones sociales son opcionales (opt-in).
          </LegalBlock>

          <LegalBlock title="8. Cookies">
            Se utilizan únicamente cookies de sesión (para mantener el inicio de sesión) y de
            analítica. No se utilizan cookies de publicidad de terceros.
          </LegalBlock>

          <LegalBlock title="9. Derechos del usuario">
            El usuario puede solicitar la baja o el borrado de su cuenta y de sus datos escribiendo
            a{' '}
            <a
              href="mailto:hola@cromiks.com"
              className="text-(--color-argentina-glow) hover:underline"
            >
              hola@cromiks.com
            </a>
            .
          </LegalBlock>
        </section>

        {/* Disclaimer */}
        <p className="text-mono text-[11px] leading-relaxed text-(--color-text-ghost) border-t border-white/[0.06] mt-16 pt-8">
          Este texto no constituye asesoramiento legal. Debe revisarse con un profesional antes de
          un lanzamiento comercial.
        </p>
      </article>
    </MarketingShell>
  )
}

function LegalBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-(--color-text-primary) text-[16px] font-medium">{title}</h3>
      <p className="text-(--color-text-secondary) text-[15px] leading-relaxed">{children}</p>
    </div>
  )
}
