import { COACH_RANK, COACH_TIERS, coachTier, type CoachTier, type CoachTierId } from '@/data/pricing'

/**
 * Stufe überschritten — was jetzt?
 *
 * DIE DREI REGELN (entschieden am 25.09.2026):
 *
 *   1. NIE MITTEN AM TESTTAG SPERREN. Wer den elften Athleten misst, misst
 *      ihn. Danach kommt ein Hinweis, keine Sperre.
 *   2. VIERZEHN TAGE FRIST. Ab dem Moment, in dem der Server die
 *      Überschreitung zum ersten Mal sieht (`over_limit_since`), darf weiter
 *      gemessen werden. Danach sind NEUE Athleten — solche ohne Messung im
 *      laufenden Abojahr — erst nach dem Wechsel messbar. Wer schon gezählt
 *      ist, bleibt immer messbar: eine Stufe hält Merkmale zurück, nie Daten
 *      und nie die Menschen, die man schon betreut.
 *   3. ANTEILIG ZAHLEN. Wer zur Hälfte des Jahres von Pro (649 €) zu Club
 *      (999 €) wechselt, zahlt die halbe Differenz: 175 €. Danach läuft das Abo
 *      zum neuen Preis. Die genaue Summe rechnet Stripe (auf die Sekunde);
 *      die Rechnung hier ist die Vorschau, wenn Stripe nicht erreichbar ist,
 *      und der Prüfstein, an dem sich die Regel festhalten lässt.
 *
 * HERABSTUFEN ERSTATTET NICHTS. Die kleinere Stufe gilt ab der nächsten
 * Verlängerung; bis dahin bleibt, was bezahlt ist.
 *
 * Eine Hochstufung OHNE RÜCKFRAGE gibt es nur, wenn der Inhaber sie selbst
 * eingeschaltet hat (`auto_upgrade`). Eine Mehrzahlung, die niemand bestätigt
 * hat, ist rechtlich und menschlich die falsche Voreinstellung.
 */

export const GRACE_DAYS = 14
const DAY = 86_400_000

export type LimitState =
  /** Unter der Grenze, mit Luft. */
  | 'ok'
  /** Ab 80 % der Grenze: ein leiser Hinweis, noch keine Aufgabe. */
  | 'near'
  /** Überschritten, Frist läuft. Messen geht weiter. */
  | 'grace'
  /** Frist vorbei: neue Athleten erst nach dem Wechsel. */
  | 'blocked'
  /** Mehr, als die grösste Stufe trägt: Anfrage statt Hochstufung. */
  | 'beyond'

export interface LimitStatus {
  state: LimitState
  measured: number
  limit: number
  /** Die kleinste Stufe, die den Zählstand trägt. null = keine (Anfrage). */
  nextTier: CoachTier | null
  /** Ende der Frist, falls eine läuft oder abgelaufen ist. */
  graceEndsAt: Date | null
  /** Ganze Tage bis zum Fristende, nie negativ. */
  daysLeft: number | null
}

/** Die kleinste Stufe, die `measured` Athleten trägt — mindestens die aktuelle. */
export function smallestTierFor(measured: number, atLeast: CoachTierId = 'coach_free'): CoachTier | null {
  const floor = COACH_RANK.indexOf(atLeast)
  return COACH_TIERS.find((tier, i) => i >= floor && measured <= tier.athletesPerYear) ?? null
}

export function limitStatus(measured: number, tierId: CoachTierId, overLimitSince: string | null, now: Date = new Date()): LimitStatus {
  const tier = coachTier(tierId)
  const limit = tier.athletesPerYear
  if (measured <= limit) {
    return { state: measured >= Math.ceil(limit * 0.8) && limit > 3 ? 'near' : 'ok', measured, limit, nextTier: null, graceEndsAt: null, daysLeft: null }
  }
  const nextTier = smallestTierFor(measured, tierId)
  // Ohne Zeitpunkt vom Server beginnt die Frist jetzt — nie früher.
  const since = overLimitSince ? Date.parse(overLimitSince) : now.getTime()
  const start = Number.isFinite(since) ? since : now.getTime()
  const graceEndsAt = new Date(start + GRACE_DAYS * DAY)
  const daysLeft = Math.max(0, Math.ceil((graceEndsAt.getTime() - now.getTime()) / DAY))
  const state: LimitState = nextTier == null ? 'beyond' : now.getTime() >= graceEndsAt.getTime() ? 'blocked' : 'grace'
  return { state, measured, limit, nextTier, graceEndsAt, daysLeft }
}

/**
 * Darf dieser Athlet jetzt gemessen werden?
 *
 * Ja, wenn er im laufenden Abojahr schon gezählt ist (er kostet nichts
 * zusätzlich), oder wenn keine abgelaufene Frist besteht. `beyond` sperrt
 * nicht: dort ist die Antwort ein Gespräch, und bis dahin wird gemessen.
 */
export function canMeasureAthlete(alreadyCounted: boolean, status: LimitStatus): boolean {
  return alreadyCounted || status.state !== 'blocked'
}

export type BillingInterval = 'yearly' | 'monthly'

/** Listenpreis einer Stufe für einen Abrechnungszeitraum. */
export function periodPriceEur(tierId: CoachTierId, interval: BillingInterval): number {
  const tier = coachTier(tierId)
  return (interval === 'yearly' ? tier.yearlyEur : tier.monthlyEur) ?? 0
}

/**
 * Die anteilige Nachzahlung bei einer Hochstufung.
 *
 * (neuer Preis − alter Preis) × verbleibender Anteil des laufenden Zeitraums,
 * auf Cent gerundet. Beim Monatsabo ist der Zeitraum der Monat — die
 * Differenz ist dann klein, und ab dem nächsten Monat gilt der neue Preis.
 * Eine Herabstufung kostet nichts und erstattet nichts: 0.
 */
export function proratedUpgradeEur(
  from: CoachTierId,
  to: CoachTierId,
  interval: BillingInterval,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date(),
): number {
  const diff = periodPriceEur(to, interval) - periodPriceEur(from, interval)
  if (diff <= 0) return 0
  const total = periodEnd.getTime() - periodStart.getTime()
  if (!(total > 0)) return 0
  const remaining = Math.min(Math.max(periodEnd.getTime() - now.getTime(), 0), total)
  return Math.round(diff * (remaining / total) * 100) / 100
}

/** Hoch oder runter? Gleich ist keins von beiden. */
export function changeDirection(from: CoachTierId, to: CoachTierId): 'up' | 'down' | 'same' {
  const a = COACH_RANK.indexOf(from)
  const b = COACH_RANK.indexOf(to)
  return b > a ? 'up' : b < a ? 'down' : 'same'
}
