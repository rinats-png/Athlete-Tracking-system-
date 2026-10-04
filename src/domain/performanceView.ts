import { disciplineById, coreSlugs } from '@/data/sportProfiles'
import { confidenceScore, RECENCY_FULL_DAYS } from '@/domain/analytics'
import { changeReport, type ChangeReport } from '@/domain/change'
import { nextTests, type NextTestSuggestion } from '@/domain/nextTest'
import { requirementGap, type RequirementRow } from '@/domain/requirementGap'
import { radarProfile } from '@/lib/scoring'
import type { StoredAthlete, StoredResult, StoredWorkout } from '@/lib/store/localStore'
import type { RadarAxis } from '@/types/domain'

/**
 * Heute und Performance des Athleten (Produktdoktrin §4, §8, §10, §14).
 *
 * Diese Datei sortiert und beschriftet, was die Rechenstellen schon liefern
 * (`radarProfile`, `requirementGap`, `changeReport`, `nextTests`,
 * `confidenceScore`). Sie rechnet keine neue Leistungszahl und urteilt nicht
 * über die Person: «Lücke» heißt immer die größte MESSBARE Lücke im
 * vorhandenen Profil, und eine Veränderung ist nur so stark wie der
 * Messfehler es erlaubt.
 */

export type ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT'

/**
 * Wie belastbar sind die Aussagen für diesen Athleten? (Doktrin §10)
 *
 * Grundlage ist `confidenceScore` mit seinen vier offengelegten Anteilen
 * (Abdeckung, Aktualität, Qualität, Tiefe). Die Stufen sind eine Festlegung
 * der App: ab 70 HIGH, ab 40 MODERATE, darunter LOW; ohne eine einzige
 * bewertete Messung INSUFFICIENT. Es ist dieselbe Grenze wie bei
 * `confidenceLabel` in `metricContract.ts`.
 */
export function dataConfidence(results: StoredResult[], asOf: Date = new Date()): { level: ConfidenceLevel; score: number } {
  const scored = results.filter((r) => r.score != null)
  if (scored.length === 0) return { level: 'INSUFFICIENT', score: 0 }
  const { score } = confidenceScore(results, asOf)
  const level: ConfidenceLevel = score >= 70 ? 'HIGH' : score >= 40 ? 'MODERATE' : 'LOW'
  return { level, score }
}

export interface Coverage {
  /** Kerntests der Hauptsportart, die im Fenster mindestens einmal bewertet gemessen sind. */
  measured: number
  /** Kerntests der Hauptsportart insgesamt. */
  total: number
  missing: string[]
  /** Gemessen, aber älter als die Aktualitätsgrenze der App. */
  stale: string[]
}

/** Das Profil rechnet auf die letzten 18 Monate; die Abdeckung ebenso. */
export const COVERAGE_WINDOW_DAYS = 548

/**
 * Assessment Coverage als ANZAHL («6 von 8 Kerntests»), nie als Prozent
 * (Doktrin §14, §22): ein Prozentwert klänge wie eine Bereitschaft.
 */
export function assessmentCoverage(disciplineId: string | null | undefined, results: StoredResult[], asOf: Date = new Date()): Coverage | null {
  const discipline = disciplineId ? disciplineById(disciplineId) : undefined
  if (!discipline) return null
  const core = coreSlugs(discipline)
  if (core.length === 0) return null
  const now = asOf.getTime()
  const age = (r: StoredResult) => (now - new Date(r.performedAt).getTime()) / 86_400_000
  const missing: string[] = []
  const stale: string[] = []
  let measured = 0
  for (const slug of core) {
    const own = results.filter((r) => r.testSlug === slug && r.score != null && age(r) <= COVERAGE_WINDOW_DAYS)
    if (own.length === 0) {
      missing.push(slug)
      continue
    }
    measured++
    if (Math.min(...own.map(age)) > RECENCY_FULL_DAYS) stale.push(slug)
  }
  return { measured, total: core.length, missing, stale }
}

export interface RecentChange {
  slug: string
  result: StoredResult
  report: ChangeReport
}

/**
 * Die jüngste Veränderung je Test, mit Urteil gegen den Messfehler.
 * Belegte Veränderungen («besser», «schlechter») stehen vor «im Rauschen»;
 * Erstmessungen erscheinen nicht, weil es nichts zu vergleichen gibt.
 */
