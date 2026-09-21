import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { accessFor, canUse, type Access } from '@/domain/entitlement'
import type { PlanFeature } from '@/data/pricing'
import { billingEnabled, readBillingState, refreshBillingState, type BillingState } from '@/lib/billing'
import { useAppData } from '@/lib/store/AppDataProvider'

/**
 * Der Stand der Freischaltungen, einmal für die ganze App.
 *
 * Beim Start kommt der letzte gespeicherte Stand sofort (damit die Schranken
 * nicht erst offen und dann zu sind — oder umgekehrt), und im Hintergrund
 * wird der Server gefragt. Ohne Netz oder ohne Anmeldung bleibt der
 * gespeicherte Stand; ein Funkloch ist keine Kündigung.
 */

interface BillingContextValue {
  /** Ob der Bezahlweg überhaupt an ist. Aus = keine Schranke, nirgends. */
  enabled: boolean
  state: BillingState
  access: Access
  can: (feature: PlanFeature) => boolean
  refresh: () => Promise<void>
}

const BillingContext = createContext<BillingContextValue | null>(null)

export function BillingProvider({ children }: { children: ReactNode }) {
  const { role } = useAppData()
  const [state, setState] = useState<BillingState>(() => readBillingState())
  const enabled = billingEnabled()

  const refresh = useCallback(async () => {
    const next = await refreshBillingState()
    if (next) setState(next)
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [enabled, refresh])

  const access = useMemo(() => accessFor(role === 'coach' ? 'coach' : 'athlete', state.entitlements, state.coachGrant), [role, state])
  const value = useMemo<BillingContextValue>(
    () => ({ enabled, state, access, can: (feature) => !enabled || canUse(feature, access), refresh }),
    [enabled, state, access, refresh],
  )
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext)
  if (!ctx) throw new Error('useBilling ausserhalb von BillingProvider')
  return ctx
}
