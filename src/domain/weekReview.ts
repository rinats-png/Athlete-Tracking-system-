import { checkinsOf } from '@/domain/checkin'
import { changeReport, type ChangeReport } from '@/domain/change'
import { loadSum } from '@/domain/diary'
import { overdueTests, type DueTest, type ReminderSettings } from '@/domain/reminders'
import type { StoredDiaryEntry, StoredResult } from '@/lib/store/localStore'

/**
 * Der Wochenrückblick (Produktdoktrin §19): was in den letzten sieben Tagen
 * war, in fünf Zeilen. Nur Beschreibung: keine Streaks, keine Abzeichen, kein
 * «gut gemacht». Die Belastung steht neben dem Mittel der vier Wochen davor,
 * ohne Korridor und ohne Wertung (siehe `diary.acuteChronic`).
 */

export interface WeekReview {
  /** Erster und letzter Tag des Fensters (sieben Tage bis heute). */
  from: string
  to: string
  load: { week: number; previousWeeklyMean: number | null }
  checkinDays: number
  results: number
  /** Die größte belegte Verbesserung einer Messung in diesem Fenster (über der Messschwankung). */
  win: { slug: string; report: ChangeReport } | null
  overdue: DueTest[]
}

const DAY = 86_400_000
const dayOf = (d: Date) => d.toISOString().slice(0, 10)
const shift = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)

export function weekReview(
  input: { diary: StoredDiaryEntry[]; results: StoredResult[]; reminders: ReminderSettings },
  asOf: Date = new Date(),
): WeekReview {
  const to = dayOf(asOf)
  const from = shift(to, -6)
  const week = loadSum(input.diary, to, 7)
  // Die vier Wochen davor: nur mit mindestens 21 erfassten Tagen im Tagebuch ein Mittel.
  const priorEnd = shift(from, -1)
  const priorDays = input.diary.filter((e) => e.day <= priorEnd && e.day > shift(priorEnd, -28)).length
  const previousWeeklyMean = priorDays >= 21 ? Math.round((loadSum(input.diary, priorEnd, 28) / 4) * 10) / 10 : null

  const inWindow = input.results.filter((r) => r.score != null && r.performedAt.slice(0, 10) >= from && r.performedAt.slice(0, 10) <= to)
  const wins = inWindow
    .map((r) => ({ slug: r.testSlug, report: changeReport(input.results, r) }))
    .filter((c) => c.report.verdict === 'better')
    .sort((a, b) => (b.report.changePercent ?? 0) - (a.report.changePercent ?? 0))

  return {
    from,
    to,
    load: { week, previousWeeklyMean },
    checkinDays: new Set(checkinsOf(input.diary).filter((c) => c.day >= from && c.day <= to).map((c) => c.day)).size,
    results: inWindow.length,
    win: wins[0] ?? null,
    overdue: overdueTests(input.results, input.reminders, asOf),
  }
}
