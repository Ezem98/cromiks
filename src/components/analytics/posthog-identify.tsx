'use client'

import { useEffect } from 'react'
import { usePostHog } from '@/components/analytics/posthog-provider'
import { isPosthogClientEnabled } from '@/lib/posthog/config'

/**
 * Llama posthog.identify(userId) cuando hay sesión. Va dentro del (app) layout
 * (autenticado). Si el user hace logout, queda al provider del root resetear
 * el distinct_id en una próxima iteración (no implementado todavía — beta
 * cerrada no tiene logout-loop crítico).
 */
export function PostHogIdentify({
  userId,
  username,
  children,
}: {
  userId: string
  username?: string
  children: React.ReactNode
}) {
  const posthog = usePostHog()

  useEffect(() => {
    if (!isPosthogClientEnabled() || !posthog || !userId) return
    posthog.identify(userId, username ? { username } : undefined)
  }, [posthog, userId, username])

  return <>{children}</>
}
