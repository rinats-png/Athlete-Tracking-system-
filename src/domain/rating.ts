import { getTest, type TestDefinition } from '@/data/testCatalog'
import { compareToReferences, type ReferenceComparison } from '@/data/references'
import { ageFromBirthDate } from '@/lib/format'
import type { StoredResult } from '@/lib/store/localStore'
import type { Sex } from '@/types/domain'

/**
 * Die Einordnung eines Messwerts (Konzept §15, §31).
 *
 * DIE DREI TRENNUNGEN
 *
 *   Messwert → Referenz → Interpretation
 *
 * Der Messwert ist, was gemessen wurde. Die Referenz ist eine benannte
 * Gruppe mit Quelle. Die Interpretation ist die Skala
 * Schwach → Durchschnitt → Gut → Sehr gut → Elite. Jede Stufe hier weiss,
 * woraus sie entstanden ist, und ohne Referenz gibt es keine Stufe — dann
 * steht dort «keine zuverlässige Bewertung möglich», nicht eine geratene.
 *
 * WIE AUS EINER REFERENZ EINE STUFE WIRD
 *
 *   Perzentil (aus Mittelwert/SD oder Stützstellen):
 *     < 16      Schwach       (unter −1 SD)
 *     16–50     Durchschnitt
 *     50–84     Gut
 *     84–97,7   Sehr gut      (über +1 SD)
 *     ≥ 97,7    Elite         (über +2 SD)
 *   Die Schwellen sind die ganzzahligen Standardabweichungen einer
 *   Normalverteilung. Sie sind GESETZT, nicht aus den Daten abgeleitet, und
 *   die Oberfläche sagt das.
 *
 *   Publizierte Bänder (etwa der SJFT-Index): das Band der Quelle wird nach
 *   seinem Rang unter den Bändern auf die fünf Stufen abgebildet. Der Name
 *   des Bandes aus der Quelle bleibt daneben stehen.
 *
 *   Ankerwert (ein einzelner Bezugswert): KEINE Stufe. Der Abstand zum
 *   Anker wird gezeigt, mehr gibt die Quelle nicht her.
 *
 * DIE RICHTUNG DES TESTS STECKT IN DER REFERENZ. `compareToReferences` dreht
 * das Vorzeichen bei «kleiner ist besser»; hier wird nichts pauschal als
 * «höher = besser» gerechnet (§31).
 */

export type RatingLevel = 'weak' | 'average' | 'good' | 'very_good' | 'elite'
export const RATING_LEVELS: RatingLevel[] = ['weak', 'average', 'good', 'very_good', 'elite']

/** Perzentil, ab dem die jeweilige Stufe beginnt. Ganzzahlige SD-Abstände. */
export const RATING_THRESHOLDS: { level: RatingLevel; minPercentile: number }[] = [
  { level: 'elite', minPercentile: 97.7 },
  { level: 'very_good', minPercentile: 84.1 },
  { level: 'good', minPercentile: 50 },
  { level: 'average', minPercentile: 15.9 },
  { level: 'weak', minPercentile: 0 },
]

export type RatingBasis = 'percentile' | 'band' | 'none'
export type RatingGap = 'no_value' | 'no_sex' | 'no_age' | 'no_reference' | 'anchor_only'

export interface Rating {
  level: RatingLevel | null
  basis: RatingBasis
  /** Der Vergleich, aus dem die Stufe entstanden ist. */
  comparison: ReferenceComparison | null
  /** Alle weiteren passenden Vergleiche — für Benchmark und Gesellschaftsvergleich. */
  alternatives: ReferenceComparison[]
  /** Warum es keine Stufe gibt. */
  gap: RatingGap | null
  /** Auf welche Kennzahl sich die Einordnung bezieht. */
  metricKey: string | null
}

export function ratingFromPercentile(percentile: number | null): RatingLevel | null {
  if (percentile == null || !Number.isFinite(percentile)) return null
  return RATING_THRESHOLDS.find((t) => percentile >= t.minPercentile)?.level ?? 'weak'
}

/**
 * Bandrang → Stufe. Die Bänder einer Quelle sind aufsteigend nach `upTo`
 * sortiert; bei «kleiner ist besser» ist das erste Band das beste, sonst das
 * letzte. Der Rang vom besten Band aus wird gleichmässig auf die fünf Stufen
 * verteilt — bei drei Bändern also Elite / Gut / Schwach, bei fünf eins zu
 * eins.
 */
