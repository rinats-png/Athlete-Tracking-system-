import {
  ATHLETE_PLANS,
  COACH_TIERS,
  FREE_CORE,
  athletePlan,
  coachTier,
  type AthletePlanId,
  type CoachTierId,
  type EntitlementProduct,
  type PlanFeature,
} from '@/data/pricing'

/**
 * Wer darf was — die Rechnung hinter jeder Schranke.
 *
 * EINE QUELLE: die Freischaltungen (`entitlements`) des Kontos, wie sie der
 * Server nach einer Zahlung eingetragen hat. Die App liest sie, sie schreibt
 * sie nie. Was hier herauskommt, ist eine Stufe je Rolle und daraus eine
 * Antwort auf «darf ich dieses Merkmal benutzen».
 *
 * DIE REGELN, DIE SICH DARAUS ERGEBEN:
 *
 *   - Der kostenlose Kern (FREE_CORE) ist IMMER erlaubt, ohne Stufe und
 *     ohne Server. Kein Pfad in dieser Datei kann ihn sperren — der Prüffall
 *     dazu steht in tests/billing.spec.ts.
 *   - Ein Athlet, den ein zahlender Trainer betreut, bekommt Plus über ihn
 *     (COACH_INCLUDES_ATHLETE_PLUS). Das ist der «Trainer-Zuschuss».
 *   - Ein Trainer mit bezahlter Stufe hat die volle Datentiefe für seine
 *     Athleten — die Trainerstufen trennt die Anzahl, nicht die Tiefe.
 *   - Mehrere Freischaltungen: die höchste zählt. Wer Pro hat und noch ein
 *     altes Plus, ist Pro.
 *
 * Ohne Bezahlweg (billingEnabled() === false) fragt niemand diese Datei —
 * dann ist alles offen, wie vor Etappe 4. Sperren ohne Kaufmöglichkeit
 * nähmen allen etwas weg und gäben niemandem einen Weg zurück.
 */

export interface Entitlement {
  product: EntitlementProduct
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
  /** null = unbefristet (Einmalkauf). */
  currentPeriodEnd: string | null
}

/** Welche Produkte gerade tragen: aktiv oder in Probe, und nicht abgelaufen. */
export function activeProducts(entitlements: readonly Entitlement[], now: Date = new Date()): Set<EntitlementProduct> {
  const out = new Set<EntitlementProduct>()
  for (const e of entitlements) {
    if (e.status !== 'active' && e.status !== 'trialing') continue
    if (e.currentPeriodEnd && Date.parse(e.currentPeriodEnd) <= now.getTime()) continue
    out.add(e.product)
  }
  return out
}

/** Rangfolge der Athletenstufen — die höchste vorhandene zählt. */
const ATHLETE_RANK: AthletePlanId[] = ['free', 'plus', 'termin', 'pro', 'elite']
const COACH_RANK: CoachTierId[] = ['coach_free', 'coach_start', 'coach_team', 'coach_pro']

export function athletePlanOf(products: ReadonlySet<EntitlementProduct>, coachGrant = false): AthletePlanId {
  let best: AthletePlanId = coachGrant ? 'plus' : 'free'
  for (const plan of ATHLETE_PLANS) {
    if (plan.product && products.has(plan.product) && ATHLETE_RANK.indexOf(plan.id) > ATHLETE_RANK.indexOf(best)) best = plan.id
  }
  return best
}

export function coachTierOf(products: ReadonlySet<EntitlementProduct>): CoachTierId {
  let best: CoachTierId = 'coach_free'
  for (const tier of COACH_TIERS) {
    if (tier.product && products.has(tier.product) && COACH_RANK.indexOf(tier.id) > COACH_RANK.indexOf(best)) best = tier.id
  }
  return best
}

export interface Access {
  role: 'athlete' | 'coach'
  athletePlan: AthletePlanId
  coachTier: CoachTierId
}

export function accessFor(role: Access['role'], entitlements: readonly Entitlement[], coachGrant = false, now: Date = new Date()): Access {
  const products = activeProducts(entitlements, now)
  return { role, athletePlan: athletePlanOf(products, coachGrant), coachTier: coachTierOf(products) }
}

/** Was ein zahlender Trainer für seine Athleten mitbringt: alles, was Pro hat. */
/**
 * Was ein zahlender Trainer für seine Athleten mitbringt: die volle
 * Datentiefe — aber NICHT die Gesundheitsschicht. Die ist an eine eigene
 * Einwilligung des Athleten gebunden und an sein Alter; ein Trainerabo kann
 * sie nicht mitkaufen (docs/rechtspruefung-art9-mdr.md §4).
 */
const FULL_DEPTH: readonly PlanFeature[] = athletePlan('pro').features

export function canUse(feature: PlanFeature, access: Access): boolean {
  if (FREE_CORE.includes(feature)) return true
  if (access.role === 'coach') {
    const tier = coachTier(access.coachTier)
    if (tier.features.includes(feature)) return true
    return tier.yearlyEur != null && FULL_DEPTH.includes(feature)
  }
  return athletePlan(access.athletePlan).features.includes(feature)
}

/**
 * Die kleinste Stufe, die ein Merkmal enthält — für den Hinweis an der
 * Schranke: «Das ist Teil von Plus», nicht «gesperrt».
 */
export function smallestPlanWith(feature: PlanFeature, role: Access['role']): AthletePlanId | CoachTierId | null {
  if (role === 'coach') {
    for (const id of COACH_RANK) {
      const tier = coachTier(id)
      if (tier.features.includes(feature) || (tier.yearlyEur != null && FULL_DEPTH.includes(feature))) return id
    }
    return null
  }
  for (const id of ATHLETE_RANK) if (athletePlan(id).features.includes(feature)) return id
  return null
}
