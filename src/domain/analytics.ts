import { getTest } from '@/data/testCatalog'
import { normPercentile } from '@/data/norms'
import { PERFORMANCE_DIMENSIONS } from '@/types/domain'
import { assessQuality } from '@/domain/dataQuality'
import { coveredDimensions } from '@/domain/assessment'
import type { PerformanceDimension } from '@/types/domain'
import type { StoredAssessment, AthleteData, StoredResult } from '@/lib/store/localStore'

/**
 * Auswertung über die Zeit.
 *
 * Grundregel dieser Datei: keine Aussage ohne ausgewiesene Grundlage. Jede
 * Kennzahl trägt mit, auf wie vielen Messungen und welchem Zeitraum sie
 * beruht — und liefert lieber „zu wenig Daten“ als eine Zahl, die belastbar
 * aussieht und es nicht ist. Zwei Messpunkte ergeben immer eine perfekte
 * Gerade; ein Trend ist das nicht.
 */

// --- Trend -------------------------------------------------------------------

export type TrendLabel = 'improving' | 'stable' | 'declining' | 'insufficient'

export interface Trend {
  label: TrendLabel
  /** Änderung in Prozent je 30 Tage, richtungsbereinigt (positiv = besser). */
  percentPer30Days: number | null
  /** Bestimmtheitsmass der Regression, 0–1. Niedrig = stark streuend. */
  rSquared: number | null
  points: number
  spanDays: number
  firstPerformedAt: string | null
  lastPerformedAt: string | null
}

/** Ab wie vielen Messungen eine Regression überhaupt etwas aussagt. */
export const MIN_TREND_POINTS = 3
/** Unterhalb dieser Änderung je 30 Tage gilt die Leistung als stabil. */
export const TREND_STABLE_BAND_PERCENT = 0.5

const emptyTrend = (points: number): Trend => ({
  label: 'insufficient',
  percentPer30Days: null,
  rSquared: null,
  points,
  spanDays: 0,
  firstPerformedAt: null,
  lastPerformedAt: null,
})

/**
 * Trend eines Tests über seine Historie.
 *
 * Lineare Regression über die Zeit, nicht „letzter gegen vorletzter Wert“:
 * ein einzelner schlechter Tag würde sonst einen Aufwärtstrend in einen
 * Abwärtstrend verwandeln. Das Bestimmtheitsmass wird mitgeliefert, damit
 * sichtbar bleibt, wie gut die Gerade die Punkte überhaupt beschreibt.
 */
export function testTrend(results: StoredResult[], testSlug: string): Trend {
  const test = getTest(testSlug)
  const series = results
    .filter((r) => r.testSlug === testSlug && r.score != null)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))

  if (!test || series.length < MIN_TREND_POINTS) return emptyTrend(series.length)

  const t0 = new Date(series[0].performedAt).getTime()
  const days = series.map((r) => (new Date(r.performedAt).getTime() - t0) / 86_400_000)
  const values = series.map((r) => r.score as number)

  const spanDays = days[days.length - 1]
  // Alle Messungen am selben Tag: kein Zeitverlauf, also kein Trend.
  if (spanDays <= 0) return emptyTrend(series.length)

  const n = days.length
  const meanX = days.reduce((a, b) => a + b, 0) / n
  const meanY = values.reduce((a, b) => a + b, 0) / n
  const sxx = days.reduce((sum, x) => sum + (x - meanX) ** 2, 0)
  const sxy = days.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0)
  if (sxx === 0 || meanY === 0) return emptyTrend(series.length)

  const slopePerDay = sxy / sxx
  const syy = values.reduce((sum, y) => sum + (y - meanY) ** 2, 0)
  const rSquared = syy === 0 ? 1 : Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy)))

  // Steigung als Prozent des Mittelwerts, damit Sekunden und Kilogramm
  // vergleichbar werden. Bei „niedriger ist besser“ dreht das Vorzeichen.
  const rawPercent = ((slopePerDay * 30) / Math.abs(meanY)) * 100
  const percentPer30Days =
    Math.round((test.direction === 'lower_is_better' ? -rawPercent : rawPercent) * 100) / 100

  const label: TrendLabel =
    Math.abs(percentPer30Days) < TREND_STABLE_BAND_PERCENT
      ? 'stable'
      : percentPer30Days > 0
        ? 'improving'
        : 'declining'

  return {
    label,
    percentPer30Days,
    rSquared: Math.round(rSquared * 1000) / 1000,
    points: n,
    spanDays: Math.round(spanDays),
    firstPerformedAt: series[0].performedAt,
    lastPerformedAt: series[series.length - 1].performedAt,
  }
}

// --- Baseline gegen aktuell --------------------------------------------------

export interface BaselineComparison {
  testSlug: string
  baseline: StoredResult
  current: StoredResult
  /** Richtungsbereinigt: positiv heisst besser geworden. */
  changePercent: number | null
  daysBetween: number
}

