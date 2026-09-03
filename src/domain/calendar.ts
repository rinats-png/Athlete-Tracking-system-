import { dueTests, type ReminderSettings } from '@/domain/reminders'
import type { StoredAssessment, StoredResult } from '@/lib/store/localStore'

/**
 * Kalenderdaten (Konzept §23): wann getestet wurde, was, und was fällig ist.
 *
 * Reine Datenaufbereitung ohne Zeitzonenakrobatik: der Tag eines Ergebnisses
 * ist der Tag seines Zeitstempels in der Ortszeit des Geräts, so wie er beim
 * Speichern gewählt wurde.
 */

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string
  inMonth: boolean
  results: StoredResult[]
  assessments: StoredAssessment[]
  /** Tests, deren Fälligkeit auf diesen Tag fällt. */
  due: string[]
}

export interface CalendarMonth {
  year: number
  /** 1–12 */
  month: number
  /** Wochen zu je sieben Tagen, Montag zuerst. */
  weeks: CalendarDay[][]
}

function localDay(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function monthCalendar(
  year: number,
  month: number,
  results: StoredResult[],
  assessments: StoredAssessment[],
  settings: ReminderSettings,
  asOf: Date = new Date(),
): CalendarMonth {
  const resultsByDay = new Map<string, StoredResult[]>()
  for (const result of results) {
    const day = localDay(result.performedAt)
    resultsByDay.set(day, [...(resultsByDay.get(day) ?? []), result])
  }
  const assessmentsByDay = new Map<string, StoredAssessment[]>()
  for (const assessment of assessments) {
    assessmentsByDay.set(assessment.performedOn, [
      ...(assessmentsByDay.get(assessment.performedOn) ?? []),
      assessment,
    ])
  }
  const dueByDay = new Map<string, string[]>()
  for (const due of dueTests(results, settings, asOf)) {
    dueByDay.set(due.dueOn, [...(dueByDay.get(due.dueOn) ?? []), due.slug])
  }

  const first = new Date(year, month - 1, 1)
  // Montag = 0 … Sonntag = 6
  const lead = (first.getDay() + 6) % 7
  const start = new Date(year, month - 1, 1 - lead)
  const weeks: CalendarDay[][] = []
  const cursor = new Date(start)
  do {
    const week: CalendarDay[] = []
    for (let i = 0; i < 7; i += 1) {
      const date = localDay(cursor.toISOString())
      week.push({
        date,
        inMonth: cursor.getMonth() === month - 1,
        results: resultsByDay.get(date) ?? [],
        assessments: assessmentsByDay.get(date) ?? [],
        due: dueByDay.get(date) ?? [],
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getMonth() === month - 1)
  return { year, month, weeks }
}
