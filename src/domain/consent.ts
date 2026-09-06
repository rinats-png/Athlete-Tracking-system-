import { ageFromBirthDate } from '@/lib/format'
import type { StoredAthlete } from '@/lib/store/localStore'

/**
 * Einwilligung in die Verarbeitung fremder Messwerte.
 *
 * DER GRUND, WARUM ES DAS GIBT: ein Trainer, der zwölf Athleten führt,
 * verarbeitet personenbezogene Daten anderer Menschen. Bei Minderjährigen
 * genügt deren eigenes Einverständnis nicht. Solange das nur in den
 * Nutzungsbedingungen steht, hakt es niemand ab — und genau das Segment, das
 * am ehesten zahlen würde (Vereine mit Nachwuchs), kann die App dann nicht
 * einsetzen.
 *
 * WAS DIE APP DAZU NICHT TUT: sie erhebt keine Unterschrift, kein Dokument
 * und keine Anschrift der Eltern (§50). Sie hält fest, DASS und WANN
 * eingewilligt wurde und von wem dem Namen nach. Der Nachweis selbst bleibt
 * beim Trainer — ein eingescannter Elternbrief in einer Sport-App wäre mehr
 * Risiko als Nutzen.
 *
 * Und sie gibt keine Rechtsberatung: was im Einzelfall nötig ist, sagt ein
 * Anwalt, nicht diese Datei.
 */

/** Ab diesem Alter gilt jemand für die App als volljährig. */
export const ADULT_AGE = 18

export type ConsentState =
  /** Nie erteilt. */
  | 'missing'
  /** Erteilt und gültig. */
  | 'granted'
  /** Erteilt, dann zurückgezogen. */
  | 'withdrawn'
  /** Erteilt, aber die Person ist inzwischen volljährig — eigene Einwilligung nötig. */
  | 'outgrown'

export interface ConsentStatus {
  state: ConsentState
  /** Ob für diese Person eine Einwilligung Erziehungsberechtigter nötig ist. */
  needsGuardian: boolean
  /** Alter zum Stichtag, sofern das Geburtsdatum bekannt ist. */
  ageYears: number | null
  /** Ob Messwerte für diese Person erhoben werden dürfen. */
  mayRecord: boolean
}

export function consentStatus(athlete: StoredAthlete, asOf: Date = new Date()): ConsentStatus {
  const ageYears = ageFromBirthDate(athlete.profile.birthDate, asOf)
  // Ohne Geburtsdatum wird NICHT von Volljährigkeit ausgegangen: die
  // vorsichtige Annahme kostet einen Haken, die bequeme kostet die
  // Rechtsgrundlage.
  const needsGuardian = ageYears == null || ageYears < ADULT_AGE
  const consent = athlete.consent

  if (consent.withdrawnAt) {
    return { state: 'withdrawn', needsGuardian, ageYears, mayRecord: false }
  }
  if (!consent.grantedAt) {
    return { state: 'missing', needsGuardian, ageYears, mayRecord: false }
  }
  // Wer als Minderjähriger eingewilligt bekam und inzwischen volljährig ist,
  // entscheidet selbst. Die alte Einwilligung trägt das nicht weiter.
  if (consent.forMinor && ageYears != null && ageYears >= ADULT_AGE) {
    return { state: 'outgrown', needsGuardian: false, ageYears, mayRecord: true }
  }
  return { state: 'granted', needsGuardian, ageYears, mayRecord: true }
}

/** Athleten, bei denen etwas zu tun ist. Für die Trainerübersicht. */
export function consentTodo(athletes: StoredAthlete[], asOf: Date = new Date()): StoredAthlete[] {
  return athletes
    .filter((a) => !a.archived)
    .filter((a) => {
      const status = consentStatus(a, asOf)
      return status.state !== 'granted'
    })
}
