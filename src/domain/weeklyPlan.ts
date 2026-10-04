import { dayLoad } from '@/domain/diary'
import type { StoredDiaryEntry } from '@/lib/store/localStore'

/**
 * Wochenziel gegen Ist (Baustein A3 des Wochenrhythmus).
 *
 * Das Ziel legt der Mensch fest; KYDON schlägt keines vor, rechnet keinen
 * Plan und bewertet nichts. Gezeigt wird nur die Gegenüberstellung von
 * Ziel und Ist je Sieben-Tage-Fenster, jeweils mit der Differenz. Ob zu viel
 * oder zu wenig gut ist, steht nicht dabei (Produktdoktrin: kein Trainingsrat).
 */

export interface WeeklyTarget {
  sessions: number | null
  loadAU: number | null
}

export interface WeekVsTarget {
  /** Erster und letzter Tag des Sieben-Tage-Fensters. */
  from: string
  to: string
  sessions: number
  loadAU: number
  /** Ziel minus Ist ist bewusst nicht gerechnet; die Differenz ist Ist minus Ziel. */
  sessionsDelta: number | null
  loadDelta: number | null
}

const DAY = 86_400_000
const shift = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)

export const hasTarget = (t: WeeklyTarget): boolean => t.sessions != null || t.loadAU != null

/** Die letzten `weeks` Fenster zu je sieben Tagen, das jüngste zuerst. */
export function weeksAgainstTarget(diary: StoredDiaryEntry[], target: WeeklyTarget, asOf: Date = new Date(), weeks = 4): WeekVsTarget[] {
  const today = asOf.toISOString().slice(0, 10)
  const out: WeekVsTarget[] = []
  for (let w = 0; w < weeks; w++) {
    const to = shift(today, -7 * w)
    const from = shift(to, -6)
    const entries = diary.filter((e) => e.day >= from && e.day <= to)
    const sessions = entries.reduce((n, e) => n + e.sessions.length, 0)
    const loadAU = Math.round(entries.reduce((n, e) => n + dayLoad(e), 0))
    out.push({
      from,
      to,
      sessions,
      loadAU,
      sessionsDelta: target.sessions != null ? sessions - target.sessions : null,
      loadDelta: target.loadAU != null ? loadAU - target.loadAU : null,
    })
  }
  return out
}

/** Tage bis zum Wettkampf; negativ = vorbei. */
export function daysTo(day: string, asOf: Date = new Date()): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${asOf.toISOString().slice(0, 10)}T00:00:00Z`)) / DAY)
}
