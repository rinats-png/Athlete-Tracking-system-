import { getTest } from '@/data/testCatalog'
import { MIN_TREND_POINTS } from '@/domain/analytics'
import { typicalErrorPercent } from '@/domain/change'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Formvorhersage auf einen Stichtag — meist den Wettkampf.
 *
 * DER VORTEIL, DEN DAS BRINGT: wer ohne Diagnostik trainiert, erfährt am
 * Wettkampftag, ob die Form da ist. Wer seine Messungen über die Zeit hat,
 * kann die Gerade durch sie bis zum Stichtag verlängern und sieht zwölf
 * Wochen vorher, wo er landet — solange er noch etwas ändern kann.
 *
 * WIE GERECHNET WIRD: dieselbe Regression wie in `testTrend` (analytics.ts),
 * nur wird die Gerade nicht als Steigung ausgegeben, sondern am Stichtag
 * abgelesen. Um den Punkt liegt ein Band aus der EIGENEN Streuung dieses
 * Athleten in diesem Test (change.ts): ±1,96 typische Abweichungen. Es sagt
 * nicht «so wird es», sondern «innerhalb dieses Bandes lässt sich der Wert
 * am Stichtag von heute aus nicht enger eingrenzen».
 *
 * WAS HIER NICHT PASSIERT: keine Hochrechnung über den doppelten Zeitraum
 * hinaus, den die Messungen abdecken, und nie über ein Jahr — eine Gerade
 * durch drei Frühjahrsmessungen sagt nichts über den Herbst. Die Vorhersage
 * nimmt an, dass sich nichts ändert; genau das ist ihre Aussage: SO endet
 * es, wenn nichts anders wird.
 */

export type ProjectionVerdict =
  /** Genug Messungen, Stichtag in Reichweite. */
  | 'projected'
  /** Weniger als MIN_TREND_POINTS Messungen. */
  | 'too_few'
  /** Stichtag weiter weg als die Messungen tragen. */
  | 'too_far'
  /** Stichtag liegt hinter der letzten Messung zurück oder in der Vergangenheit. */
  | 'past'

export type GoalOutlook = 'reaches' | 'misses' | 'unclear'

export interface FormProjection {
  testSlug: string
  verdict: ProjectionVerdict
  /** Der abgelesene Wert am Stichtag, in der Einheit des Tests. */
  projected: number | null
  /** Unter- und Obergrenze aus der eigenen Streuung. Null, solange sie unbekannt ist. */
  band: [number, number] | null
  /** Die typische Abweichung in Prozent, aus der das Band stammt. */
  typicalErrorPercent: number | null
  /** Letzter gemessener Wert. */
  latest: number | null
  latestPerformedAt: string | null
  points: number
  spanDays: number
  daysAhead: number
  /** Bestimmtheitsmass der Geraden — wie gut sie die Punkte überhaupt beschreibt. */
  rSquared: number | null
  /** Gegen den eigenen Zielwert, falls gesetzt. */
  goal: number | null
  goalOutlook: GoalOutlook | null
}

/** Über das Wievielfache des Messzeitraums hinaus nicht mehr hochgerechnet wird. */
export const MAX_HORIZON_FACTOR = 2
/** Absolute Obergrenze des Horizonts in Tagen. */
export const MAX_HORIZON_DAYS = 365
/** Breite des Bandes in typischen Abweichungen (zweiseitig 95 %). */
export const BAND_Z = 1.96

const empty = (
  testSlug: string,
  verdict: ProjectionVerdict,
  points: number,
  extra: Partial<FormProjection> = {},
): FormProjection => ({
  testSlug,
  verdict,
  projected: null,
  band: null,
  typicalErrorPercent: null,
  latest: null,
  latestPerformedAt: null,
  points,
  spanDays: 0,
  daysAhead: 0,
  rSquared: null,
  goal: null,
  goalOutlook: null,
  ...extra,
})

