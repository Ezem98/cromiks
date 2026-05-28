'use client'

import { useFeatureFlagEnabled } from 'posthog-js/react'
import { isPosthogClientEnabled } from '@/lib/posthog/config'

/**
 * Wrapper sobre useFeatureFlagEnabled de posthog-js/react.
 *
 * SSR-safe: si PostHog está disabled (kill switch o todavía no inicializado),
 * retorna undefined. El caller debe tratar `undefined` como "todavía no sé" y
 * NO como "feature off" — sino se ve un flash de UI.
 *
 * Uso:
 *   const enabled = useFeatureFlag('enable_referrals')
 *   if (enabled === undefined) return <Skeleton />
 *   return enabled ? <ReferralsCard /> : null
 *
 * Ver `docs/implementation-plan-pr6.md` §5.
 */
export function useFeatureFlag(name: string): boolean | undefined {
  const flagValue = useFeatureFlagEnabled(name)

  if (!isPosthogClientEnabled()) return undefined
  return flagValue
}
