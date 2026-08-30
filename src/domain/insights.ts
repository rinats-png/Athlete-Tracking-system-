import { getTest, TEST_CATALOG } from '@/data/testCatalog'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import { coveredDimensions } from '@/domain/assessment'
import { assessQuality } from '@/domain/dataQuality'
import { confidenceScore, testTrend } from '@/domain/analytics'
import type { PerformanceDimension, RadarAxis } from '@/types/domain'
import type { StoredAssessment, StoredResult } from '@/lib/store/localStore'

/**
 * Ableitungen aus dem Profil.
 *
 * Diese Datei hält sich an drei Grenzen, und alle drei sind harte Grenzen:
 *
 * 1. KEINE MEDIZIN. Kein Befund, keine Diagnose, keine Therapie, keine
 *    Aussage über Gesundheit, Verletzungsrisiko oder Krankheit. Was hier
 *    entsteht, sind Hinweise auf die Datenlage und auf Leistungsunterschiede
 *    zwischen den eigenen Achsen.
 *
 * 2. KEINE ERFUNDENE WISSENSCHAFT. Jeder Hinweis nennt die Regel, aus der er
 *    entstanden ist, und die Messungen, auf denen sie fusst. Es gibt keine
 *    Aussage ohne nachvollziehbare Herleitung und keinen Verweis auf Studien,
 *    die hier nicht hinterlegt sind.
 *
 * 3. KEIN TRAININGSPLAN. BASELINE misst und ordnet ein. Ein Hinweis lautet
 *    «diese Achse liegt deutlich unter deinen übrigen» — nicht «mach dreimal
 *    die Woche Intervalle».
 */

// --- Limiter und Stärken -----------------------------------------------------

export type Evidence = 'strong' | 'moderate' | 'weak'

export interface AxisFinding {
  dimension: PerformanceDimension
  score: number
  /** Abstand zum Mittel der übrigen belegten Achsen, in Punkten. */
  gapToMean: number
  /** Wie viele Messungen tragen diese Achse? */
  measurements: number
  evidence: Evidence
}

/** Ab welchem Abstand zum eigenen Mittel eine Achse überhaupt auffällt. */
export const AXIS_GAP_THRESHOLD = 10

/**
 * Wie stark ist eine Aussage belegt?
 *
 * Ausschliesslich eine Aussage über die Datenmenge, nicht über die
 * Trainingswissenschaft dahinter. Eine Achse mit drei Messungen aus zwei
 * Tests ist besser belegt als eine mit einer einzigen — mehr behauptet
 * diese Einstufung nicht.
 */
function evidenceFrom(measurements: number): Evidence {
  if (measurements >= 3) return 'strong'
  if (measurements === 2) return 'moderate'
  return 'weak'
}

