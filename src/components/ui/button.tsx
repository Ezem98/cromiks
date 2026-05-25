import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium tracking-tight',
    'rounded-[10px]',
    'transition-all duration-200',
    'disabled:opacity-50 disabled:pointer-events-none',
    'cursor-pointer',
    'whitespace-nowrap',
    'outline-none focus-visible:ring-2 focus-visible:ring-(--color-argentina-glow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface-deep)',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /**
         * Acción más importante del contexto.
         * Color: --argentina-glow (celeste).
         */
        primary: [
          'bg-(--color-argentina-glow) text-(--color-surface-deep)',
          'hover:bg-[#8FCCFF] hover:-translate-y-px',
          'active:translate-y-0',
        ],
        /**
         * Acciones secundarias. Transparente con border.
         */
        ghost: [
          'bg-transparent text-(--color-text-primary)',
          'border border-white/10',
          'hover:bg-(--color-surface-raised) hover:border-white/20',
        ],
        /**
         * Celebración, premium, Legendary actions. Color: --gold.
         */
        gold: [
          'bg-(--color-gold) text-(--color-surface-deep) font-semibold',
          'hover:bg-[#E5BA4E] hover:-translate-y-px',
          'active:translate-y-0',
        ],
        /**
         * Destructivos, irreversibles. Outline rojo.
         */
        danger: [
          'bg-transparent text-(--color-danger)',
          'border border-(--color-danger)',
          'hover:bg-(--color-danger)/10',
        ],
      },
      size: {
        sm: 'text-[13px] h-9 px-4',
        md: 'text-[14px] h-11 px-5',
        lg: 'text-[16px] h-14 px-6',
        full: 'text-[16px] h-14 px-6 w-full',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
