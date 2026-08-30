import { getTest, TEST_CATALOG } from '@/data/testCatalog'
import { normPercentile } from '@/data/norms'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import type { PerformanceDimension, RadarAxis, ScoreMode, Sex } from '@/types/domain'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Scoring im Client.
 *
 * Portierung von `public.athlete_radar_profile()` und
 * `public.athlete_radar_delta()`. Beide Seiten müssen dieselben Zahlen
 * liefern — der Test `scoring.spec.ts` prüft die Übereinstimmung an
 * festen Beispielwerten.
 *
 * Zwei Modi:
 *   personal_best  aktueller Wert gegen die eigene Bestleistung (100 = PB)
 *   population     Perzentil gegen die Referenztabelle
 */

/** Betrachtungsfenster: ältere Messungen zählen nicht mehr als "aktuell". */
export const RADAR_WINDOW_MONTHS = 18

interface Measurement {
  dimension: PerformanceDimension
  testSlug: string
  metricKey: string
  value: number
  performedAt: string
  direction: 'higher_is_better' | 'lower_is_better'
  sex: Sex | null
  ageYears: number | null
}

/** Löst je Ergebnis alle Achsen auf, auf die es einzahlt. */
function toMeasurements(results: StoredResult[]): Measurement[] {
  const out: Measurement[] = []
  for (const result of results) {
    const test = getTest(result.testSlug)
    if (!test) continue
    const source = { ...result.values, ...result.metrics }

    for (const [dimension, metricKey] of Object.entries(test.dimensionMetrics)) {
      const value = source[metricKey as string]
      if (value == null || !Number.isFinite(value)) continue
      out.push({
        dimension: dimension as PerformanceDimension,
        testSlug: test.slug,
        metricKey: metricKey as string,
        value,
        performedAt: result.performedAt,
        direction: test.direction,
        sex: result.sex ?? null,
        ageYears: result.ageYears ?? null,
      })
    }
  }
  return out
}

export function radarProfile(
  results: StoredResult[],
  mode: ScoreMode,
  asOf: Date = new Date(),
): RadarAxis[] {
  const cutoff = new Date(asOf)
  cutoff.setMonth(cutoff.getMonth() - RADAR_WINDOW_MONTHS)

  const all = toMeasurements(results).filter((m) => new Date(m.performedAt) <= asOf)

  // Bestleistung je Test und Achse über die gesamte Historie bis zum Stichtag.
  const best = new Map<string, number>()
  for (const m of all) {
    const key = `${m.testSlug}|${m.dimension}|${m.metricKey}`
    const current = best.get(key)
    const better =
      current == null
        ? m.value
        : m.direction === 'higher_is_better'
          ? Math.max(current, m.value)
          : Math.min(current, m.value)
    best.set(key, better)
  }

  // Aktuellster Wert je Test und Achse innerhalb des Fensters.
  const latest = new Map<string, Measurement>()
  for (const m of all) {
    if (new Date(m.performedAt) < cutoff) continue
    const key = `${m.testSlug}|${m.dimension}`
    const current = latest.get(key)
    if (!current || new Date(m.performedAt) > new Date(current.performedAt)) latest.set(key, m)
  }

  const byDimension = new Map<PerformanceDimension, { scores: number[]; latest: string }>()
  for (const m of latest.values()) {
    let score: number | null = null

    if (mode === 'population') {
      score = normPercentile(m.testSlug, m.metricKey, m.sex, m.ageYears, m.value)
    } else {
      const reference = best.get(`${m.testSlug}|${m.dimension}|${m.metricKey}`)
      if (reference != null && reference > 0 && m.value > 0) {
        score =
          m.direction === 'higher_is_better'
            ? Math.min(100, (m.value / reference) * 100)
            : Math.min(100, (reference / m.value) * 100)
      }
    }

    if (score == null || !Number.isFinite(score)) continue
    const entry = byDimension.get(m.dimension) ?? { scores: [], latest: m.performedAt }
    entry.scores.push(score)
    if (new Date(m.performedAt) > new Date(entry.latest)) entry.latest = m.performedAt
    byDimension.set(m.dimension, entry)
  }

  return PERFORMANCE_DIMENSIONS.map((dimension) => {
    const entry = byDimension.get(dimension)
    if (!entry) {
      return { dimension, score: null, testCount: 0, latestPerformedAt: null, hasData: false }
    }
    const mean = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
    return {
      dimension,
      score: Math.round(mean * 10) / 10,
      testCount: entry.scores.length,
      latestPerformedAt: entry.latest,
      hasData: true,
    }
  })
}

/** Mittel der belegten Achsen. Achsen ohne Daten senken den Index nicht. */
export function baselineIndex(axes: RadarAxis[]): number | null {
  const scored = axes.filter((a) => a.score != null)
  if (scored.length === 0) return null
  return scored.reduce((sum, a) => sum + (a.score as number), 0) / scored.length
}

/**
 * Veränderung der Leistung gegenüber dem vorherigen Ergebnis desselben Tests,
 * in Prozent. Bei Zeit-Tests wird das Vorzeichen gedreht, damit "schneller"
 * positiv erscheint.
 */
export function deltaPercent(
  results: StoredResult[],
  result: StoredResult,
): number | null {
  const test = getTest(result.testSlug)
  if (!test) return null

  const history = results
    .filter((r) => r.testSlug === result.testSlug && new Date(r.performedAt) < new Date(result.performedAt))
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())

  const previous = history[0]
  if (!previous || previous.score == null || result.score == null || previous.score === 0) return null

  const raw = ((result.score - previous.score) / Math.abs(previous.score)) * 100
  return Math.round((test.direction === 'lower_is_better' ? -raw : raw) * 10) / 10
}

export function isPersonalBest(results: StoredResult[], result: StoredResult): boolean {
  const test = getTest(result.testSlug)
  if (!test || result.score == null) return false
  const others = results.filter(
    (r) => r.testSlug === result.testSlug && r.id !== result.id && r.score != null,
  )
  if (others.length === 0) return true
  return test.direction === 'higher_is_better'
    ? others.every((r) => (r.score as number) <= (result.score as number))
    : others.every((r) => (r.score as number) >= (result.score as number))
}

export const CATALOG_SLUGS = TEST_CATALOG.map((t) => t.slug)