export function projectForm(
  results: StoredResult[],
  testSlug: string,
  targetDay: string,
  goal: number | null | undefined = null,
  asOf: Date = new Date(),
): FormProjection {
  const test = getTest(testSlug)
  const series = results
    .filter((r) => r.testSlug === testSlug && r.score != null)
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
  const points = series.length
  if (!test) return empty(testSlug, 'too_few', points)

  const latest = series[points - 1] ?? null
  const target = new Date(`${targetDay}T12:00:00.000Z`).getTime()
  const daysAhead = Math.round((target - asOf.getTime()) / 86_400_000)
  const base = {
    latest: latest?.score ?? null,
    latestPerformedAt: latest?.performedAt ?? null,
    goal: goal ?? null,
    daysAhead,
  }

  if (points < MIN_TREND_POINTS) return empty(testSlug, 'too_few', points, base)
  if (daysAhead < 0 || (latest && target < new Date(latest.performedAt).getTime())) {
    return empty(testSlug, 'past', points, base)
  }

  const t0 = new Date(series[0].performedAt).getTime()
  const days = series.map((r) => (new Date(r.performedAt).getTime() - t0) / 86_400_000)
  const values = series.map((r) => r.score as number)
  const spanDays = Math.round(days[days.length - 1])
  if (spanDays <= 0) return empty(testSlug, 'too_few', points, base)

  const horizonFromLast = (target - new Date(latest!.performedAt).getTime()) / 86_400_000
  if (horizonFromLast > Math.min(spanDays * MAX_HORIZON_FACTOR, MAX_HORIZON_DAYS)) {
    return empty(testSlug, 'too_far', points, { ...base, spanDays })
  }

  const n = days.length
  const meanX = days.reduce((a, b) => a + b, 0) / n
  const meanY = values.reduce((a, b) => a + b, 0) / n
  const sxx = days.reduce((sum, x) => sum + (x - meanX) ** 2, 0)
  const sxy = days.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0)
  const syy = values.reduce((sum, y) => sum + (y - meanY) ** 2, 0)
  if (sxx === 0) return empty(testSlug, 'too_few', points, base)

  const slope = sxy / sxx
  const intercept = meanY - slope * meanX
  const xTarget = (target - t0) / 86_400_000
  const projected = Math.round((intercept + slope * xTarget) * 100) / 100
  const rSquared = syy === 0 ? 1 : Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy)))

  const typical = typicalErrorPercent(results, testSlug)
  const band: [number, number] | null =
    typical == null
      ? null
      : [
          Math.round(projected * (1 - (BAND_Z * typical) / 100) * 100) / 100,
          Math.round(projected * (1 + (BAND_Z * typical) / 100) * 100) / 100,
        ]

  let goalOutlook: GoalOutlook | null = null
  if (goal != null && Number.isFinite(goal)) {
    const lower = test.direction === 'lower_is_better'
    if (band) {
      // Erst wenn das ganze Band auf einer Seite des Ziels liegt, ist die
      // Aussage belastbar; sonst bleibt sie offen — und sagt das auch.
      const [lo, hi] = band
      if (lower ? hi <= goal : lo >= goal) goalOutlook = 'reaches'
      else if (lower ? lo > goal : hi < goal) goalOutlook = 'misses'
      else goalOutlook = 'unclear'
    } else {
      goalOutlook = 'unclear'
    }
  }

  return {
    testSlug,
    verdict: 'projected',
    projected,
    band,
    typicalErrorPercent: typical,
    latest: latest!.score,
    latestPerformedAt: latest!.performedAt,
    points,
    spanDays,
    daysAhead,
    rSquared: Math.round(rSquared * 1000) / 1000,
    goal: goal ?? null,
    goalOutlook,
  }
}

/**
 * Die Tests, für die sich zum Stichtag überhaupt etwas ablesen lässt —
 * zuerst die, deren Gerade die Punkte am besten beschreibt.
 */
export function projectableTests(
  results: StoredResult[],
  targetDay: string,
  goals: Record<string, number> = {},
  asOf: Date = new Date(),
): FormProjection[] {
  const slugs = [...new Set(results.filter((r) => r.score != null).map((r) => r.testSlug))]
  return slugs
    .map((slug) => projectForm(results, slug, targetDay, goals[slug], asOf))
    .filter((p) => p.verdict === 'projected')
    .sort((a, b) => (b.rSquared ?? 0) - (a.rSquared ?? 0) || b.points - a.points)
}
