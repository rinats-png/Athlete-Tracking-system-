import { getTest } from '@/data/testCatalog'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Ist eine Veränderung echt — oder Rauschen?
 *
 * DAS PROBLEM, DAS DIESE DATEI LÖST: «+8 % gegenüber deinem letzten Test»
 * klingt nach Fortschritt. Wenn derselbe Athlet denselben Test an zwei Tagen
 * ohne jedes Training wiederholt, unterscheiden sich die Werte trotzdem — je
 * nach Test um 2 bis 8 %. Eine App, die jede Abweichung als Entwicklung
 * ausgibt, behauptet Fortschritt, wo Messrauschen ist, und lässt einen echten
 * Rückschritt in derselben Sprache erscheinen wie einen guten Tag.
 *
 * WIE HIER GERECHNET WIRD: nicht mit Literaturwerten, sondern mit der
 * Streuung, die dieser Athlet in diesem Test tatsächlich zeigt. Aus den
 * aufeinanderfolgenden Messungen wird die typische Abweichung von Messung zu
 * Messung bestimmt (die Streuung der Differenzen aufeinanderfolgender Werte,
 * geteilt durch √2 — der übliche Weg zum «typical error» aus
 * Wiederholungsmessungen).
 *
 * Bedeutsam ist eine Veränderung erst über {@link DETECTION_FACTOR} mal
 * dieser Abweichung. Der Faktor ist nicht gegriffen: die Differenz ZWEIER
 * Messungen streut um √2 mal so stark wie eine einzelne, und 1,96 Streuungen
 * decken das übliche 95-Prozent-Band ab — 1,96 · √2 ≈ 2,77. Mit einer
 * einfachen Streuung als Schwelle würde etwa jede dritte reine
 * Tagesschwankung als «Fortschritt» durchgehen.
 *
 * WAS HIER NICHT PASSIERT: keine Signifikanzaussage, kein Vertrauensbereich,
 * keine Behauptung über die Ursache. Die Datei sagt nur: «grösser als deine
 * eigene Streuung» oder «im Bereich deiner Streuung». Unter
 * {@link MIN_POINTS_FOR_ERROR} Messungen sagt sie gar nichts — mit zwei
 * Werten gibt es keine Streuung, nur eine Differenz.
 */

/** Ab so vielen Messungen desselben Tests lässt sich eine Streuung schätzen. */
export const MIN_POINTS_FOR_ERROR = 4

/**
 * Vielfaches der typischen Abweichung, ab dem eine Veränderung als
 * nachweisbar gilt: 1,96 · √2. Siehe die Erklärung oben.
 */
export const DETECTION_FACTOR = 1.96 * Math.SQRT2

export type ChangeVerdict =
  /** Grösser als die eigene Streuung, in die bessere Richtung. */
  | 'better'
  /** Grösser als die eigene Streuung, in die schlechtere Richtung. */
  | 'worse'
  /** Innerhalb der eigenen Streuung — kein belegter Unterschied. */
  | 'within_noise'
  /** Zu wenige Messungen, um die Streuung zu kennen. */
  | 'unknown_error'
  /** Es gibt keine Vormessung. */
  | 'first'

export interface ChangeReport {
  verdict: ChangeVerdict
  /** Änderung in Prozent, richtungsbereinigt: positiv heisst besser. */
  changePercent: number | null
  /** Die typische Abweichung dieses Athleten in diesem Test, in Prozent. */
  typicalErrorPercent: number | null
  /** Ab dieser Änderung in Prozent gilt sie als nachweisbar. */
  detectablePercent: number | null
  /** Auf wie vielen Messungen die Schätzung beruht. */
  points: number
  daysSincePrevious: number | null
  previous: StoredResult | null
}

const empty = (verdict: ChangeVerdict, points: number): ChangeReport => ({
  verdict,
  changePercent: null,
  typicalErrorPercent: null,
  detectablePercent: null,
  points,
  daysSincePrevious: null,
  previous: null,
})

/**
 * Typische Abweichung von Messung zu Messung, in Prozent.
 *
 * Gerechnet über die prozentualen Differenzen aufeinanderfolgender Messungen.
 * Der Faktor √2 fällt heraus, weil jede Differenz die Streuung zweier
 * Messungen enthält, gesucht ist aber die einer einzelnen.
 *
 * Die Schätzung enthält zwangsläufig auch echte Veränderung — wer zwischen
 * den Messungen besser wird, erhöht sie. Sie ist damit eher zu gross als zu
 * klein, und das ist die richtige Richtung: lieber eine Veränderung zu
 * vorsichtig als eine erfundene.
 */
export function typicalErrorPercent(results: StoredResult[], testSlug: string): number | null {
  const series = results
    .filter((r) => r.testSlug === testSlug && r.score != null && r.score !== 0)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  if (series.length < MIN_POINTS_FOR_ERROR) return null

  const diffs: number[] = []
  for (let i = 1; i < series.length; i++) {
    const from = series[i - 1].score as number
    const to = series[i].score as number
    diffs.push(((to - from) / Math.abs(from)) * 100)
  }
  const mean = diffs.reduce((sum, d) => sum + d, 0) / diffs.length
  const variance = diffs.reduce((sum, d) => sum + (d - mean) ** 2, 0) / (diffs.length - 1)
  const sd = Math.sqrt(variance)
  const typical = sd / Math.SQRT2
  return Number.isFinite(typical) ? Math.round(typical * 100) / 100 : null
}

/**
 * Die Einordnung einer einzelnen Messung gegenüber der Messung davor.
 *
 * `result` muss aus `results` stammen; verglichen wird mit der letzten
 * Messung desselben Tests, die davor liegt.
 */
export function changeReport(results: StoredResult[], result: StoredResult): ChangeReport {
  const test = getTest(result.testSlug)
  const series = results
    .filter((r) => r.testSlug === result.testSlug && r.score != null)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  if (!test || result.score == null) return empty('unknown_error', series.length)

  const previous = [...series]
    .reverse()
    .find((r) => r.id !== result.id && r.performedAt < result.performedAt)
  if (!previous || previous.score == null || previous.score === 0) {
    return empty('first', series.length)
  }

  const raw = ((result.score - previous.score) / Math.abs(previous.score)) * 100
  const changePercent =
    Math.round((test.direction === 'lower_is_better' ? -raw : raw) * 10) / 10
  const daysSincePrevious = Math.round(
    (new Date(result.performedAt).getTime() - new Date(previous.performedAt).getTime()) /
      86_400_000,
  )

  const typical = typicalErrorPercent(results, result.testSlug)
  if (typical == null) {
    return {
      verdict: 'unknown_error',
      changePercent,
      typicalErrorPercent: null,
      detectablePercent: null,
      points: series.length,
      daysSincePrevious,
      previous,
    }
  }

  const threshold = typical * DETECTION_FACTOR
  const verdict: ChangeVerdict =
    Math.abs(changePercent) <= threshold ? 'within_noise' : changePercent > 0 ? 'better' : 'worse'

  return {
    verdict,
    changePercent,
    typicalErrorPercent: typical,
    detectablePercent: Math.round(threshold * 10) / 10,
    points: series.length,
    daysSincePrevious,
    previous,
  }
}

/**
 * Wie viele Messungen noch fehlen, bis die Streuung geschätzt werden kann.
 * Damit kann die App sagen, was sie braucht, statt nur zu schweigen.
 */
export function missingForError(results: StoredResult[], testSlug: string): number {
  const count = results.filter((r) => r.testSlug === testSlug && r.score != null).length
  return Math.max(0, MIN_POINTS_FOR_ERROR - count)
}
