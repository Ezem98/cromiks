'use client'

import { toast } from 'sonner'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function Playground() {
  return (
    <TooltipProvider>
      <div className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <div className="space-y-2">
          <p className="text-mono text-[11px] uppercase tracking-[0.15em] text-gold">
            Playground · D1.2-C
          </p>
          <h2 className="text-display text-4xl">Componentes shadcn</h2>
          <p className="text-text-secondary">
            Verificación de que el mapeo de tokens funciona en todos los componentes.
          </p>
        </div>

        {/* —— Buttons —— */}
        <section className="space-y-3">
          <h3 className="text-mono text-[11px] uppercase tracking-widest text-(--color-text-muted)">
            Buttons · 4 variants
          </h3>
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
        </section>

        {/* —— Dialog —— */}
        <section className="space-y-3">
          <h3 className="text-mono text-[11px] uppercase tracking-widest text-(--color-text-muted)">
            Dialog · modal central
          </h3>
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

        {/* —— Sheet —— */}
        <section className="space-y-3">
          <h3 className="text-mono text-[11px] uppercase tracking-widest text-(--color-text-muted)">
            Sheet · drawer lateral
          </h3>
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
              <div className="p-6 text-text-secondary text-sm">Contenido del sheet acá.</div>
            </SheetContent>
          </Sheet>
        </section>

        {/* —— Dropdown —— */}
        <section className="space-y-3">
          <h3 className="text-mono text-[11px] uppercase tracking-widest text-(--color-text-muted)">
            DropdownMenu · menú contextual
          </h3>
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
              <DropdownMenuItem className="text-danger focus:text-danger">
                Canjear repetidas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        {/* —— Tooltip —— */}
        <section className="space-y-3">
          <h3 className="text-mono text-[11px] uppercase tracking-widest text-(--color-text-muted)">
            Tooltip · hint contextual
          </h3>
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

        {/* —— Toast (sonner) —— */}
        <section className="space-y-3">
          <h3 className="text-mono text-[11px] uppercase tracking-widest text-(--color-text-muted)">
            Toast · feedback ephemeral
          </h3>
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
      </div>
    </TooltipProvider>
  )
}
