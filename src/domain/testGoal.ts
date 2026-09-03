import { getTest } from '@/data/testCatalog'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Der selbst gesetzte Zielwert eines Tests.
 *
 * Warum das eigene Ziel und nicht «Elite»: für die meisten Sportarten haben
 * wir gar keine Elitereferenz, es stünde also fast nirgends etwas. Und ein
 * Fortschrittsbalken auf einen fremden Bestwert ist bei Jugendlichen ein
 * Anreiz, den diese App nicht setzt. Ein selbst gesetztes Ziel ist
 * erreichbar, und der Fortschritt darauf ist eine ehrliche Aussage: er misst
 * den eigenen Weg, nicht den Abstand zu jemand anderem.
 *
 * Gerechnet wird vom Ausgangspunkt, nicht von null. «72 % erreicht» heisst:
 * 72 % der Strecke zwischen deiner ersten Messung und deinem Ziel. Von null
 * gerechnet stünde bei einer Sprintzeit von 3,4 s mit Ziel 3,2 s immer über
 * 90 %, und der Balken wäre bedeutungslos.
 */

export interface GoalProgress {
  goal: number
  current: number
  /** Die erste Messung dieses Tests — der Ausgangspunkt der Strecke. */
  start: number
  /** 0–100, geklemmt. `null`, wenn Start und Ziel zusammenfallen. */
  percent: number | null
  reached: boolean
  /** Was in der Einheit des Tests noch fehlt; 0 wenn erreicht. */
  remaining: number
}

/**
 * Fortschritt auf das Ziel. `null`, wenn kein Ziel gesetzt ist oder es zu
 * diesem Test noch keine Messung gibt.
 */
export function goalProgress(
  results: StoredResult[],
  testSlug: string,
  goal: number | undefined,
): GoalProgress | null {
  const test = getTest(testSlug)
  if (!test || goal == null || !Number.isFinite(goal)) return null

  const series = results
    .filter((r) => r.testSlug === testSlug && r.score != null)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  if (series.length === 0) return null

  const start = series[0].score as number
  const current = series[series.length - 1].score as number
  const lower = test.direction === 'lower_is_better'

  const reached = lower ? current <= goal : current >= goal
  const span = Math.abs(goal - start)
  const done = Math.abs(current - start)
  // Rückschritt gegenüber dem Start zählt als 0, nicht als negativer Balken.
  const towards = lower ? start - current : current - start
  const percent =
    span === 0 ? null : Math.max(0, Math.min(100, Math.round((towards <= 0 ? 0 : done / span) * 100)))

  return {
    goal,
    current,
    start,
    percent: reached ? 100 : percent,
    reached,
    remaining: reached ? 0 : Math.round(Math.abs(goal - current) * 100) / 100,
  }
}

/**
 * Ist dieser Zielwert überhaupt plausibel?
 *
 * Ein Ziel, das schlechter ist als der aktuelle Wert, ist fast immer ein
 * Vertipper — bei Tests, wo kleiner besser ist, verwechselt man leicht die
 * Richtung. Die App weist darauf hin, verbietet es aber nicht: nach einer
 * Verletzung kann ein niedrigeres Ziel richtig sein.
 */
export function goalLooksReversed(
  results: StoredResult[],
  testSlug: string,
  goal: number,
): boolean {
  const test = getTest(testSlug)
  const latest = results
    .filter((r) => r.testSlug === testSlug && r.score != null)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0]
  if (!test || !latest || latest.score == null) return false
  return test.direction === 'lower_is_better' ? goal > latest.score : goal < latest.score
}