/**
 * Erste gegen letzte Messung je Test.
 *
 * Das ist die Frage, die ein Athlet nach einem Jahr stellt: bin ich besser
 * geworden? Nicht der Trend, sondern der Abstand zwischen Ausgangspunkt und
 * heute — und ausdrücklich mit dem Zeitraum daneben, denn 4 % in acht Wochen
 * und 4 % in zwei Jahren sind nicht dieselbe Aussage.
 */
export function baselineComparisons(results: StoredResult[]): BaselineComparison[] {
  const bySlug = new Map<string, StoredResult[]>()
  for (const result of results) {
    if (result.score == null) continue
    const list = bySlug.get(result.testSlug) ?? []
    list.push(result)
    bySlug.set(result.testSlug, list)
  }

  const out: BaselineComparison[] = []
  for (const [testSlug, list] of bySlug) {
    if (list.length < 2) continue
    const test = getTest(testSlug)
    if (!test) continue
    const sorted = [...list].sort((a, b) => a.performedAt.localeCompare(b.performedAt))
    const baseline = sorted[0]
    const current = sorted[sorted.length - 1]
    const from = baseline.score as number
    const to = current.score as number

    const raw = from === 0 ? null : ((to - from) / Math.abs(from)) * 100
    out.push({
      testSlug,
      baseline,
      current,
      changePercent:
        raw == null
          ? null
          : Math.round((test.direction === 'lower_is_better' ? -raw : raw) * 10) / 10,
      daysBetween: Math.round(
        (new Date(current.performedAt).getTime() - new Date(baseline.performedAt).getTime()) /
          86_400_000,
      ),
    })
  }
  return out.sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
}

// --- Terminvergleich ---------------------------------------------------------

export interface AssessmentComparisonRow {
  testSlug: string
  before: StoredResult | null
  after: StoredResult | null
  changePercent: number | null
  /** Nur in einem der beiden Termine gemessen — nicht vergleichbar. */
  onlyIn: 'before' | 'after' | null
}

/**
 * Zwei Termine nebeneinander.
 *
 * Tests, die nur in einem der beiden Termine vorkommen, werden nicht
 * weggelassen, sondern als solche gekennzeichnet. Ein Vergleich, der still
 * die Schnittmenge bildet, lässt einen Termin besser aussehen, als er war.
 */
export function compareAssessments(
  data: AthleteData,
  beforeId: string,
  afterId: string,
): AssessmentComparisonRow[] {
  const before = data.results.filter((r) => r.assessmentId === beforeId)
  const after = data.results.filter((r) => r.assessmentId === afterId)
  const slugs = [...new Set([...before, ...after].map((r) => r.testSlug))]

  return slugs
    .map((testSlug): AssessmentComparisonRow => {
      const test = getTest(testSlug)
      const b = before.find((r) => r.testSlug === testSlug) ?? null
      const a = after.find((r) => r.testSlug === testSlug) ?? null

      let changePercent: number | null = null
      if (test && b?.score != null && a?.score != null && b.score !== 0) {
        const raw = ((a.score - b.score) / Math.abs(b.score)) * 100
        changePercent = Math.round((test.direction === 'lower_is_better' ? -raw : raw) * 10) / 10
      }

      return {
        testSlug,
        before: b,
        after: a,
        changePercent,
        onlyIn: b && !a ? 'before' : a && !b ? 'after' : null,
      }
    })
    .sort((x, y) => (y.changePercent ?? -Infinity) - (x.changePercent ?? -Infinity))
}

/** Die beiden jüngsten abgeschlossenen Termine — der übliche Vergleich. */
export function latestComparablePair(
  assessments: StoredAssessment[],
): [StoredAssessment, StoredAssessment] | null {
  const completed = assessments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => b.performedOn.localeCompare(a.performedOn))
  if (completed.length < 2) return null
  return [completed[1], completed[0]]
}

// --- Belastbarkeit des Profils ----------------------------------------------

export interface ConfidenceComponent {
  key: 'coverage' | 'recency' | 'quality' | 'depth'
  /** 0–1. */
  value: number
  /** Menschenlesbarer Beleg, z. B. „4 von 6 Achsen“. */
  detail: Record<string, number>
}

export interface ConfidenceScore {
  /** 0–100. Nur die Summe der offengelegten Komponenten, kein Geheimrezept. */
  score: number
  components: ConfidenceComponent[]
}

/** Ab wann eine Messung als veraltet gilt (Monate). */
export const RECENCY_FULL_DAYS = 90
export const RECENCY_ZERO_DAYS = 540

/**
 * Wie belastbar ist das Profil?
 *
 * Vier offengelegte Komponenten zu gleichen Teilen. Bewusst kein gewichtetes
 * Modell: eine Gewichtung, die niemand begründen kann, ist eine erfundene
 * Genauigkeit. Wer den Wert nicht nachrechnen kann, soll ihm nicht glauben
 * müssen — deshalb liefert die Funktion die Bestandteile mit.
 */
