import { Anton, Geist, Geist_Mono } from 'next/font/google'

/**
 * Display font — Anton
 * Use: hero, page titles, números grandes, eyebrows decorativas
 */
export const fontDisplay = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
})

/**
 * Body font — Geist
 * Use: body text, UI labels, paragraphs, buttons
 */
export const fontBody = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

/**
 * Mono font — Geist Mono
 * Use: tokens, código, IDs, números técnicos, captions con vibe técnico
 */
export const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

/**
 * Helper para aplicar todas las font variables al root
 */
export const fontVariables = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`
