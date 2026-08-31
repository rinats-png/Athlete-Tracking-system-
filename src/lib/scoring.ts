import { getTest, TEST_CATALOG } from '@/data/testCatalog'
import { normPercentile } from '@/data/norms'
import { compareToReferences } from '@/data/references'
import { GENERAL_AXIS_IDS, axisById } from '@/data/profileAxes'
import { disciplineById } from '@/data/sportProfiles'
import type { PerformanceDimension, RadarAxis, ScoreMode, Sex } from '@/types/domain'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Welche Achsen ein Profil hat, hängt an der Disziplin.
 *
 * Ohne Disziplin sind es die sechs allgemeinen Fähigkeiten; mit Disziplin
 * deren eigenes Set. Gemessen an den Kernbatterien deckte vorher KEINE
 * Disziplin die sechs allgemeinen ab — der Marathon eine —, und die App
 * meldete daraufhin ein unvollständiges Profil. Sie bestrafte damit, dass
 * jemand ihrer eigenen Empfehlung gefolgt war.
 */
export function axisIdsFor(disciplineId: string | null | undefined): string[] {
  const discipline = disciplineId ? disciplineById(disciplineId) : undefined
  return discipline?.axisIds ?? GENERAL_AXIS_IDS
}

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
  /** Kennung der Profilachse — bei den sechs allgemeinen gleich der Fähigkeit. */
  axisId: string
  dimension: PerformanceDimension | null
  testSlug: string
  metricKey: string
  value: number
  performedAt: string
  direction: 'higher_is_better' | 'lower_is_better'
  sex: Sex | null
  ageYears: number | null
}

/**
 * Löst je Ergebnis alle Achsen auf, auf die es einzahlt.
 *
 * Zwei Wege hinein: über die Achsenzuordnung des Tests (die sechs
 * allgemeinen Fähigkeiten) und über Kennzahlen, an denen eine
 * sportartspezifische Achse hängt — etwa die Laufökonomie oder der
 * Griffwert. Eine Kennzahl kann in beiden auftauchen; das ist gewollt, die
 * Achsen sind verschiedene Fragen an dieselbe Messung.
 */
function toMeasurements(results: StoredResult[], axisIds: string[]): Measurement[] {
  const out: Measurement[] = []
  const metricAxes = axisIds
    .map(axisById)
    .filter((a) => a != null && a.source.kind === 'metric')

  for (const result of results) {
    const test = getTest(result.testSlug)
    if (!test) continue
    const source = { ...result.values, ...result.metrics }
    const common = {
      testSlug: test.slug,
      performedAt: result.performedAt,
      sex: result.sex ?? null,
      ageYears: result.ageYears ?? null,
    }

    for (const [dimension, metricKey] of Object.entries(test.dimensionMetrics)) {
      const value = source[metricKey as string]
      if (value == null || !Number.isFinite(value)) continue
      out.push({
        ...common,
        axisId: dimension,
        dimension: dimension as PerformanceDimension,
        metricKey: metricKey as string,
        value,
        direction: test.direction,
      })
    }

    for (const axis of metricAxes) {
      if (axis!.source.kind !== 'metric') continue
      const value = source[axis!.source.metricKey]
      if (value == null || !Number.isFinite(value)) continue
      out.push({
        ...common,
        axisId: axis!.id,
        dimension: null,
        metricKey: axis!.source.metricKey,
        value,
        direction: axis!.source.direction,
      })
    }
  }
  return out
}

