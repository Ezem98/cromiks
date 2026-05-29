'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { env } from '@/env'
import { createClient } from '@/lib/supabase/server'

/**
 * Server actions de auth.
 *
 * Magic link flow:
 *  1. signInWithOtp(email)         → manda OTP/magic link al email
 *  2. user clickea link / ingresa OTP en /signin
 *  3. verifyOtp(email, token)      → valida y crea sesión
 *  4. usuario queda logueado, redirect a /home (o /onboarding si first time)
 */

type AuthResult = {
  ok: boolean
  error?: string
}

/**
 * Manda un OTP de 6 dígitos + magic link al email del user.
 *
 * Si el email ya existe en auth.users → solo login.
 * Si no existe → crea cuenta nueva.
 *
 * Errors comunes:
 * - email_invalid: formato malo
 * - rate_limited: muchos intentos seguidos
 * - smtp_error: Resend/Supabase SMTP no respondió
 */
export async function signInWithOtp(email: string): Promise<AuthResult> {
  const cleanedEmail = email.trim().toLowerCase()

  if (!cleanedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    return { ok: false, error: 'email_invalid' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: cleanedEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    if (error.status === 429) {
      return { ok: false, error: 'rate_limited' }
    }
    console.error('[auth] signInWithOtp:', error.message)
    return { ok: false, error: 'unknown' }
  }

  return { ok: true }
}

/**
 * Valida el código OTP de 6 dígitos contra el email.
 */
export async function verifyOtp(email: string, token: string): Promise<AuthResult> {
  const cleanedEmail = email.trim().toLowerCase()
  const cleanedToken = token.trim()

  if (!cleanedEmail || !cleanedToken) {
    return { ok: false, error: 'invalid_input' }
  }

  if (cleanedToken.length !== 6 || !/^\d{6}$/.test(cleanedToken)) {
    return { ok: false, error: 'invalid_token_format' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    email: cleanedEmail,
    token: cleanedToken,
    type: 'email',
  })

  if (error) {
    if (error.message.includes('expired')) {
      return { ok: false, error: 'expired' }
    }
    if (error.message.includes('invalid')) {
      return { ok: false, error: 'invalid_token' }
    }
    console.error('[auth] verifyOtp:', error.message)
    return { ok: false, error: 'unknown' }
  }

  if (!data.user) {
    return { ok: false, error: 'no_user' }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

/**
 * Cierra la sesión actual.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/signin')
}

/**
 * Inicia el flow de OAuth con Google.
 *
 * Genera una URL de autorización con Google y redirige al user ahí.
 * Cuando Google termina (acepta o rechaza), redirige de vuelta a
 * /auth/callback?code=... que intercambia el code por una sesión.
 *
 * Este action no retorna AuthResult — directamente hace redirect.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('[auth] signInWithGoogle:', error.message)
    redirect('/signin?error=oauth_failed')
  }

  if (!data.url) {
    redirect('/signin?error=oauth_no_url')
  }

  // Redirigir al user a Google para que se loguee
  redirect(data.url)
}
