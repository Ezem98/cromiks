'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'
import { isPosthogClientEnabled, POSTHOG_HOST, POSTHOG_PROJECT_KEY } from '@/lib/posthog/config'

/**
 * PostHogProvider — bootea posthog-js y expone el client via context.
 * Se monta una sola vez en el root layout para cubrir páginas públicas y
 * autenticadas. El identify del user vive en <PostHogIdentify> dentro del
 * (app) layout porque solo aplica con sesión.
 *
 * Decisiones del plan (docs/implementation-plan-pr6.md §2):
 * - autocapture: false → eventos explícitos solo
 * - capture_pageview: 'history_change' → SPA-friendly con App Router
 * - disable_session_recording: true → replays off pre-launch
 * - Kill switch: NEXT_PUBLIC_POSTHOG_DISABLED=true → no init
 */

export { usePostHog }

let initialized = false

function initPostHog() {
  if (initialized || typeof window === 'undefined') return
  if (!isPosthogClientEnabled()) return

  posthog.init(POSTHOG_PROJECT_KEY, {
    api_host: POSTHOG_HOST,

    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: true,

    disable_session_recording: true,

    persistence: 'localStorage+cookie',

    debug: false,

    loaded: (ph) => {
      ph.register({
        environment: process.env.NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME || 'development',
        release: process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA || undefined,
      })
    },
  })

  initialized = true
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
