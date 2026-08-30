import { getTest } from '@/data/testCatalog'
import { assessQuality, isOutlier } from '@/domain/dataQuality'
import { isPersonalBest } from '@/lib/scoring'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Automatische Markierungen je Ergebnis (§70, §71, §72).
 *
 * Jede Markierung ist eine Beobachtung mit Beleg, keine Bewertung. Und
 * bewusst zurückhaltend formuliert: eine Verschlechterung wird genauso
 * neutral benannt wie eine Verbesserung, weil ein Athlet, der nach einer
 * Krankheit misst, keine Ermahnung braucht, sondern eine Zahl.
 *
 * Ausdrücklich KEINE Gamification: kein Konfetti, keine Abzeichen, keine
 * Serien. Eine Bestleistung wird genannt, weil sie eine Information ist.
 */

export type FlagKind =
  | 'personal_best'
  | 'significant_improvement'
  | 'significant_regression'
  | 'insufficient_data'
  | 'submaximal_effort'
  | 'missing_context'
  | 'outlier'
  | 'efficiency_gain'

export interface Flag {
  kind: FlagKind
  /** Werte für die Übersetzung — der Beleg zur Beobachtung. */
  values: Record<string, string | number>
}

/**
 * Ab welcher Veränderung sie als bedeutsam gilt.
 *
 * Fünf Prozent gegenüber der VORHERIGEN Messung desselben Tests. Die
 * Schwelle ist gesetzt und nicht abgeleitet — das steht in der Oberfläche.
 * Sie liegt bewusst über der typischen Tagesform-Schwankung, damit nicht
 * jede Messung eine Meldung erzeugt und die Meldungen dadurch wertlos
 * werden.
 */
export const SIGNIFICANT_CHANGE_PERCENT = 5

/** Unterhalb dieses RPE gilt ein Maximaltest als nicht ausbelastet. */
export const SUBMAXIMAL_RPE = 8

export function flagsFor(result: StoredResult, history: StoredResult[]): Flag[] {
  const test = getTest(result.testSlug)
  const flags: Flag[] = []
  if (!test || result.score == null) return flags

  const earlier = history
    .filter(
      (r) =>
        r.testSlug === result.testSlug &&
        r.id !== result.id &&
        r.score != null &&
        r.performedAt < result.performedAt,
    )
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))

  const previous = earlier[0] ?? null

  if (isPersonalBest(history, result)) {
    flags.push({
      kind: 'personal_best',
      values: previous
        ? {
            previous: previous.score as number,
            changePercent: signedChange(test.direction, previous.score as number, result.score),
          }
        : {},
    })
  }

  if (previous && previous.score !== 0) {
    const change = signedChange(test.direction, previous.score as number, result.score)
    if (change >= SIGNIFICANT_CHANGE_PERCENT) {
      flags.push({ kind: 'significant_improvement', values: { changePercent: change } })
    } else if (change <= -SIGNIFICANT_CHANGE_PERCENT) {
      flags.push({ kind: 'significant_regression', values: { changePercent: change } })
    }

    // §26: Leistung und empfundene Anstrengung zusammen lesen. Mehr Leistung
    // bei geringerem RPE ist die aussagekräftigste Einzelbeobachtung, die
    // sich aus diesen beiden Zahlen machen lässt.
    const rpe = result.values.rpe
    const previousRpe = previous.values.rpe
    if (
      change > 0 &&
      typeof rpe === 'number' &&
      typeof previousRpe === 'number' &&
      rpe < previousRpe
    ) {
      flags.push({
        kind: 'efficiency_gain',
        values: { changePercent: change, rpeDelta: previousRpe - rpe },
      })
    }
  }

  if (earlier.length === 0) {
    flags.push({ kind: 'insufficient_data', values: {} })
  }

  const rpe = result.values.rpe
  if (typeof rpe === 'number' && rpe < SUBMAXIMAL_RPE) {
    flags.push({ kind: 'submaximal_effort', values: { rpe } })
  }

  if (assessQuality(result).status === 'incomplete') {
    flags.push({ kind: 'missing_context', values: {} })
  }

  if (isOutlier(result, history)) {
    flags.push({ kind: 'outlier', values: {} })
  }

  return flags
}

/** Richtungsbereinigte Veränderung in Prozent: positiv heisst besser. */
function signedChange(
  direction: 'higher_is_better' | 'lower_is_better',
  from: number,
  to: number,
): number {
  if (from === 0) return 0
  const raw = ((to - from) / Math.abs(from)) * 100
  return Math.round((direction === 'lower_is_better' ? -raw : raw) * 10) / 10
}

/**
 * Die grösste Verschlechterung im Bestand (§71).
 *
 * Regression wird genauso prominent behandelt wie Fortschritt — der Auftrag
 * verlangt das ausdrücklich, und eine App, die nur Verbesserungen zeigt,
 * ist ein Motivationswerkzeug und keine Diagnostik.
 */
export interface RegressionNotice {
  result: StoredResult
  previous: StoredResult
  changePercent: number
}

export function largestRegression(results: StoredResult[]): RegressionNotice | null {
  let worst: RegressionNotice | null = null

  for (const result of results) {
    const test = getTest(result.testSlug)
    if (!test || result.score == null) continue

    const previous = results
      .filter(
        (r) =>
          r.testSlug === result.testSlug &&
          r.id !== result.id &&
          r.score != null &&
          r.performedAt < result.performedAt,
      )
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0]

    if (!previous || previous.score === 0) continue
    const change = signedChange(test.direction, previous.score as number, result.score)
    if (change > -SIGNIFICANT_CHANGE_PERCENT) continue

    if (!worst || change < worst.changePercent) {
      worst = { result, previous, changePercent: change }
    }
  }

  return worst
}