export function ratingFromBand(comparison: ReferenceComparison): RatingLevel | null {
  const bands = comparison.entry.bands
  if (!bands || !comparison.band) return null
  const index = bands.indexOf(comparison.band)
  if (index < 0) return null
  const direction = getTest(comparison.entry.testSlug)?.direction
  const lowerIsBetter =
    direction === 'lower_is_better' ||
    // Bei Einträgen für «jeden Test» (testSlug '*') entscheidet die
    // Kennzahl: VO₂max ist höher besser, ein Index meist niedriger.
    (comparison.entry.testSlug === '*' && comparison.entry.metricKey.endsWith('_index'))
  const rankFromBest = lowerIsBetter ? index : bands.length - 1 - index
  const steps = bands.length - 1
  if (steps <= 0) return 'good'
  const levelIndex = Math.round(((steps - rankFromBest) / steps) * (RATING_LEVELS.length - 1))
  return RATING_LEVELS[levelIndex]
}

/** Mittelwert, SD, Bänder und Stützstellen zählen; ein Anker allein nicht. */
function ratable(comparison: ReferenceComparison): boolean {
  return comparison.percentile != null || comparison.band != null
}

/**
 * Welcher Vergleich die Stufe trägt, wenn mehrere passen.
 *
 * Reihenfolge: Athletenkohorte der eigenen Sportart vor Bevölkerung, dann
 * bessere Datenqualität, dann bewertbare Methoden vor Ankerwerten. Die
 * Hauptsportart steht vor den weiteren.
 */
function rank(comparison: ReferenceComparison, disciplineIds: string[]): number {
  const entry = comparison.entry
  let score = 0
  if (entry.cohort === 'athlete') {
    const position = entry.disciplineIds
      ? disciplineIds.findIndex((id) => entry.disciplineIds!.includes(id))
      : -1
    score += position === 0 ? 100 : position > 0 ? 80 : 60
  }
  score += { A: 30, B: 20, C: 10, D: 0 }[entry.quality]
  if (ratable(comparison)) score += 5
  return score
}

export interface RatingContext {
  sex: Sex | null
  birthDate: string | null
  /** Hauptsportart zuerst, dann weitere. */
  disciplineIds: string[]
}

/** Kennzahlen eines Tests in der Reihenfolge, in der eine Referenz gesucht wird. */
function metricKeysFor(test: TestDefinition): string[] {
  const keys = [test.primaryMetric, ...Object.values(test.dimensionMetrics), ...test.derivedMetrics]
  return keys.filter((key, index) => keys.indexOf(key) === index)
}

/**
 * Einordnung eines gespeicherten Ergebnisses.
 *
 * Alter und Geschlecht kommen aus dem Ergebnis selbst, wo sie beim Messen
 * festgehalten wurden — ein Wert von vor drei Jahren wird mit der damaligen
 * Altersklasse verglichen, nicht mit der heutigen.
 */
export function rateResult(result: StoredResult, context: RatingContext): Rating {
  const test = getTest(result.testSlug)
  const empty = (gap: RatingGap): Rating => ({
    level: null,
    basis: 'none',
    comparison: null,
    alternatives: [],
    gap,
    metricKey: null,
  })
  if (!test) return empty('no_reference')

  const sex = result.sex ?? context.sex
  const age = result.ageYears ?? ageFromBirthDate(context.birthDate)

  const comparisons: ReferenceComparison[] = []
  let metricKey: string | null = null
  for (const key of metricKeysFor(test)) {
    const value = result.metrics[key] ?? result.values[key] ?? null
    if (value == null) continue
    for (const disciplineId of context.disciplineIds.length ? context.disciplineIds : [null]) {
      for (const comparison of compareToReferences(
        test.slug,
        key,
        value,
        test.direction,
        sex,
        age,
        disciplineId,
      )) {
        // Derselbe Eintrag kann über zwei Sportarten zweimal passen.
        if (!comparisons.some((c) => c.entry === comparison.entry)) comparisons.push(comparison)
      }
    }
    if (comparisons.length > 0 && metricKey == null) metricKey = key
  }

  if (comparisons.length === 0) {
    if (result.score == null) return empty('no_value')
    if (sex == null || sex === 'other') return empty('no_sex')
    if (age == null) return empty('no_age')
    return empty('no_reference')
  }

  const ordered = [...comparisons].sort(
    (a, b) => rank(b, context.disciplineIds) - rank(a, context.disciplineIds),
  )
  const primary = ordered.find(ratable) ?? null
  if (!primary) {
    return {
      level: null,
      basis: 'none',
      comparison: ordered[0],
      alternatives: ordered.slice(1),
      gap: 'anchor_only',
      metricKey,
    }
  }

  const level = primary.percentile != null ? ratingFromPercentile(primary.percentile) : ratingFromBand(primary)
  return {
    level,
    basis: primary.percentile != null ? 'percentile' : 'band',
    comparison: primary,
    alternatives: ordered.filter((c) => c !== primary),
    gap: null,
    metricKey,
  }
}

/** Kürzel für Listen: die Stufe des jüngsten Ergebnisses eines Tests. */
export function latestRating(
  results: StoredResult[],
  testSlug: string,
  context: RatingContext,
): Rating | null {
  const latest = results
    .filter((r) => r.testSlug === testSlug && r.score != null)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0]
  return latest ? rateResult(latest, context) : null
}
