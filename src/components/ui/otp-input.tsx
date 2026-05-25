'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * OTP Input — 6 dígitos individuales.
 *
 * Para verificación email de signup/login.
 *
 * Features:
 * - 6 inputs separados visualmente
 * - Auto-advance al siguiente al escribir
 * - Auto-back con Backspace cuando el input está vacío
 * - Paste support: pega un código completo y se distribuye
 * - Solo acepta dígitos
 * - Estado de error visual (border danger)
 * - Callback onComplete cuando los 6 están llenos
 */

type OTPInputProps = {
  length?: number
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  hasError?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

export function OTPInput({
  length = 6,
  value: controlledValue,
  onChange,
  onComplete,
  hasError = false,
  disabled = false,
  autoFocus = false,
  className,
}: OTPInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const value = controlledValue !== undefined ? controlledValue : internalValue
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [autoFocus])

  const updateValue = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onChange?.(newValue)

    if (newValue.length === length) {
      onComplete?.(newValue)
    }
  }

  const handleChange = (index: number, digit: string) => {
    // Solo dígitos
    const cleaned = digit.replace(/\D/g, '')

    if (!cleaned) {
      // Borrar
      const newValue = value.slice(0, index) + value.slice(index + 1)
      updateValue(newValue)
      return
    }

    // Si pegó múltiples dígitos, distribuir
    if (cleaned.length > 1) {
      const newValue = (value.slice(0, index) + cleaned).slice(0, length).padEnd(value.length, '')
      updateValue(newValue)

      // Mover focus al último input completado
      const nextIndex = Math.min(index + cleaned.length, length - 1)
      inputsRef.current[nextIndex]?.focus()
      return
    }

    // Caracter único
    const newValue = (value.slice(0, index) + cleaned + value.slice(index + 1)).slice(0, length)
    updateValue(newValue)

    // Auto-avanzar
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      // Si el input está vacío, retroceder al anterior
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      updateValue(pasted)
      const nextIndex = Math.min(pasted.length, length - 1)
      inputsRef.current[nextIndex]?.focus()
    }
  }

  return (
    <div className={cn('flex gap-2 items-center justify-center', className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          // biome-ignore lint/suspicious/noArrayIndexKey: posición es identidad
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Dígito ${index + 1} de ${length}`}
          className={cn(
            // Base
            'size-12 rounded-[10px] border text-center outline-none',
            'text-display text-[24px] text-(--color-text-primary)',
            'bg-(--color-surface-raised) border-white/10',
            'transition-all duration-200',

            // Hover/focus
            'hover:border-white/20',
            'focus:border-(--color-argentina-glow) focus:ring-2 focus:ring-(--color-argentina-glow)/30',

            // Filled state
            value[index] && 'border-(--color-argentina-glow)/50',

            // Disabled
            'disabled:opacity-50 disabled:cursor-not-allowed',

            // Error
            hasError &&
              'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)/30',
          )}
        />
      ))}
    </div>
  )
}
