import type { StoredAssessment, AthleteData, StoredResult } from '@/lib/store/localStore'
import type { AttemptSelection } from '@/lib/store/schema'
import { BATTERY_BY_SLUG, disciplineBattery } from '@/data/testBatteries'
import { getTest } from '@/data/testCatalog'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import type { PerformanceDimension } from '@/types/domain'

/**
 * Diagnostik als Vorgang, nicht als Sammlung von Einzelwerten.
 *
 * Der Unterschied zwischen dieser App und einem Trainingstagebuch liegt genau
 * hier: ein Testtermin hat einen geplanten Umfang, einen Fortschritt und einen
 * Abschluss. Erst dadurch lässt sich später sagen, ob zwei Zeitpunkte
 * überhaupt vergleichbar sind — zwei Termine mit unterschiedlichem Umfang
 * sind es nicht.
 */

export interface AssessmentProgress {
  planned: string[]
  completed: string[]
  /** Geplant, aber noch nicht gemessen. */
  open: string[]
  /** Gemessen, obwohl nicht geplant — zählt zum Termin, nicht zum Plan. */
  additional: string[]
  percent: number
}

export function resultsForAssessment(data: AthleteData, assessmentId: string): StoredResult[] {
  return data.results
    .filter((result) => result.assessmentId === assessmentId)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
}

export function assessmentProgress(
  assessment: StoredAssessment,
  results: StoredResult[],
): AssessmentProgress {
  const planned = assessment.plannedTestSlugs
  const measured = new Set(results.map((r) => r.testSlug))
  const completed = planned.filter((slug) => measured.has(slug))
  const open = planned.filter((slug) => !measured.has(slug))
  const additional = [...measured].filter((slug) => !planned.includes(slug))

  return {
    planned,
    completed,
    open,
    additional,
    // Ohne Plan gibt es keinen Fortschritt in Prozent, sondern nur Messwerte.
    percent: planned.length === 0 ? (measured.size > 0 ? 100 : 0) : Math.round((completed.length / planned.length) * 100),
  }
}

/**
 * Welche Achsen deckt der Termin tatsächlich ab?
 *
 * Nicht dieselbe Frage wie „welche Tests sind gemacht“: ein Test kann auf
 * mehrere Achsen einzahlen, und ein voller Testplan kann trotzdem eine Achse
 * offen lassen. Das muss vor dem Vergleich sichtbar sein.
 */
export function coveredDimensions(results: StoredResult[]): PerformanceDimension[] {
  const covered = new Set<PerformanceDimension>()
  for (const result of results) {
    const test = getTest(result.testSlug)
    if (!test) continue
    for (const dimension of Object.keys(test.dimensionMetrics)) {
      covered.add(dimension as PerformanceDimension)
    }
  }
  return PERFORMANCE_DIMENSIONS.filter((d) => covered.has(d))
}

export function missingDimensions(results: StoredResult[]): PerformanceDimension[] {
  const covered = new Set(coveredDimensions(results))
  return PERFORMANCE_DIMENSIONS.filter((d) => !covered.has(d))
}

/** Vorschlag für den Titel: Batteriename plus Datum, sonst nur das Datum. */
export function defaultAssessmentTitle(
  batterySlug: string | null,
  performedOn: string,
  locale: 'de' | 'en',
): string {
  // Disziplinbatterien stehen nicht in der Liste der festen Batterien —
  // sie entstehen aus dem Profil. Ohne diesen Zweig hiesse ein solcher
  // Termin nur nach dem Datum.
  const battery = batterySlug
    ? (BATTERY_BY_SLUG.get(batterySlug) ?? disciplineBattery(batterySlug.replace(/^discipline:/, '')))
    : undefined
  const date = new Date(`${performedOn}T12:00:00`).toLocaleDateString(
    locale === 'en' ? 'en-GB' : 'de-DE',
    { month: 'short', year: 'numeric' },
  )
  return battery ? `${battery.name[locale]} · ${date}` : date
}

// --- Mehrfachversuche --------------------------------------------------------

export type { AttemptSelection }

/** Für welche Kennzahl die Auswahlregel gilt: die des Testprotokolls. */
export interface AttemptContext {
  /** Feldschlüssel, nach dem sortiert wird (der Leistungswert des Tests). */
  key: string
  direction: 'higher_is_better' | 'lower_is_better'
}

/**
 * Aus mehreren Versuchen einen Datensatz machen.
 *
 * `best` und `worst` liefern einen echten Versuch zurück, samt aller
 * Nebenwerte (Herzfrequenz, RPE) — bei einem Mittelwert wäre die zugehörige
 * Herzfrequenz erfunden. `mean` und `median` mitteln ausschliesslich den
 * Leistungswert und lassen die Nebenwerte des repräsentativsten Versuchs
 * stehen, statt Werte zu erzeugen, die niemand gemessen hat.
 */
export function aggregateAttempts(
  attempts: Record<string, number>[],
  selection: AttemptSelection,
  context: AttemptContext,
): Record<string, number> | null {
  const usable = attempts.filter((a) => Number.isFinite(a[context.key]))
  if (usable.length === 0) return null

  const better = (a: number, b: number) =>
    context.direction === 'higher_is_better' ? a > b : a < b

  const sorted = [...usable].sort((a, b) =>
    better(a[context.key], b[context.key]) ? -1 : better(b[context.key], a[context.key]) ? 1 : 0,
  )

  if (selection === 'best') return { ...sorted[0] }
  if (selection === 'worst') return { ...sorted[sorted.length - 1] }

  const values = usable.map((a) => a[context.key])
  if (selection === 'mean') {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    // Nebenwerte vom Versuch, der dem Mittel am nächsten liegt.
    const closest = usable.reduce((best, a) =>
      Math.abs(a[context.key] - mean) < Math.abs(best[context.key] - mean) ? a : best,
    )
    return { ...closest, [context.key]: mean }
  }

  // Median: bei ungerader Zahl ein echter Versuch, bei gerader das Mittel der
  // beiden mittleren Werte.
  const byValue = [...values].sort((a, b) => a - b)
  const middle = byValue.length / 2
  const median =
    byValue.length % 2 === 1
      ? byValue[Math.floor(middle)]
      : (byValue[middle - 1] + byValue[middle]) / 2
  const closest = usable.reduce((best, a) =>
    Math.abs(a[context.key] - median) < Math.abs(best[context.key] - median) ? a : best,
  )
  return { ...closest, [context.key]: median }
}

/**
 * Welches Feld trägt die Leistung eines Tests?
 *
 * Der Testkatalog nennt die primäre Metrik; bei abgeleiteten Metriken (1RM aus
 * Last und Wiederholungen) ist das kein Eingabefeld. Dann wird nach dem ersten
 * Pflichtfeld sortiert — dem Feld, das der Athlet tatsächlich steigert.
 */
export function attemptContextFor(testSlug: string): AttemptContext | null {
  const test = getTest(testSlug)
  if (!test) return null
  const field =
    test.fields.find((f) => f.key === test.primaryMetric) ??
    test.fields.find((f) => f.required)
  if (!field) return null
  return { key: field.key, direction: test.direction }
}

/**
 * Standardregel je Test.
 *
 * Derzeit für alle Tests der beste Versuch: jeder Test im Katalog fragt nach
 * einer Maximalleistung. Sobald ein Protokoll mit Wiederholbarkeitsanspruch
 * dazukommt (z. B. Sprintserien), gehört hier eine Fallunterscheidung hin —
 * bis dahin wäre sie eine Behauptung ohne Fall.
 */
export function defaultSelectionFor(_testSlug: string): AttemptSelection {
  return 'best'
}