export function confidenceScore(
  results: StoredResult[],
  asOf: Date = new Date(),
): ConfidenceScore {
  const scored = results.filter((r) => r.score != null)

  // 1. Abdeckung: wie viele der sechs Achsen sind überhaupt belegt?
  const covered = coveredDimensions(scored).length
  const coverage = covered / PERFORMANCE_DIMENSIONS.length

  // 2. Aktualität: wie alt ist die jüngste Messung?
  const latest = scored.reduce<string | null>(
    (acc, r) => (acc == null || r.performedAt > acc ? r.performedAt : acc),
    null,
  )
  const ageDays =
    latest == null
      ? Infinity
      : Math.max(0, (asOf.getTime() - new Date(latest).getTime()) / 86_400_000)
  const recency =
    ageDays <= RECENCY_FULL_DAYS
      ? 1
      : ageDays >= RECENCY_ZERO_DAYS
        ? 0
        : 1 - (ageDays - RECENCY_FULL_DAYS) / (RECENCY_ZERO_DAYS - RECENCY_FULL_DAYS)

  // 3. Qualität: Anteil der Messungen ohne Vorbehalt.
  const valid = scored.filter((r) => assessQuality(r).status === 'valid').length
  const quality = scored.length === 0 ? 0 : valid / scored.length

  // 4. Tiefe: gibt es je Achse mehr als eine Messung? Ein einzelner Wert je
  //    Achse ist ein Schnappschuss, kein Profil.
  const perDimension = new Map<PerformanceDimension, number>()
  for (const result of scored) {
    const test = getTest(result.testSlug)
    if (!test) continue
    for (const dimension of Object.keys(test.dimensionMetrics) as PerformanceDimension[]) {
      perDimension.set(dimension, (perDimension.get(dimension) ?? 0) + 1)
    }
  }
  const deepEnough = [...perDimension.values()].filter((count) => count >= 2).length
  const depth = covered === 0 ? 0 : deepEnough / PERFORMANCE_DIMENSIONS.length

  const components: ConfidenceComponent[] = [
    { key: 'coverage', value: coverage, detail: { covered, total: PERFORMANCE_DIMENSIONS.length } },
    {
      key: 'recency',
      value: recency,
      detail: { days: Number.isFinite(ageDays) ? Math.round(ageDays) : -1 },
    },
    { key: 'quality', value: quality, detail: { valid, total: scored.length } },
    {
      key: 'depth',
      value: depth,
      detail: { deepEnough, total: PERFORMANCE_DIMENSIONS.length },
    },
  ]

  const score = Math.round(
    (components.reduce((sum, c) => sum + c.value, 0) / components.length) * 100,
  )
  return { score, components }
}

// --- Ausgewogenheit ----------------------------------------------------------

export interface BalanceReport {
  /** 0–100. 100 = alle belegten Achsen gleich stark. */
  balance: number | null
  strongest: { dimension: PerformanceDimension; score: number } | null
  weakest: { dimension: PerformanceDimension; score: number } | null
  /** Abstand zwischen stärkster und schwächster Achse in Punkten. */
  spread: number | null
  /** Achsen ohne Daten — sie gehen NICHT in die Balance ein. */
  unmeasured: PerformanceDimension[]
}

/**
 * Ausgewogenheit über die belegten Achsen.
 *
 * Ungemessene Achsen zählen ausdrücklich nicht als „schwach“. Wer nur Kraft
 * getestet hat, ist nicht unausgewogen — über seine Ausdauer ist schlicht
 * nichts bekannt, und diese beiden Aussagen dürfen nicht dieselbe Zahl
 * ergeben.
 */
export function performanceBalance(
  axes: { dimension: PerformanceDimension; score: number | null }[],
): BalanceReport {
  const scored = axes.filter(
    (a): a is { dimension: PerformanceDimension; score: number } => a.score != null,
  )
  const unmeasured = axes.filter((a) => a.score == null).map((a) => a.dimension)

  if (scored.length < 2) {
    return { balance: null, strongest: null, weakest: null, spread: null, unmeasured }
  }

  const sorted = [...scored].sort((a, b) => b.score - a.score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]
  const spread = Math.round((strongest.score - weakest.score) * 10) / 10

  // Die Skala ist 0–100, ein Abstand von 100 ist das Maximum an Unwucht.
  return {
    balance: Math.round(Math.max(0, 100 - spread) * 10) / 10,
    strongest,
    weakest,
    spread,
    unmeasured,
  }
}

// --- Perzentilverlauf --------------------------------------------------------

/**
 * Perzentil eines Ergebnisses gegen die Referenztabelle, sofern vorhanden.
 *
 * Ausgelagert, weil drei Bildschirme dieselbe Frage stellen und keiner davon
 * eine eigene Antwort geben darf.
 */
export function resultPercentile(result: StoredResult): number | null {
  const test = getTest(result.testSlug)
  if (!test || result.score == null) return null
  return normPercentile(test.slug, test.primaryMetric, result.sex, result.ageYears, result.score)
}
