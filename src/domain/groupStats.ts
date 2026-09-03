import { getTest } from '@/data/testCatalog'
import type { StoredAthlete } from '@/lib/store/localStore'

/**
 * Was eine Gruppe an einer Station gemessen hat.
 *
 * Ein Trainer will nach dem Testtag drei Dinge wissen: wo steht die Gruppe,
 * wie weit liegt sie auseinander, und wer fehlt noch. Bewusst der Median und
 * nicht das Mittel: ein einzelner Ausreisser — ein abgebrochener Versuch, ein
 * vertippter Wert — zieht ein Mittel spürbar, den Median nicht.
 *
 * Die Streuung steht als Spanne zwischen dem 1. und 3. Quartil daneben, aus
 * demselben Grund. Und jede Kennzahl trägt mit, auf wie vielen Athleten sie
 * beruht: eine «Gruppenauswertung» aus zwei Werten ist keine.
 */

/** Unter so vielen Werten wird keine Streuung ausgewiesen. */
export const MIN_FOR_SPREAD = 4

export interface GroupStats {
  testSlug: string
  /** Zahl der Athleten mit Wert an dieser Station. */
  measured: number
  /** Zahl der Athleten in der Gruppe insgesamt. */
  total: number
  median: number | null
  best: number | null
  worst: number | null
  /** 1. und 3. Quartil — null unter {@link MIN_FOR_SPREAD} Werten. */
  q1: number | null
  q3: number | null
}

function quantile(sorted: number[], p: number): number {
  const pos = (sorted.length - 1) * p
  const low = Math.floor(pos)
  const high = Math.ceil(pos)
  if (low === high) return sorted[low]
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low)
}

export function groupStats(
  athletes: StoredAthlete[],
  testSlug: string,
  performedOn: string,
): GroupStats {
  const test = getTest(testSlug)
  const values: number[] = []
  for (const athlete of athletes) {
    const hit = athlete.results.find(
      (r) => r.testSlug === testSlug && r.score != null && r.performedAt.slice(0, 10) === performedOn,
    )
    if (hit?.score != null) values.push(hit.score)
  }

  const empty: GroupStats = {
    testSlug,
    measured: values.length,
    total: athletes.length,
    median: null,
    best: null,
    worst: null,
    q1: null,
    q3: null,
  }
  if (!test || values.length === 0) return empty

  const sorted = [...values].sort((a, b) => a - b)
  const lower = test.direction === 'lower_is_better'
  const round = (n: number) => Math.round(n * 100) / 100

  return {
    ...empty,
    median: round(quantile(sorted, 0.5)),
    best: round(lower ? sorted[0] : sorted[sorted.length - 1]),
    worst: round(lower ? sorted[sorted.length - 1] : sorted[0]),
    q1: sorted.length >= MIN_FOR_SPREAD ? round(quantile(sorted, 0.25)) : null,
    q3: sorted.length >= MIN_FOR_SPREAD ? round(quantile(sorted, 0.75)) : null,
  }
}
