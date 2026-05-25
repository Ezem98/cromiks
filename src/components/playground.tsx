'use client'

import { toast } from 'sonner'
import { Cromo } from '@/components/domain/cromo'
import { RarityBadge } from '@/components/domain/rarity-badge'
import { Sobre } from '@/components/domain/sobre'
import { TierLabel } from '@/components/domain/tier-label'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { OTPInput } from '@/components/ui/otp-input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const tiers = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const

const cromoSamples = [
  {
    tier: 'common' as const,
    name: 'Lo Celso',
    playerRole: 'Mediocampista · Argentina',
    number: 20,
    seed: 'lo-celso',
  },
  {
    tier: 'uncommon' as const,
    name: 'Mac Allister',
    playerRole: 'Mediocampista · Argentina',
    number: 20,
    seed: 'mac-allister',
  },
  {
    tier: 'rare' as const,
    name: 'Dibu Martínez',
    playerRole: 'Arquero · Argentina',
    number: 23,
    seed: 'dibu',
  },
  {
    tier: 'epic' as const,
    name: 'Julián Álvarez',
    playerRole: 'Delantero · Argentina',
    number: 9,
    seed: 'julian',
  },
  {
    tier: 'legendary' as const,
    name: 'Messi',
    playerRole: 'Capitán · Argentina',
    number: 10,
    seed: 'messi-1000',
  },
]

