import { NORM_DATASET, normPercentile } from '@/data/norms'
import { getTest, TEST_CATALOG } from '@/data/testCatalog'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import type { PerformanceDimension, PerformanceLevel } from '@/types/domain'
import type { AthleteData, StoredResult } from '@/lib/store/localStore'

/**
 * Einordnung eines Messwerts (§14, §15, §17).
 *
 * Ein Perzentil allein sagt einem Athleten wenig — «P82» ist eine Zahl, kein
 * Bild. Ein Band gibt ihr Bedeutung. Entscheidend ist aber, dass das Band
 * nicht mehr behauptet als das Perzentil: es ist eine andere Darstellung
 * derselben Zahl, keine zusätzliche Erkenntnis. Deshalb reist die Herkunft
 * der Referenz immer mit.
 */

/**
 * Perzentilgrenzen der Leistungsbänder.
 *
 * Die Schwellen sind gesetzt, nicht abgeleitet — und das steht auch so in der
 * Oberfläche. Sie folgen der üblichen Aufteilung in Quartile mit einer
 * zusätzlichen Spitzengruppe; jede feinere Stufung wäre bei sechs
 * Stützstellen je Referenzzeile eine Genauigkeit, die die Daten nicht haben.
 */
export const BAND_THRESHOLDS: { level: PerformanceLevel; minPercentile: number }[] = [
  { level: 'elite', minPercentile: 95 },
  { level: 'competitive', minPercentile: 80 },
  { level: 'advanced', minPercentile: 60 },
  { level: 'trained', minPercentile: 35 },
  { level: 'recreational', minPercentile: 0 },
]

export function performanceBand(percentile: number | null): PerformanceLevel | null {
  if (percentile == null || !Number.isFinite(percentile)) return null
  return BAND_THRESHOLDS.find((b) => percentile >= b.minPercentile)?.level ?? 'recreational'
}

export interface BenchmarkVerdict {
  percentile: number | null
  band: PerformanceLevel | null
  /** Warum es kein Perzentil gibt — damit die Leerstelle erklärt ist. */
  missingReason: 'no_sex' | 'no_age' | 'no_reference' | null
  /**
   * Weicht das selbst angegebene Niveau vom Vergleichskollektiv ab? Dann ist
   * das Perzentil zu optimistisch oder zu streng — und der Athlet muss das
   * wissen, statt sich mit der falschen Gruppe zu vergleichen.
   */
  populationMismatch: boolean
  datasetId: string
  validated: boolean
}

/**
 * Perzentil eines Ergebnisses.
 *
 * Gesucht wird NICHT stur unter der primären Kennzahl des Tests: beim
 * Cooper-Test ist die primäre Kennzahl die Laufdistanz, die Referenz liegt
 * aber auf der daraus geschätzten VO2max. Eine Suche allein über
 * `primaryMetric` fand dort nie eine Referenz und zeigte still einen
 * Strich — obwohl eine vorhanden ist.
 *
 * Deshalb: erst die primäre Kennzahl, dann die Kennzahlen, über die der Test
 * auf seine Achsen einzahlt. Der Wert kommt aus Rohwerten und abgeleiteten
 * Werten zusammen, genau wie beim Radar.
 */
export function lookupPercentile(result: StoredResult): number | null {
  const test = getTest(result.testSlug)
  if (!test || result.sex == null || result.sex === 'other' || result.ageYears == null) return null

  const source: Record<string, number> = { ...result.values, ...result.metrics }
  const candidates = [test.primaryMetric, ...Object.values(test.dimensionMetrics)]

  for (const metricKey of candidates) {
    if (!metricKey) continue
    const value = metricKey === test.primaryMetric ? (result.score ?? source[metricKey]) : source[metricKey]
    if (value == null || !Number.isFinite(value)) continue
    const percentile = normPercentile(test.slug, metricKey, result.sex, result.ageYears, value)
    if (percentile != null) return percentile
  }
  return null
}

export function benchmarkResult(
  result: StoredResult,
  profile: AthleteData['profile'],
): BenchmarkVerdict {
  const test = getTest(result.testSlug)
  const base = {
    datasetId: NORM_DATASET.id,
    validated: NORM_DATASET.validated,
    populationMismatch: false,
  }

  if (result.sex == null || result.sex === 'other') {
    return { ...base, percentile: null, band: null, missingReason: 'no_sex' }
  }
  if (result.ageYears == null) {
    return { ...base, percentile: null, band: null, missingReason: 'no_age' }
  }
  if (!test || result.score == null) {
    return { ...base, percentile: null, band: null, missingReason: 'no_reference' }
  }

  const percentile = lookupPercentile(result)

  if (percentile == null) {
    return { ...base, percentile: null, band: null, missingReason: 'no_reference' }
  }

  // Das Vergleichskollektiv sind trainierte Erwachsene. Wer sich selbst im
  // Freizeit- oder im Spitzenbereich verortet, vergleicht sich mit einer
  // anderen Gruppe, als er angehört.
  const mismatch =
    profile.performanceLevel === 'recreational' ||
    profile.performanceLevel === 'competitive' ||
    profile.performanceLevel === 'elite'

  return {
    ...base,
    percentile,
    band: performanceBand(percentile),
    missingReason: null,
    populationMismatch: mismatch,
  }
}

// --- Testabdeckung je Achse (§17) -------------------------------------------

export interface DimensionCoverage {
  dimension: PerformanceDimension
  /** Wie viele der Tests dieser Achse wurden gemessen? */
  measured: number
  available: number
  percent: number
}

/**
 * Abdeckung je Achse in Prozent.
 *
 * Bezugsgrösse ist die Zahl der Tests im Katalog, die auf diese Achse
 * einzahlen. Damit wird sichtbar, was ein Gesamtwert wert ist: 82 Punkte bei
 * 40 % Abdeckung sind eine andere Aussage als 82 bei 100 %.
 */
export function coverageByDimension(results: StoredResult[]): DimensionCoverage[] {
  const measured = new Set(results.filter((r) => r.score != null).map((r) => r.testSlug))

  return PERFORMANCE_DIMENSIONS.map((dimension) => {
    const tests = TEST_CATALOG.filter((t) => dimension in t.dimensionMetrics)
    const hit = tests.filter((t) => measured.has(t.slug)).length
    return {
      dimension,
      measured: hit,
      available: tests.length,
      percent: tests.length === 0 ? 0 : Math.round((hit / tests.length) * 100),
    }
  })
}
