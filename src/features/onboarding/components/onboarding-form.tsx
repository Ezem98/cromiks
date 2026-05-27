'use client'

import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { checkUsernameAvailable, completeOnboarding } from '@/features/onboarding/actions'
import { cn } from '@/lib/utils'

/**
 * Form de onboarding post-signup.
 *
 * Pide:
 *  - username (con check de unicidad en vivo)
 *  - display name (opcional, lo que se muestra públicamente)
 *  - idioma preferido
 *  - country code (opcional, 2 letras ISO)
 */

type OnboardingFormProps = {
  initialUsername?: string
  email: string
}

const languages = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
] as const

const popularCountries = [
  { code: 'AR', label: 'Argentina' },
  { code: 'BR', label: 'Brasil' },
  { code: 'UY', label: 'Uruguay' },
  { code: 'CL', label: 'Chile' },
  { code: 'PY', label: 'Paraguay' },
  { code: 'CO', label: 'Colombia' },
  { code: 'MX', label: 'México' },
  { code: 'ES', label: 'España' },
  { code: 'IT', label: 'Italia' },
  { code: 'US', label: 'Estados Unidos' },
] as const

const usernameErrorMessages: Record<string, string> = {
  invalid_format: 'Solo minúsculas, números y guión bajo. 3 a 20 caracteres.',
  taken: 'Ese username ya está tomado.',
  empty: 'Elegí un username.',
}

export function OnboardingForm({ initialUsername = '', email }: OnboardingFormProps) {
  const [username, setUsername] = useState(initialUsername)
  const [displayName, setDisplayName] = useState('')
  const [language, setLanguage] = useState<'es' | 'en' | 'pt' | 'it'>('es')
  const [countryCode, setCountryCode] = useState('AR')

  const [usernameStatus, setUsernameStatus] = useState<{
    state: 'idle' | 'checking' | 'available' | 'unavailable'
    error?: string
  }>({ state: 'idle' })

  const [isPending, startTransition] = useTransition()

  // Debounced check de username
  useEffect(() => {
    if (!username || username === initialUsername) {
      setUsernameStatus({ state: 'idle' })
      return
    }

    setUsernameStatus({ state: 'checking' })

    const timeout = setTimeout(async () => {
      const result = await checkUsernameAvailable({ username })
      if (result.ok) {
        setUsernameStatus({ state: 'available' })
      } else {
        setUsernameStatus({
          state: 'unavailable',
          error: result.code === 'invalid_format' ? 'invalid_format' : 'taken',
        })
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [username, initialUsername])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (usernameStatus.state === 'unavailable' || usernameStatus.state === 'checking') {
      return
    }

    startTransition(async () => {
      const result = await completeOnboarding({
        username,
        displayName: displayName || undefined,
        language,
        countryCode: countryCode || undefined,
      })

      if (!result.ok) {
        if (result.code === 'username_taken') {
          setUsernameStatus({ state: 'unavailable', error: 'taken' })
          toast.error('Ese username ya fue tomado', {
            description: 'Probá con otro.',
          })
        } else {
          toast.error('No pudimos completar el setup', {
            description: 'Probá de nuevo en un rato.',
          })
        }
      }
    })
  }

  const canSubmit =
    username &&
    usernameStatus.state !== 'unavailable' &&
    usernameStatus.state !== 'checking' &&
    !isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email read-only */}
      <div className="space-y-2">
        <div className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)">
          Email
        </div>
        <div className="text-(--color-text-secondary) text-sm py-2.5 px-4 bg-(--color-surface-elevated)/50 rounded-[10px] border border-white/[0.06]">
          {email}
        </div>
      </div>

      {/* Username */}
      <div className="space-y-2">
        <label
          htmlFor="ob-username"
          className="block text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)"
        >
          Username
        </label>
        <div className="relative">
          <Input
            id="ob-username"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ezequiel_arg"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            disabled={isPending}
            hasError={usernameStatus.state === 'unavailable'}
            inputSize="lg"
            maxLength={20}
            required
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus.state === 'checking' && (
              <Loader2Icon className="size-4 text-(--color-text-muted) animate-spin" />
            )}
            {usernameStatus.state === 'available' && (
              <CheckIcon className="size-4 text-(--color-success)" />
            )}
            {usernameStatus.state === 'unavailable' && (
              <XIcon className="size-4 text-(--color-danger)" />
            )}
          </div>
        </div>
        {usernameStatus.state === 'unavailable' && usernameStatus.error && (
          <p className="text-[13px] text-(--color-danger)">
            {usernameErrorMessages[usernameStatus.error] ?? usernameErrorMessages.invalid_format}
          </p>
        )}
        {usernameStatus.state === 'available' && (
          <p className="text-[13px] text-(--color-success)">¡Está libre!</p>
        )}
        <p className="text-[12px] text-(--color-text-muted)">
          Tu URL pública va a ser cromiks.app/u/{username || 'tu-username'}
        </p>
      </div>

      {/* Display name */}
      <div className="space-y-2">
        <label
          htmlFor="ob-displayname"
          className="block text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)"
        >
          Nombre para mostrar <span className="text-(--color-text-ghost)">(opcional)</span>
        </label>
        <Input
          id="ob-displayname"
          type="text"
          autoComplete="name"
          placeholder="Ezequiel"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isPending}
          inputSize="lg"
          maxLength={50}
        />
      </div>

      {/* Language */}
      <div className="space-y-2">
        <div className="text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)">
          Idioma
        </div>
        <div className="grid grid-cols-2 gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              disabled={isPending}
              className={cn(
                'h-11 rounded-[10px] border text-sm font-medium transition-all',
                language === lang.code
                  ? 'bg-(--color-argentina-glow)/15 border-(--color-argentina-glow) text-(--color-argentina-glow)'
                  : 'bg-(--color-surface-elevated)/50 border-white/10 text-(--color-text-primary) hover:border-white/20',
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Country */}
      <div className="space-y-2">
        <label
          htmlFor="ob-country"
          className="block text-mono text-[11px] uppercase tracking-[0.1em] text-(--color-text-muted)"
        >
          País
        </label>
        <select
          id="ob-country"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          disabled={isPending}
          className={cn(
            'w-full h-14 px-5 rounded-[10px] border outline-none cursor-pointer',
            'bg-(--color-surface-raised) border-white/10',
            'text-(--color-text-primary) text-[16px]',
            'hover:border-white/20',
            'focus:border-(--color-argentina-glow) focus:ring-2 focus:ring-(--color-argentina-glow)/30',
            'transition-all duration-200',
          )}
        >
          {popularCountries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="primary" size="full" disabled={!canSubmit}>
        {isPending ? 'Completando...' : 'Empezar mi álbum'}
      </Button>
    </form>
  )
}