export function Playground() {
  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl px-6 py-16 space-y-16">
        <div className="space-y-2">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-(--color-gold)">
            Design system · v0.1
          </p>
          <h2 className="text-display text-4xl">Componentes</h2>
          <p className="text-(--color-text-secondary)">
            Todo el design system de Cromiks en un lugar. Componentes shadcn re-skineados +
            componentes custom del producto.
          </p>
        </div>

        {/* ========================================================
            CROMO — el componente principal del producto
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Cromo</h3>
            <p className="text-(--color-text-secondary) text-sm">
              5 tier anatomies. El componente más importante del producto. Las animaciones (shimmer,
              prism rotate, glows) están activas — debería sentirse vivo.
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            {cromoSamples.map((c) => (
              <Cromo
                key={c.seed}
                tier={c.tier}
                name={c.name}
                playerRole={c.playerRole}
                number={c.number}
                seed={c.seed}
                size="md"
              />
            ))}
          </div>
        </section>

        {/* ========================================================
            CROMO con estados
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Cromo · estados</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Variantes new (con badge flotante) y repeated (opacity reducida).
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            <Cromo
              tier="rare"
              name="Dibu Martínez"
              playerRole="Arquero · Argentina"
              number={23}
              seed="dibu-new"
              state="new"
              size="md"
            />
            <Cromo
              tier="common"
              name="Paredes"
              playerRole="Mediocampista · Argentina"
              number={5}
              seed="paredes-rep"
              state="repeated"
              size="md"
            />
            <Cromo
              tier="legendary"
              name="Messi"
              playerRole="Capitán · Argentina"
              number={10}
              seed="messi-new"
              state="new"
              size="md"
            />
          </div>
        </section>

        {/* ========================================================
            SOBRE
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Sobre</h3>
            <p className="text-(--color-text-secondary) text-sm">
              6 tipos. El sobre flota con idle animation 4s loop. El premium tiene prism border
              rotando.
            </p>
          </div>
          <div className="flex flex-wrap gap-10">
            <Sobre type="daily" context="Día 12 de tu racha" />
            <Sobre type="mission" context="Misión: 3/3 completas" />
            <Sobre type="match" context="Argentina 4 — Países Bajos 3" />
            <Sobre type="premium" />
          </div>
        </section>

        {/* ========================================================
            TIER LABEL
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Tier label</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Label visual de rareza. Cada tier tiene su color. Legendary usa prism gradient con
              text-clip.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 items-center">
            {tiers.map((t) => (
              <TierLabel key={t} tier={t} />
            ))}
          </div>
        </section>

        {/* ========================================================
            RARITY BADGE
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Rarity badge</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Mini badges flotantes para estados puntuales de los cromos.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <RarityBadge variant="new" />
            <RarityBadge variant="repeated" />
            <RarityBadge variant="rewarded" reward={5} />
            <RarityBadge variant="pinned" />
          </div>
        </section>

        {/* ========================================================
            BUTTONS
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Buttons</h3>
            <p className="text-(--color-text-secondary) text-sm">4 variants del brand × 5 sizes.</p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Abrir sobre</Button>
              <Button variant="ghost">Cancelar</Button>
              <Button variant="gold">Reclamar Legendaria</Button>
              <Button variant="danger">Eliminar cuenta</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="md">
                Medium
              </Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
            </div>
          </div>
        </section>

        {/* ========================================================
            DIALOG
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Dialog</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Modal central. Para confirmaciones, share, info contextual.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost">Abrir dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Canjear repetidas?</DialogTitle>
                <DialogDescription>
                  Vas a canjear 3 repetidas de Messi por 6 monedas. Te queda 1 copia en el álbum.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="ghost">Cancelar</Button>
                <Button variant="primary">Canjear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        {/* ========================================================
            SHEET
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Sheet</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Drawer lateral. Para filters, settings, mobile nav.
            </p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost">Abrir sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtros del álbum</SheetTitle>
                <SheetDescription>
                  Filtrá tu colección por rareza, página o estado.
                </SheetDescription>
              </SheetHeader>
              <div className="p-6 text-(--color-text-secondary) text-sm">
                Contenido del sheet acá.
              </div>
            </SheetContent>
          </Sheet>
        </section>

        {/* ========================================================
            DROPDOWN
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Dropdown</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Menú contextual. Para opciones de un cromo, user menu, etc.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">Opciones del cromo</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Destacar en perfil</DropdownMenuItem>
              <DropdownMenuItem>Compartir</DropdownMenuItem>
              <DropdownMenuItem>Ver detalle</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-(--color-danger) focus:text-(--color-danger)">
                Canjear repetidas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        {/* ========================================================
            TOOLTIP
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Tooltip</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Hint contextual. Hover/focus muestra.
            </p>
          </div>
          <div className="flex gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  Hover en mí
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tip: las Legendarias no se canjean</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  Otro hover
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Próximo sobre en 4h 22min</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </section>

        {/* ========================================================
            TOAST
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Toast</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Feedback ephemeral con colores semánticos (richColors).
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" size="sm" onClick={() => toast('Sobre desbloqueado')}>
              Toast simple
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast.success('Misión completa', {
                  description: 'Sumaste 5 monedas a tu balance.',
                })
              }
            >
              Toast success
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast.error('Se nos rompió el caño', {
                  description: 'Volvé en un rato — no perdiste el sobre.',
                })
              }
            >
              Toast error
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast('¿Querés abrir otro?', {
                  action: {
                    label: 'Abrir',
                    onClick: () => toast.success('Sobre abierto'),
                  },
                })
              }
            >
              Toast con acción
            </Button>
          </div>
        </section>

        {/* ========================================================
            INPUT — text inputs custom
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Input</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Text input custom alineado al brand. 3 sizes × 2 variants × estados.
            </p>
          </div>
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="sg-input-default"
                className="block text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)"
              >
                Default
              </label>
              <Input id="sg-input-default" placeholder="tu@email.com" />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="sg-input-ghost"
                className="block text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)"
              >
                Ghost variant
              </label>
              <Input id="sg-input-ghost" variant="ghost" placeholder="Username" />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="sg-input-error"
                className="block text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)"
              >
                Con error
              </label>
              <Input id="sg-input-error" hasError defaultValue="invalido@" />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="sg-input-disabled"
                className="block text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)"
              >
                Disabled
              </label>
              <Input id="sg-input-disabled" disabled defaultValue="No editable" />
            </div>
            <div className="flex gap-2">
              <Input inputSize="sm" placeholder="Small" aria-label="Small input" />
              <Input inputSize="md" placeholder="Medium" aria-label="Medium input" />
              <Input inputSize="lg" placeholder="Large" aria-label="Large input" />
            </div>
          </div>
        </section>

        {/* ========================================================
            OTP INPUT
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">OTP Input</h3>
            <p className="text-(--color-text-secondary) text-sm">
              6 dígitos individuales para verificación email. Auto-advance, paste support, keyboard
              nav.
            </p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)">
                Default
              </div>
              <OTPInput
                onComplete={(code) => toast.success('Código completo', { description: code })}
              />
            </div>
            <div className="space-y-2">
              <div className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)">
                Con error
              </div>
              <OTPInput hasError value="123" />
            </div>
          </div>
        </section>

        {/* ========================================================
            NAVBAR — preview
            ======================================================== */}
        <section className="space-y-6">
          <div>
            <h3 className="text-display text-2xl mb-1">Navbar</h3>
            <p className="text-(--color-text-secondary) text-sm">
              Header de la app autenticada. Logo + nav + coins balance + avatar dropdown. Resizá la
              ventana para ver el mobile.
            </p>
          </div>
          <div className="rounded-lg overflow-hidden border border-white/[0.06]">
            <Navbar
              user={{
                username: 'eze',
                displayName: 'Ezequiel Machado',
              }}
              coinsBalance={142}
            />
            <div className="p-8 bg-(--color-surface-base) text-center text-(--color-text-muted) text-sm">
              Contenido de la app iría acá
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
  )
}