function measurementsPerDimension(results: StoredResult[]): Map<PerformanceDimension, number> {
  const counts = new Map<PerformanceDimension, number>()
  for (const result of results) {
    if (result.score == null) continue
    const test = getTest(result.testSlug)
    if (!test) continue
    for (const dimension of Object.keys(test.dimensionMetrics) as PerformanceDimension[]) {
      counts.set(dimension, (counts.get(dimension) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * Achsen, die deutlich unter den übrigen liegen.
 *
 * Der Vergleich läuft gegen das Mittel der ÜBRIGEN Achsen, nicht gegen das
 * Gesamtmittel: sonst zieht eine schwache Achse ihren eigenen Bezugswert mit
 * nach unten und erscheint schwächer, je einsamer sie dasteht.
 *
 * Ungemessene Achsen erscheinen hier nicht. Eine fehlende Messung ist keine
 * schwache Leistung — dafür gibt es den Hinweis «noch nicht gemessen».
 */
export function limiters(axes: RadarAxis[], results: StoredResult[]): AxisFinding[] {
  return axisFindings(axes, results).filter((f) => f.gapToMean <= -AXIS_GAP_THRESHOLD)
}

/** Achsen, die deutlich über den übrigen liegen. Spiegelbild der Limiter. */
export function strengths(axes: RadarAxis[], results: StoredResult[]): AxisFinding[] {
  return axisFindings(axes, results)
    .filter((f) => f.gapToMean >= AXIS_GAP_THRESHOLD)
    .sort((a, b) => b.gapToMean - a.gapToMean)
}

function axisFindings(axes: RadarAxis[], results: StoredResult[]): AxisFinding[] {
  const scored = axes.filter(
    (a): a is RadarAxis & { score: number } => a.score != null,
  )
  // Unter drei Achsen ist «über» und «unter dem Rest» keine belastbare Aussage:
  // bei zwei Achsen ist die eine immer die schwächere.
  if (scored.length < 3) return []

  const counts = measurementsPerDimension(results)
  const total = scored.reduce((sum, a) => sum + a.score, 0)

  return scored
    .map((axis): AxisFinding => {
      const othersMean = (total - axis.score) / (scored.length - 1)
      const measurements = counts.get(axis.dimension) ?? 0
      return {
        dimension: axis.dimension,
        score: Math.round(axis.score * 10) / 10,
        gapToMean: Math.round((axis.score - othersMean) * 10) / 10,
        measurements,
        evidence: evidenceFrom(measurements),
      }
    })
    .sort((a, b) => a.gapToMean - b.gapToMean)
}

// --- Hinweise ----------------------------------------------------------------

export type RecommendationKind =
  | 'measure_missing_axis'
  | 'retest_stale'
  | 'deepen_axis'
  | 'address_limiter'
  | 'improve_data_quality'
  | 'add_profile_data'

export interface Recommendation {
  kind: RecommendationKind
  /** Kleiner ist wichtiger. Nur Reihenfolge, keine Bewertung. */
  priority: number
  /** Wie gut ist der Hinweis belegt? Bezieht sich auf die Datenlage. */
  evidence: Evidence
  /** Werte für die Übersetzung — die Regel wird in der UI ausformuliert. */
  values: Record<string, string | number>
  /** Konkreter Testvorschlag, sofern die Regel einen nennt. */
  suggestedTestSlugs: string[]
  /** Betroffene Achse, sofern es eine gibt. */
  dimension: PerformanceDimension | null
}

/** Ab wann eine Messung als veraltet gilt und wiederholt werden sollte. */
export const RETEST_AFTER_DAYS = 120

/**
 * Hinweise aus dem Bestand.
 *
 * Jeder Hinweis ist eine Regel, keine Empfehlung im Sinne einer
 * Trainingsberatung. Die Reihenfolge folgt dem Nutzen für die Aussagekraft
 * des Profils: erst was fehlt, dann was veraltet ist, dann was dünn belegt
 * ist, erst danach die inhaltliche Beobachtung.
 *
 * Diese Reihenfolge ist Absicht. Ein Hinweis auf eine schwache Achse ist nur
 * so viel wert wie die Messung dahinter — deshalb kommt die Datenlage zuerst.
 */
export function recommendations(
  axes: RadarAxis[],
  results: StoredResult[],
  profile: { sex: string | null; birthDate: string | null },
  asOf: Date = new Date(),
): Recommendation[] {
  const out: Recommendation[] = []
  const scored = results.filter((r) => r.score != null)

  // 1. Fehlender Vergleichskontext — ohne ihn gibt es keine Perzentile.
  if (profile.sex == null || profile.sex === 'other' || profile.birthDate == null) {
    out.push({
      kind: 'add_profile_data',
      priority: 0,
      evidence: 'strong',
      values: {},
      suggestedTestSlugs: [],
      dimension: null,
    })
  }

  // 2. Ungemessene Achsen.
  const covered = new Set(coveredDimensions(scored))
  for (const dimension of PERFORMANCE_DIMENSIONS) {
    if (covered.has(dimension)) continue
    out.push({
      kind: 'measure_missing_axis',
      priority: 1,
      evidence: 'strong',
      values: {},
      suggestedTestSlugs: testsForDimension(dimension).slice(0, 2),
      dimension,
    })
  }

  // 3. Veraltete Messungen je Test.
  const latestPerTest = new Map<string, StoredResult>()
  for (const result of scored) {
    const current = latestPerTest.get(result.testSlug)
    if (!current || result.performedAt > current.performedAt) {
      latestPerTest.set(result.testSlug, result)
    }
  }
  for (const [testSlug, result] of latestPerTest) {
    const ageDays = Math.round(
      (asOf.getTime() - new Date(result.performedAt).getTime()) / 86_400_000,
    )
    if (ageDays < RETEST_AFTER_DAYS) continue
    out.push({
      kind: 'retest_stale',
      priority: 2,
      evidence: 'strong',
      values: { days: ageDays },
      suggestedTestSlugs: [testSlug],
      dimension: getTest(testSlug)?.dimension ?? null,
    })
  }

  // 4. Achsen mit nur einer Messung — ein Schnappschuss, kein Profil.
  const counts = measurementsPerDimension(scored)
  for (const [dimension, count] of counts) {
    if (count !== 1) continue
    out.push({
      kind: 'deepen_axis',
      priority: 3,
      evidence: 'moderate',
      values: {},
      suggestedTestSlugs: testsForDimension(dimension).slice(0, 2),
      dimension,
    })
  }

  // 5. Messungen mit Vorbehalt.
  const questionable = scored.filter((r) => assessQuality(r).status !== 'valid').length
  if (questionable > 0 && scored.length > 0) {
    out.push({
      kind: 'improve_data_quality',
      priority: 4,
      evidence: 'strong',
      values: { count: questionable, total: scored.length },
      suggestedTestSlugs: [],
      dimension: null,
    })
  }

  // 6. Erst zuletzt die inhaltliche Beobachtung — und nur, wenn sie über eine
  //    einzelne Messung hinaus belegt ist.
  for (const limiter of limiters(axes, scored)) {
    const trend = trendForDimension(scored, limiter.dimension)
    out.push({
      kind: 'address_limiter',
      priority: 5,
      evidence: limiter.evidence,
      values: {
        gap: Math.abs(limiter.gapToMean),
        measurements: limiter.measurements,
        trend: trend ?? 'unknown',
      },
      suggestedTestSlugs: [],
      dimension: limiter.dimension,
    })
  }

  return out.sort((a, b) => a.priority - b.priority)
}

/** Bester verfügbarer Trend über die Tests einer Achse. */
function trendForDimension(
  results: StoredResult[],
  dimension: PerformanceDimension,
): string | null {
  const slugs = [
    ...new Set(
      results
        .map((r) => r.testSlug)
        .filter((slug) => {
          const test = getTest(slug)
          return test != null && dimension in test.dimensionMetrics
        }),
    ),
  ]
  for (const slug of slugs) {
    const trend = testTrend(results, slug)
    if (trend.label !== 'insufficient') return trend.label
  }
  return null
}

/** Tests, die auf eine Achse einzahlen — nach Katalogreihenfolge. */
export function testsForDimension(dimension: PerformanceDimension): string[] {
  return TEST_CATALOG.filter((test) => dimension in test.dimensionMetrics)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((test) => test.slug)
}

// --- Nächster Termin ---------------------------------------------------------

export interface NextAssessmentSuggestion {
  /** ISO-Tag. Null, wenn es noch keine Grundlage gibt. */
  date: string | null
  /** Auf welchen Abstand sich der Vorschlag stützt. */
  intervalDays: number
  /** Woraus der Vorschlag entstanden ist. */
  basis: 'last_assessment' | 'last_result' | 'none'
  /** Liegt der Termin bereits in der Vergangenheit? */
  overdue: boolean
}

/**
 * Vorschlag für den nächsten Testtermin.
 *
 * Der Abstand ist eine Voreinstellung dieser App und keine aus der Literatur
 * abgeleitete Vorgabe: er ist so gewählt, dass zwischen zwei Terminen
 * überhaupt eine Veränderung entstehen kann, die grösser ist als die
 * Messstreuung. Wer anders testen will, testet anders — der Vorschlag steht
 * nicht im Weg.
 */
export const DEFAULT_RETEST_INTERVAL_DAYS = 90

export function nextAssessment(
  assessments: StoredAssessment[],
  results: StoredResult[],
  asOf: Date = new Date(),
  intervalDays: number = DEFAULT_RETEST_INTERVAL_DAYS,
): NextAssessmentSuggestion {
  const lastCompleted = assessments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => b.performedOn.localeCompare(a.performedOn))[0]

  const lastResult = results
    .filter((r) => r.score != null)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0]

  const anchor = lastCompleted?.performedOn ?? lastResult?.performedAt?.slice(0, 10) ?? null
  const basis: NextAssessmentSuggestion['basis'] = lastCompleted
    ? 'last_assessment'
    : lastResult
      ? 'last_result'
      : 'none'

  if (!anchor) return { date: null, intervalDays, basis: 'none', overdue: false }

  const date = new Date(`${anchor}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + intervalDays)
  const iso = date.toISOString().slice(0, 10)

  return { date: iso, intervalDays, basis, overdue: iso < asOf.toISOString().slice(0, 10) }
}

// --- Gesamtbild --------------------------------------------------------------

export interface InsightReport {
  limiters: AxisFinding[]
  strengths: AxisFinding[]
  recommendations: Recommendation[]
  next: NextAssessmentSuggestion
  confidence: ReturnType<typeof confidenceScore>
}

export function buildInsights(
  axes: RadarAxis[],
  results: StoredResult[],
  assessments: StoredAssessment[],
  profile: { sex: string | null; birthDate: string | null },
  asOf: Date = new Date(),
): InsightReport {
  return {
    limiters: limiters(axes, results),
    strengths: strengths(axes, results),
    recommendations: recommendations(axes, results, profile, asOf),
    next: nextAssessment(assessments, results, asOf),
    confidence: confidenceScore(results, asOf),
  }
}
