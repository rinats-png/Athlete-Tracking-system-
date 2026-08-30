import type { StoredResult } from '@/lib/store/localStore'
import { getTest } from '@/data/testCatalog'

/**
 * Datenqualität je Ergebnis.
 *
 * Ein Messwert ohne Aussage über seine Belastbarkeit lädt zu Überinterpretation
 * ein. Ein 1RM aus zwölf Wiederholungen ist eine Schätzung mit erheblicher
 * Streuung, ein Test mit RPE 6 war nicht maximal — beides sind gültige Daten,
 * aber keine gleichwertigen.
 *
 * Die Bewertung ändert die Werte nicht und löscht nichts. Sie beschriftet sie.
 */

export type QualityStatus = 'valid' | 'questionable' | 'incomplete'

export interface QualityAssessment {
  status: QualityStatus
  /** i18n-Schlüssel der Begründungen. */
  reasons: string[]
}

/** Unterhalb dieses RPE gilt ein Maximaltest als nicht ausbelastet. */
const SUBMAXIMAL_RPE = 8

/** Mindestabweichung vom eigenen Mittel, ab der ein Wert überhaupt auffällt. */
const RELATIVE_OUTLIER_FLOOR = 0.25

export function assessQuality(result: StoredResult): QualityAssessment {
  const test = getTest(result.testSlug)
  const reasons: string[] = []
  let status: QualityStatus = 'valid'

  if (!test) return { status: 'incomplete', reasons: ['quality.unknownTest'] }
  if (result.score == null) {
    return { status: 'incomplete', reasons: ['quality.noScore'] }
  }

  // Relativkraft ohne Körpergewicht ist schlicht nicht berechenbar.
  if (test.requiresBodyWeight && result.bodyWeightKg == null) {
    reasons.push('quality.noBodyWeight')
    status = 'incomplete'
  }

  // Perzentilvergleich braucht Geschlecht und Alter.
  if (result.sex == null || result.sex === 'other' || result.ageYears == null) {
    reasons.push('quality.noBenchmarkContext')
    if (status === 'valid') status = 'incomplete'
  }

  const rpe = result.values.rpe
  if (rpe != null && rpe < SUBMAXIMAL_RPE && isMaximalTest(result.testSlug)) {
    reasons.push('quality.submaximal')
    status = 'questionable'
  }

  const reps = result.values.reps
  if (reps != null && reps > 10) {
    reasons.push('quality.estimatedFromManyReps')
    status = 'questionable'
  }

  return { status, reasons }
}

/** Tests, die per Protokoll bis zur Ausbelastung gehen. */
function isMaximalTest(slug: string): boolean {
  const test = getTest(slug)
  if (!test) return false
  return test.category === 'max_strength' || test.protocol.mode === 'attempts' || test.category === 'endurance'
}

/**
 * Ausreisser gegen die eigene Historie.
 *
 * Bewusst konservativ und nur mit mindestens drei Vorwerten: bei zwei Punkten
 * ist jede Abweichung „ungewöhnlich“. Es wird nichts gelöscht, nur zum Prüfen
 * markiert — ein echter Leistungssprung sieht statistisch aus wie ein Tippfehler.
 */
export function isOutlier(result: StoredResult, history: StoredResult[]): boolean {
  const previous = history
    .filter((r) => r.testSlug === result.testSlug && r.id !== result.id && r.score != null)
    .map((r) => r.score as number)

  if (previous.length < 3 || result.score == null) return false

  const mean = previous.reduce((a, b) => a + b, 0) / previous.length
  const variance = previous.reduce((sum, v) => sum + (v - mean) ** 2, 0) / previous.length
  const sd = Math.sqrt(variance)
  const deviation = Math.abs(result.score - mean)

  // Zwei Bedingungen, nicht eine. Wer sehr konstant testet, hat eine winzige
  // Streuung: bei 180/182/185/184 kg liegen drei Sigma bei knapp 6 kg, und
  // eine echte Bestleistung von 190 kg wäre „Ausreisser“. Deshalb zusätzlich
  // ein absoluter Boden — ein Tippfehler liegt um Grössenordnungen daneben,
  // eine Bestleistung um wenige Prozent.
  if (deviation <= Math.abs(mean) * RELATIVE_OUTLIER_FLOOR) return false
  if (sd === 0) return true

  return deviation > 3 * sd
}
