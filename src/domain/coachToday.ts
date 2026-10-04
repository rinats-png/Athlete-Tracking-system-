import { athleteRows, type AthleteRow, type AttentionReason } from '@/domain/coach'
import { groupHeatmap, type HeatmapCell, type HeatmapColumn } from '@/domain/groupHeatmap'
import type { StoredAthlete, StoredTestDay } from '@/lib/store/localStore'

/**
 * Die Heute-Seite des Trainers (Produktdoktrin §3, §36).
 *
 * Ein Trainer soll in unter einer Minute sehen: wer neu gemessen ist, wer
 * geprüft werden sollte, wer überfällig ist. Diese Datei sortiert nur, was
 * `coach.ts` und `groupHeatmap.ts` schon rechnen — sie rechnet nichts Neues.
 *
 * WAS HIER NICHT STEHT: kein «bereit», kein «Risiko», kein Urteil über eine
 * Person. Die drei Gruppen heißen Aktuell, Zu prüfen, Überfällig und sagen
 * nur etwas über die DATEN: wann zuletzt gemessen wurde und ob ein Verlauf
 * oder die Datenlage zu prüfen ist. Es gibt keine Trainingsfreigabe (§82).
 */

export type StatusBucket = 'current' | 'review' | 'overdue'

export interface TeamStatus {
  current: number
  review: number
  overdue: number
  total: number
}

export interface PriorityAthlete {
  id: string
  name: string
  reason: AttentionReason
  /** Tage seit dem fälligen Termin, nur bei `overdue`. */
  daysOverdue: number | null
}

export interface TodayMatrix {
  disciplineId: string | null
  athletes: { id: string; name: string }[]
  axisIds: string[]
  cells: HeatmapCell[]
}

export interface TodayPattern {
  axisId: string
  openCount: number
  covered: number
  disciplineId: string | null
}

export interface UpcomingTestDay {
  id: string
  title: string
  plannedOn: string
  athletes: number
  stations: number
  firstTestSlug: string | null
}

export interface CoachToday {
  /** Montag und Sonntag der laufenden Woche, `YYYY-MM-DD`. */
  week: { from: string; to: string }
  status: TeamStatus
  priority: PriorityAthlete[]
  matrix: TodayMatrix | null
  pattern: TodayPattern | null
  testDay: UpcomingTestDay | null
}

/** Reihenfolge, in der ein Grund zuerst gezeigt wird, wenn mehrere zutreffen. */
const REASON_RANK: AttentionReason[] = ['declining', 'overdue', 'thin_data', 'no_assessment']

const DAY = 86_400_000
const dayOf = (d: Date): string => d.toISOString().slice(0, 10)
const dayNumber = (day: string): number => Date.parse(`${day}T00:00:00Z`) / DAY

export function bucketOf(row: Pick<AthleteRow, 'attention'>): StatusBucket {
  if (row.attention.includes('overdue') || row.attention.includes('no_assessment')) return 'overdue'
  if (row.attention.includes('declining') || row.attention.includes('thin_data')) return 'review'
  return 'current'
}

export function weekOf(asOf: Date): { from: string; to: string } {
  const day = dayOf(asOf)
  const weekday = (asOf.getUTCDay() + 6) % 7 // Montag = 0
  const from = dayNumber(day) - weekday
  const iso = (n: number) => new Date(n * DAY).toISOString().slice(0, 10)
  return { from: iso(from), to: iso(from + 6) }
}

export const PRIORITY_LIMIT = 3
export const MATRIX_ATHLETES = 5
export const MATRIX_AXES = 4

export function coachToday(athletes: StoredAthlete[], testDays: StoredTestDay[], asOf: Date = new Date()): CoachToday {
  const rows = athleteRows(athletes, asOf)
  const status: TeamStatus = { current: 0, review: 0, overdue: 0, total: rows.length }
  for (const row of rows) status[bucketOf(row)]++

  const today = dayOf(asOf)
  const priority: PriorityAthlete[] = rows
    .filter((r) => r.attention.length > 0)
    .map((r) => {
      const reason = REASON_RANK.find((x) => r.attention.includes(x)) ?? r.attention[0]
      const overdueBy = reason === 'overdue' && r.nextAssessmentOn ? Math.max(0, Math.round(dayNumber(today) - dayNumber(r.nextAssessmentOn))) : null
      return { id: r.id, name: r.name, reason, daysOverdue: overdueBy, count: r.attention.length }
    })
    .sort((a, b) => b.count - a.count || REASON_RANK.indexOf(a.reason) - REASON_RANK.indexOf(b.reason) || a.name.localeCompare(b.name))
    .slice(0, PRIORITY_LIMIT)
    .map(({ count: _count, ...rest }) => rest)

  const group = groupHeatmap(athletes, asOf)[0] ?? null
  let matrix: TodayMatrix | null = null
  let pattern: TodayPattern | null = null
  if (group && group.athletes.length >= 2) {
    const axes = group.columns.filter((c: HeatmapColumn) => c.covered > 0).slice(0, MATRIX_AXES)
    if (axes.length > 0) {
      const people = group.athletes.slice(0, MATRIX_ATHLETES)
      const ids = new Set(people.map((p) => p.id))
      const keep = new Set(axes.map((a) => a.axisId))
      matrix = {
        disciplineId: group.disciplineId,
        athletes: people,
        axisIds: axes.map((a) => a.axisId),
        cells: group.cells.filter((c) => ids.has(c.athleteId) && keep.has(c.axisId)),
      }
    }
    const top = group.patterns[0]
    if (top) pattern = { axisId: top.axisId, openCount: top.openCount, covered: top.covered, disciplineId: group.disciplineId }
  }

  const next = [...testDays].filter((d) => d.plannedOn >= today).sort((a, b) => a.plannedOn.localeCompare(b.plannedOn))[0]
  const testDay: UpcomingTestDay | null = next
    ? { id: next.id, title: next.title, plannedOn: next.plannedOn, athletes: next.athleteIds.length, stations: next.testSlugs.length, firstTestSlug: next.testSlugs[0] ?? null }
    : null

  return { week: weekOf(asOf), status, priority, matrix, pattern, testDay }
}
