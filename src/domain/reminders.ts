import { getTest } from '@/data/testCatalog'
import { DEFAULT_RETEST_DAYS } from '@/domain/nextTest'
import type { StoredResult } from '@/lib/store/localStore'

/**
 * Erinnerungen an fällige Tests (Konzept §24).
 *
 * Lokal und ohne Server: die App weiss, wann zuletzt gemessen wurde und
 * welchen Abstand jemand eingestellt hat. Daraus entsteht «SJFT wurde seit
 * sechs Wochen nicht mehr getestet» — nicht mehr, nicht weniger.
 *
 * Der vorgeschlagene Abstand kommt aus dem eigenen Verlauf: wer einen Test
 * bisher alle acht Wochen wiederholt hat, bekommt acht Wochen vorgeschlagen.
 * Unter drei Messungen gibt es keinen Vorschlag, weil ein Abstand aus einem
 * einzigen Intervall keiner ist.
 */

export interface DueTest {
  slug: string
  lastPerformedAt: string
  intervalDays: number
  dueOn: string
  /** Positiv = überfällig, negativ = noch Zeit. */
  overdueDays: number
}

export interface ReminderSettings {
  remindersEnabled: boolean
  reminderIntervalDays: Record<string, number>
}

const DAY = 86_400_000

export function intervalFor(slug: string, settings: ReminderSettings): number {
  return settings.reminderIntervalDays[slug] ?? DEFAULT_RETEST_DAYS
}

/** Alle gemessenen Tests mit ihrem Fälligkeitstermin, überfällige zuerst. */
export function dueTests(
  results: StoredResult[],
  settings: ReminderSettings,
  asOf: Date = new Date(),
): DueTest[] {
  const latest = new Map<string, StoredResult>()
  for (const result of results) {
    if (result.score == null || !getTest(result.testSlug)) continue
    const current = latest.get(result.testSlug)
    if (!current || result.performedAt > current.performedAt) latest.set(result.testSlug, result)
  }
  return [...latest.values()]
    .map((result) => {
      const intervalDays = intervalFor(result.testSlug, settings)
      const due = new Date(new Date(result.performedAt).getTime() + intervalDays * DAY)
      return {
        slug: result.testSlug,
        lastPerformedAt: result.performedAt,
        intervalDays,
        dueOn: due.toISOString().slice(0, 10),
        overdueDays: Math.floor((asOf.getTime() - due.getTime()) / DAY),
      }
    })
    .sort((a, b) => b.overdueDays - a.overdueDays)
}

/** Nur die überfälligen — und nur, wenn Erinnerungen eingeschaltet sind. */
export function overdueTests(
  results: StoredResult[],
  settings: ReminderSettings,
  asOf: Date = new Date(),
): DueTest[] {
  if (!settings.remindersEnabled) return []
  return dueTests(results, settings, asOf).filter((d) => d.overdueDays >= 0)
}

export const MIN_RESULTS_FOR_SUGGESTION = 3
export const SUGGESTED_INTERVAL_BOUNDS: [number, number] = [14, 180]

/**
 * Abstand aus dem eigenen Verlauf: der Median der Abstände zwischen den
 * Messungen, auf zwei Wochen bis ein halbes Jahr begrenzt.
 */
export function suggestedIntervalDays(results: StoredResult[], slug: string): number | null {
  const dates = results
    .filter((r) => r.testSlug === slug && r.score != null)
    .map((r) => new Date(r.performedAt).getTime())
    .sort((a, b) => a - b)
  if (dates.length < MIN_RESULTS_FOR_SUGGESTION) return null
  const gaps = dates.slice(1).map((t, i) => (t - dates[i]) / DAY).sort((a, b) => a - b)
  const middle = gaps.length / 2
  const median = gaps.length % 2 === 1 ? gaps[Math.floor(middle)] : (gaps[middle - 1] + gaps[middle]) / 2
  const [min, max] = SUGGESTED_INTERVAL_BOUNDS
  return Math.round(Math.min(max, Math.max(min, median)))
}
