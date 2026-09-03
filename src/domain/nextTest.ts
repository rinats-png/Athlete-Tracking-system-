import { getTest, type TestDefinition } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'
import { axisById } from '@/data/profileAxes'
import { referencesForTest } from '@/domain/testModel'
import { UNIVERSAL_TEST_SLUGS } from '@/domain/diagnosticProfile'
import { assessQuality } from '@/domain/dataQuality'
import { radarProfile } from '@/lib/scoring'
import { ageFromBirthDate } from '@/lib/format'
import type { StoredResult } from '@/lib/store/localStore'
import type { GoalKey } from '@/lib/store/schema'
import type { Sex } from '@/types/domain'

/**
 * Der nächste sinnvolle Test (Konzept §25).
 *
 * Das ist kein Zufallsvorschlag und keine Trainingsberatung, sondern eine
 * Rangliste mit ausgewiesenen Gründen. Jeder Grund ist eine Regel über die
 * Datenlage:
 *
 *   never_measured     Der Test fehlt im Profil ganz.
 *   overdue            Die letzte Messung ist älter als der Abstand.
 *   feeds_weak_axis    Der Test zahlt auf die Achse mit dem grössten
 *                      offenen Informationsbedarf ein — leer oder am
 *                      schwächsten belegt — und wurde nicht gerade erst
 *                      gemessen.
 *   questionable_last  Das letzte Ergebnis steht mit Vorbehalt da.
 *   reference          Es gibt eine Referenz für diese Person — der Wert
 *                      lässt sich einordnen, nicht nur speichern.
 *   goal_fit           Das Ziel gewichtet: Wettkampf und Kader ziehen die
 *                      sportartspezifischen Tests vor, Fitness und
 *                      Orientierung die universellen.
 *
 * Die Gewichte sind gesetzt und stehen hier offen; sie sind eine
 * Produktentscheidung, keine Messung.
 */

export type NextTestReason =
  | 'never_measured'
  | 'overdue'
  | 'feeds_weak_axis'
  | 'questionable_last'
  | 'reference'
  | 'goal_fit'
  | 'core'

export interface NextTestSuggestion {
  slug: string
  score: number
  reasons: NextTestReason[]
  lastPerformedAt: string | null
  daysSince: number | null
  /** Die Achse, auf die der Test einzahlt und die Nachschub braucht. */
  weakAxisId: string | null
}

export interface NextTestInput {
  disciplineId: string | null
  additionalDisciplineIds: string[]
  goalKey: GoalKey | null
  sex: Sex | null
  birthDate: string | null
  reminderIntervalDays: Record<string, number>
  results: StoredResult[]
}

/** Nach wie vielen Tagen eine Messung als fällig gilt, wenn nichts anderes gesetzt ist. */
export const DEFAULT_RETEST_DAYS = 42

const WEIGHT = {
  never_measured: 3,
  overdue: 2.5,
  feeds_weak_axis: 2.5,
  questionable_last: 2,
  reference: 1,
  goal_fit: 1,
  core: 1,
} as const

function feedsAxis(test: TestDefinition, axisId: string): boolean {
  const axis = axisById(axisId)
  if (!axis) return false
  if (axis.source.kind === 'dimension') return axis.source.dimension in test.dimensionMetrics
  const key = axis.source.metricKey
  return test.derivedMetrics.includes(key) || test.primaryMetric === key
}

function goalPrefers(goal: GoalKey | null, role: 'sport' | 'universal', slug: string): boolean {
  if (!goal) return false
  if (goal === 'competition' || goal === 'elite' || goal === 'diagnostics') return role === 'sport'
  if (goal === 'fitness' || goal === 'orientation' || goal === 'general_performance')
    return role === 'universal'
  if (goal === 'hyrox') return disciplineById('hyrox')?.tests.some((t) => t.slug === slug) ?? false
  return false
}

export function nextTests(input: NextTestInput, asOf: Date = new Date()): NextTestSuggestion[] {
  const discipline = input.disciplineId ? disciplineById(input.disciplineId) : undefined
  const scored = input.results.filter((r) => r.score != null)
  const age = ageFromBirthDate(input.birthDate)

  // Kandidaten: Tests der Hauptsportart, dazu die universellen.
  const pool = new Map<string, { role: 'sport' | 'universal'; core: boolean }>()
  for (const entry of discipline?.tests ?? []) {
    pool.set(entry.slug, { role: 'sport', core: entry.role === 'core' })
  }
  for (const slug of UNIVERSAL_TEST_SLUGS) {
    if (!pool.has(slug)) pool.set(slug, { role: 'universal', core: false })
  }

  // Die Achse mit dem grössten offenen Bedarf: leer vor schwach belegt.
  const axes = radarProfile(scored, 'population', asOf, input.disciplineId)
  const weakest =
    axes.find((a) => !a.hasData) ??
    [...axes].filter((a) => a.score != null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0] ??
    null

  const latestBySlug = new Map<string, StoredResult>()
  for (const result of scored) {
    const current = latestBySlug.get(result.testSlug)
    if (!current || result.performedAt > current.performedAt) latestBySlug.set(result.testSlug, result)
  }

  const out: NextTestSuggestion[] = []
  for (const [slug, meta] of pool) {
    const test = getTest(slug)
    if (!test) continue
    const reasons: NextTestReason[] = []
    let score = 0
    const latest = latestBySlug.get(slug) ?? null
    const daysSince = latest
      ? Math.floor((asOf.getTime() - new Date(latest.performedAt).getTime()) / 86_400_000)
      : null
    const interval = input.reminderIntervalDays[slug] ?? DEFAULT_RETEST_DAYS

    if (!latest) {
      reasons.push('never_measured')
      score += WEIGHT.never_measured
    } else if (daysSince != null && daysSince >= interval) {
      reasons.push('overdue')
      // Je länger überfällig, desto dringender — aber gedeckelt, sonst
      // verdrängt ein uralter Test jeden fehlenden.
      score += WEIGHT.overdue + Math.min(1.5, daysSince / interval - 1)
    }
    if (latest && assessQuality(latest).status !== 'valid') {
      reasons.push('questionable_last')
      score += WEIGHT.questionable_last
    }
    let weakAxisId: string | null = null
    // Nur, wenn der Test nicht gerade erst gemessen wurde: eine Achse, die
    // vorgestern belegt wurde, braucht keinen Nachschub von demselben Test.
    const freshlyMeasured = daysSince != null && daysSince < interval / 2
    if (weakest && !freshlyMeasured && feedsAxis(test, weakest.axisId)) {
      reasons.push('feeds_weak_axis')
      score += WEIGHT.feeds_weak_axis
      weakAxisId = weakest.axisId
    }
    if (
      referencesForTest(test).some(
        (entry) =>
          (entry.sex === 'all' || entry.sex === input.sex) &&
          (age == null || (age >= entry.ageMin && age <= entry.ageMax)) &&
          (!entry.disciplineIds ||
            [input.disciplineId, ...input.additionalDisciplineIds].some(
              (id) => id != null && entry.disciplineIds!.includes(id),
            )),
      )
    ) {
      reasons.push('reference')
      score += WEIGHT.reference
    }
    if (goalPrefers(input.goalKey, meta.role, slug)) {
      reasons.push('goal_fit')
      score += WEIGHT.goal_fit
    }
    if (meta.core) {
      reasons.push('core')
      score += WEIGHT.core
    }
    if (test.setting === 'lab') score -= 2

    out.push({
      slug,
      score,
      reasons,
      lastPerformedAt: latest?.performedAt ?? null,
      daysSince,
      weakAxisId,
    })
  }

  return out.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
}
