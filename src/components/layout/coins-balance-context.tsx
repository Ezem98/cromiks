'use client'

import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Context para el balance de monedas del user.
 *
 * Por qué existe: actions como `dismantleCard` y `claimMission` modifican el
 * balance del lado del server y devuelven el `newBalance`. Sin un store del
 * lado cliente el navbar mostraría el balance viejo hasta que `revalidatePath`
 * + RSC re-render terminara — un delay visible que confunde al user (B-09).
 *
 * Patrón:
 *   1. El SC del layout (`(app)/layout.tsx`) fetchea `user_coins.balance` y lo
 *      pasa como prop inicial al `<AppShell coinsBalance={n}>`.
 *   2. `AppShell` lo mantiene en useState y lo expone vía este context.
 *   3. `Navbar` consume el state vía `useCoinsBalance()`.
 *   4. Cualquier action que cambie el balance llama `setBalance(newBalance)`
 *      después de un retorno ok del action.
 *   5. Si el prop cambia (porque el SC se re-rendea después del revalidate),
 *      sincronizamos via useEffect — el server gana ante divergencia.
 */

type CoinsBalanceContextValue = {
  balance: number
  setBalance: (next: number) => void
}

const CoinsBalanceContext = createContext<CoinsBalanceContextValue | null>(null)

export function CoinsBalanceProvider({
  initialBalance,
  children,
}: {
  initialBalance: number
  children: React.ReactNode
}) {
  const [balance, setBalance] = useState(initialBalance)

  // Si el SC se re-rendea con un balance distinto (post revalidate), sincronizamos.
  useEffect(() => {
    setBalance(initialBalance)
  }, [initialBalance])

  return (
    <CoinsBalanceContext.Provider value={{ balance, setBalance }}>
      {children}
    </CoinsBalanceContext.Provider>
  )
}

/**
 * Hook para leer/actualizar el balance desde cualquier descendiente de AppShell.
 *
 * Devuelve `null` si se llama fuera del provider (e.g. en una página pública
 * sin layout autenticado) para que el caller pueda manejarlo con un fallback.
 */
export function useCoinsBalance(): CoinsBalanceContextValue | null {
  return useContext(CoinsBalanceContext)
}
