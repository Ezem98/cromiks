import { cn } from '@/lib/utils'

/**
 * Text input custom alineado al brand.
 *
 * Variants:
 * - default:  fondo surface-raised + border sutil
 * - ghost:    transparente con border (para inline editing)
 *
 * Sizes:
 * - sm: 36px altura
 * - md: 44px (default)
 * - lg: 56px
 *
 * Features:
 * - Focus ring con argentina-glow
 * - placeholder con text-muted
 * - Soporte para iconos a través de leading/trailing wrappers
 * - Estados: error (border danger), disabled (opacity)
 */

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: 'default' | 'ghost'
  inputSize?: 'sm' | 'md' | 'lg'
  hasError?: boolean
}

const variantStyles = {
  default: 'bg-(--color-surface-raised) border-white/10',
  ghost: 'bg-transparent border-white/10',
} as const

const sizeStyles = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-4 text-[14px]',
  lg: 'h-14 px-5 text-[16px]',
} as const

export function Input({
  variant = 'default',
  inputSize = 'md',
  hasError = false,
  className,
  type = 'text',
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        // Base
        'w-full rounded-[10px] border outline-none',
        'text-(--color-text-primary)',
        'placeholder:text-(--color-text-muted)',
        'transition-all duration-200',

        // Hover
        'hover:border-white/20',

        // Focus
        'focus:border-(--color-argentina-glow) focus:ring-2 focus:ring-(--color-argentina-glow)/30',

        // Disabled
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'disabled:hover:border-white/10',

        // Variant + size
        variantStyles[variant],
        sizeStyles[inputSize],

        // Error
        hasError &&
          'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/30',

        className,
      )}
      {...props}
    />
  )
}
