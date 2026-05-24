import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'
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
         * Acciones secundarias.
         * Transparente con border.
         */
        ghost: [
          'bg-transparent text-(--color-text-primary)',
          'border border-white/10',
          'hover:bg-(--color-surface-raised) hover:border-white/20',
        ],
        /**
         * Celebración, premium, Legendary actions.
         * Color: --gold.
         */
        gold: [
          'bg-(--color-gold) text-(--color-surface-deep) font-semibold',
          'hover:bg-[#E5BA4E] hover:-translate-y-px',
          'active:translate-y-0',
        ],
        /**
         * Destructivos, irreversibles.
         * Outline rojo.
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
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

export { buttonVariants }