export function recentChanges(results: StoredResult[], limit = 3): RecentChange[] {
  const latest = new Map<string, StoredResult>()
  for (const r of results) {
    if (r.score == null) continue
    const cur = latest.get(r.testSlug)
    if (!cur || r.performedAt > cur.performedAt) latest.set(r.testSlug, r)
  }
  const all = [...latest.entries()]
    .map(([slug, result]) => ({ slug, result, report: changeReport(results, result) }))
    .filter((c) => c.report.verdict !== 'first')
  const rank = (c: RecentChange) => (c.report.verdict === 'better' || c.report.verdict === 'worse' ? 0 : 1)
  return all.sort((a, b) => rank(a) - rank(b) || b.result.performedAt.localeCompare(a.result.performedAt)).slice(0, limit)
}

export type ReferenceStatus = 'referenced' | 'noReference' | 'unmeasured'

export interface DimensionRow {
  axisId: string
  /** Perzentil gegenüber der Referenz, nur bei `referenced`. */
  score: number | null
  status: ReferenceStatus
  testCount: number
  latestPerformedAt: string | null
  ageDays: number | null
  /** Ob die Achse als offen gilt (hohe Anforderung, Perzentil unter der Referenzmitte). */
  open: boolean
}

/** Die Achsen des Profils mit dem, was zu ihrer Belastbarkeit gehört. */
export function dimensionRows(axes: RadarAxis[], gapRows: RequirementRow[], asOf: Date = new Date()): DimensionRow[] {
  const open = new Set(gapRows.filter((r) => r.open).map((r) => r.axisId))
  return axes.map((a) => ({
    axisId: a.axisId,
    score: a.score,
    status: a.score != null ? 'referenced' : a.hasData ? 'noReference' : 'unmeasured',
    testCount: a.testCount,
    latestPerformedAt: a.latestPerformedAt,
    ageDays: a.latestPerformedAt ? Math.max(0, Math.round((asOf.getTime() - new Date(a.latestPerformedAt).getTime()) / 86_400_000)) : null,
    open: open.has(a.axisId),
  }))
}

export interface AthleteToday {
  hasData: boolean
  confidence: { level: ConfidenceLevel; score: number }
  coverage: Coverage | null
  changes: RecentChange[]
  /** Größte messbare Lücke im vorhandenen Profil — nur wenn eine Achse offen ist. */
  gap: RequirementRow | null
  strongest: RequirementRow | null
  nextTest: NextTestSuggestion | null
  event: { name: string; on: string; daysLeft: number } | null
  workoutToday: StoredWorkout | null
  dimensions: DimensionRow[]
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10)
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000

export function athleteToday(athlete: Pick<StoredAthlete, 'profile' | 'results' | 'workouts'>, asOf: Date = new Date()): AthleteToday {
  const { profile, results } = athlete
  const scored = results.filter((r) => r.score != null)
  const axes = radarProfile(scored, 'population', asOf, profile.disciplineId)
  const gapAll = requirementGap(axes, profile.disciplineId)
  const gap = gapAll.ranked.find((r) => r.open) ?? null
  const strongest = [...gapAll.ranked].filter((r) => r.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null
  const today = dayOf(asOf)
  const comp = profile.competition
  const event = comp && comp.on >= today ? { name: comp.name, on: comp.on, daysLeft: Math.round(dayNumber(comp.on) - dayNumber(today)) } : null
  const suggestions = nextTests(
    {
      disciplineId: profile.disciplineId,
      additionalDisciplineIds: profile.additionalDisciplineIds,
      goalKey: profile.goalKey,
      sex: profile.sex,
      birthDate: profile.birthDate,
      reminderIntervalDays: profile.reminderIntervalDays,
      results,
    },
    asOf,
  )
  return {
    hasData: scored.length > 0,
    confidence: dataConfidence(results, asOf),
    coverage: assessmentCoverage(profile.disciplineId, results, asOf),
    changes: recentChanges(results),
    gap,
    strongest,
    nextTest: suggestions[0] ?? null,
    event,
    workoutToday: athlete.workouts.find((w) => w.day === today) ?? null,
    dimensions: dimensionRows(axes, [...gapAll.ranked, ...gapAll.unmeasured, ...gapAll.unweighted], asOf),
  }
}
