import type { RadarAxis } from '@/types/domain'

/**
 * Die eine Zahl — und warum sie nie allein stehen darf.
 *
 * Eine Zusammenfassung wie «78» ist das, was ein Nutzer sofort versteht und
 * mit anderen vergleicht. Genau darin liegt die Gefahr: sie mittelt über
 * Achsen, die unterschiedlich gut belegt sind, und sieht dabei präziser aus
 * als alles, woraus sie entsteht. Zwei Menschen mit derselben 78 können
 * völlig verschieden gemessen sein — der eine über sechs Achsen mit
 * Bevölkerungsreferenz, der andere über zwei.
 *
 * Deshalb gilt hier ohne Ausnahme:
 *
 *   1. In die Zahl gehen NUR Achsen ein, die ein Perzentil aus einer
 *      belegten Referenz haben. Eine Achse ohne Referenz zählt nicht als
 *      Null — sie zählt gar nicht.
 *   2. Die Abdeckung wird immer mitgeliefert und ist nie optional. Wer die
 *      Zahl zeigt, zeigt sie mit «aus 4 von 6 Achsen».
 *   3. Unter {@link MIN_AXES_FOR_SCORE} belegten Achsen gibt es keine Zahl.
 *      Ein Mittel aus einer Achse ist keine Zusammenfassung, sondern diese
 *      eine Achse mit einem anderen Namen.
 *
 * Was die Zahl NICHT ist: kein Fitnesswert, keine Bewertung eines Menschen
 * und nichts, was sich zwischen Sportarten vergleichen liesse. Sie ist das
 * Mittel der Perzentile der belegten Achsen, nicht mehr.
 */

/** Unter so vielen belegten Achsen wird keine Zusammenfassung gebildet. */
export const MIN_AXES_FOR_SCORE = 3

export interface PerformanceScore {
  /** Das gerundete Mittel der Perzentile — oder null bei zu wenig Grundlage. */
  value: number | null
  /** Achsen mit belegtem Perzentil. */
  ratedAxes: number
  /** Achsen, die für dieses Profil überhaupt vorgesehen sind. */
  totalAxes: number
  /** Achsen mit Messung, aber ohne Referenz — die Lücke, die zu schliessen wäre. */
  measuredWithoutReference: number
  /** Abdeckung als Anteil 0–1: belegte Achsen von allen vorgesehenen. */
  coverage: number
  /** Die einzelnen Achsen mit ihrem Perzentil, stärkste zuerst. */
  parts: { axisId: string; score: number }[]
}

export function performanceScore(axes: RadarAxis[]): PerformanceScore {
  const rated = axes.filter((a) => a.score != null)
  const measuredWithoutReference = axes.filter((a) => a.hasData && a.score == null).length
  const total = axes.length

  const parts = rated
    .map((a) => ({ axisId: a.axisId, score: Math.round(a.score as number) }))
    .sort((a, b) => b.score - a.score)

  const value =
    rated.length >= MIN_AXES_FOR_SCORE
      ? Math.round(rated.reduce((sum, a) => sum + (a.score as number), 0) / rated.length)
      : null

  return {
    value,
    ratedAxes: rated.length,
    totalAxes: total,
    measuredWithoutReference,
    coverage: total === 0 ? 0 : rated.length / total,
    parts,
  }
}

/**
 * Wie viele belegte Achsen noch fehlen, bis eine Zusammenfassung entsteht.
 * Damit kann die App sagen, was sie braucht, statt nur ein Feld leer zu lassen.
 */
export function missingAxesForScore(axes: RadarAxis[]): number {
  return Math.max(0, MIN_AXES_FOR_SCORE - axes.filter((a) => a.score != null).length)
}