export function radarProfile(
  results: StoredResult[],
  mode: ScoreMode,
  asOf: Date = new Date(),
  disciplineId: string | null = null,
): RadarAxis[] {
  const axisIds = axisIdsFor(disciplineId)
  const cutoff = new Date(asOf)
  cutoff.setMonth(cutoff.getMonth() - RADAR_WINDOW_MONTHS)

  const all = toMeasurements(results, axisIds).filter((m) => new Date(m.performedAt) <= asOf)

  // Bestleistung je Test und Achse über die gesamte Historie bis zum Stichtag.
  const best = new Map<string, number>()
  for (const m of all) {
    const key = `${m.testSlug}|${m.axisId}|${m.metricKey}`
    const current = best.get(key)
    const better =
      current == null
        ? m.value
        : m.direction === 'higher_is_better'
          ? Math.max(current, m.value)
          : Math.min(current, m.value)
    best.set(key, better)
  }

  // Zahl der Messungen je Test und Achse — die Grundlage dafür, ob es
  // überhaupt einen Bezug gibt.
  const countPerKey = new Map<string, number>()
  for (const m of all) {
    const key = `${m.testSlug}|${m.axisId}|${m.metricKey}`
    countPerKey.set(key, (countPerKey.get(key) ?? 0) + 1)
  }

  // Aktuellster Wert je Test und Achse innerhalb des Fensters.
  const latest = new Map<string, Measurement>()
  for (const m of all) {
    if (new Date(m.performedAt) < cutoff) continue
    const key = `${m.testSlug}|${m.axisId}`
    const current = latest.get(key)
    if (!current || new Date(m.performedAt) > new Date(current.performedAt)) latest.set(key, m)
  }

  const byAxis = new Map<string, { scores: number[]; latest: string; measured: number }>()
  for (const m of latest.values()) {
    let score: number | null = null
    const key = `${m.testSlug}|${m.axisId}|${m.metricKey}`

    if (mode === 'population') {
      // Erst die belegten Referenzwerte, dann die alte Startbelegung. Eine
      // Kohorte mit Quelle schlägt eine ohne.
      const comparisons = compareToReferences(
        m.testSlug,
        m.metricKey,
        m.value,
        m.direction,
        m.sex,
        m.ageYears,
        disciplineId,
      ).filter((c) => c.percentile != null)
      score =
        comparisons[0]?.percentile ??
        normPercentile(m.testSlug, m.metricKey, m.sex, m.ageYears, m.value)
    } else {
      // Erst ab der zweiten Messung gibt es einen Bezug. Die erste wäre ihr
      // eigener Massstab und stünde immer bei 100 % — ein volles Profil beim
      // allerersten Termin, das nichts bedeutet.
      const measurements = countPerKey.get(key) ?? 0
      const reference = best.get(key)
      if (measurements >= 2 && reference != null && reference > 0 && m.value > 0) {
        score =
          m.direction === 'higher_is_better'
            ? Math.min(100, (m.value / reference) * 100)
            : Math.min(100, (reference / m.value) * 100)
      }
    }

    const entry = byAxis.get(m.axisId) ?? { scores: [], latest: m.performedAt, measured: 0 }
    entry.measured += 1
    if (new Date(m.performedAt) > new Date(entry.latest)) entry.latest = m.performedAt
    if (score != null && Number.isFinite(score)) entry.scores.push(score)
    byAxis.set(m.axisId, entry)
  }

  return axisIds.map((axisId) => {
    const axis = axisById(axisId)
    const dimension = (axis?.source.kind === 'dimension'
      ? axis.source.dimension
      : null) as PerformanceDimension | null
    const entry = byAxis.get(axisId)
    if (!entry) {
      return {
        axisId,
        dimension,
        score: null,
        testCount: 0,
        latestPerformedAt: null,
        hasData: false,
      }
    }
    // Gemessen, aber ohne Einordnung: der Unterschied zwischen «nicht
    // gemessen» und «gemessen, aber kein Bezug vorhanden» ist für den Nutzer
    // wesentlich — im einen Fall fehlt ein Test, im anderen fehlen Daten der
    // Wissenschaft.
    const mean =
      entry.scores.length > 0
        ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
        : null
    return {
      axisId,
      dimension,
      score: mean == null ? null : Math.round(mean * 10) / 10,
      testCount: entry.measured,
      latestPerformedAt: entry.latest,
      hasData: entry.measured > 0,
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
