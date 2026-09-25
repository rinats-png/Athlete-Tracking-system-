import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { accessFor, canUse, type Access } from '@/domain/entitlement'
import type { PlanFeature } from '@/data/pricing'
import { billingEnabled, readBillingState, refreshBillingState, type BillingState } from '@/lib/billing'
import { applyPlanChange, fetchCoachStatus, readCoachStatus, type CoachStatus } from '@/lib/coachStatus'
import { canMeasureAthlete, limitStatus, type LimitStatus } from '@/domain/upgrade'
import { useAppData } from '@/lib/store/AppDataProvider'

/**
 * Der Stand der Freischaltungen, einmal für die ganze App.
 *
 * Beim Start kommt der letzte gespeicherte Stand sofort (damit die Schranken
 * nicht erst offen und dann zu sind — oder umgekehrt), und im Hintergrund
 * wird der Server gefragt. Ohne Netz oder ohne Anmeldung bleibt der
 * gespeicherte Stand; ein Funkloch ist keine Kündigung.
 *
 * FÜR TRAINER kommt der Zählstand dazu (`my_coach_status`): wie viele
 * Athleten im laufenden Abojahr gemessen wurden, ob die Stufe reicht, seit
 * wann nicht mehr, und — im Team — welche Stufe der Inhaber hat. Daraus
 * entsteht `limit`, und aus `limit` die Frage, ob ein Athlet jetzt gemessen
 * werden darf (src/domain/upgrade.ts).
 */

interface BillingContextValue {
  /** Ob der Bezahlweg überhaupt an ist. Aus = keine Schranke, nirgends. */
  enabled: boolean
  state: BillingState
  access: Access
  can: (feature: PlanFeature) => boolean
  refresh: () => Promise<void>
  /** Zählstand und Team — null für Athleten oder solange nichts vom Server kam. */
  coach: CoachStatus | null
  /** Stufe gegen Zählstand. null ohne Bezahlweg oder ohne Zählstand. */
  limit: LimitStatus | null
  /** Darf dieser Athlet jetzt gemessen werden? (Frist, bereits gezählt) */
  mayMeasure: (athlete: { results: readonly { performedAt: string }[] }) => boolean
}

const BillingContext = createContext<BillingContextValue | null>(null)

const AUTO_KEY = 'kydon.autoUpgrade.attempt'

export function BillingProvider({ children }: { children: ReactNode }) {
  const { role } = useAppData()
  const [state, setState] = useState<BillingState>(() => readBillingState())
  const [coach, setCoach] = useState<CoachStatus | null>(() => readCoachStatus())
  const enabled = billingEnabled()
  const isCoach = role === 'coach'

  const refresh = useCallback(async () => {
    const [next, status] = await Promise.all([refreshBillingState(), isCoach ? fetchCoachStatus() : Promise.resolve(null)])
    if (next) setState(next)
    if (status) setCoach(status)
  }, [isCoach])

  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [enabled, refresh])

  // Im Team kommt die Stufe vom Inhaber: die eigene Freischaltung gibt es nicht.
  const teamTier = isCoach && coach && !coach.isOwner ? coach.tier : null
  const access = useMemo(
    () => accessFor(isCoach ? 'coach' : 'athlete', state.entitlements, state.coachGrant, new Date(), teamTier),
    [isCoach, state, teamTier],
  )

  const limit = useMemo(() => (enabled && isCoach && coach ? limitStatus(coach.measured, coach.tier, coach.overLimitSince) : null), [enabled, isCoach, coach])

  const mayMeasure = useCallback<BillingContextValue['mayMeasure']>(
    (athlete) => {
      if (!limit || !coach) return true
      const from = coach.windowStart ? Date.parse(coach.windowStart) : Number.NaN
      const counted = Number.isFinite(from) && athlete.results.some((r) => Date.parse(r.performedAt) >= from)
      return canMeasureAthlete(counted, limit)
    },
    [limit, coach],
  )

  /*
   * Hochstufen ohne Rückfrage — NUR, wenn der Inhaber es selbst eingeschaltet
   * hat, und höchstens einmal je Überschreitung. Scheitert die Zahlung, bleibt
   * es beim Hinweis; kein zweiter Versuch im Hintergrund.
   */
  const autoTried = useRef(false)
  useEffect(() => {
    if (!enabled || !coach || !limit || autoTried.current) return
    if (!coach.autoUpgrade || !coach.isOwner || !coach.hasSubscription) return
    if ((limit.state !== 'grace' && limit.state !== 'blocked') || !limit.nextTier) return
    const marker = `${coach.overLimitSince ?? ''}:${limit.nextTier.id}`
    try {
      if (localStorage.getItem(AUTO_KEY) === marker) return
      localStorage.setItem(AUTO_KEY, marker)
    } catch {
      /* ohne Speicher: einmal je Sitzung reicht */
    }
    autoTried.current = true
    void applyPlanChange(limit.nextTier.id).then((r) => {
      if (r.ok) void refresh()
    })
  }, [enabled, coach, limit, refresh])

  const value = useMemo<BillingContextValue>(
    () => ({ enabled, state, access, can: (feature) => !enabled || canUse(feature, access), refresh, coach: isCoach ? coach : null, limit, mayMeasure }),
    [enabled, state, access, refresh, isCoach, coach, limit, mayMeasure],
  )
  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext)
  if (!ctx) throw new Error('useBilling ausserhalb von BillingProvider')
  return ctx
}
