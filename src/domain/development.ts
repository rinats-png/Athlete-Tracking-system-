import { blockReport, type BlockReport } from '@/domain/trainingBlock'
import type { StoredResult, StoredTrainingBlock } from '@/lib/store/localStore'

/**
 * Langzeitentwicklung über Blöcke (Trainingsbereich Etappe 14).
 *
 * Nur zusammengestellt, nichts vorhergesagt: je Block die Zählung erledigter
 * gegen geplante Einheiten und die Blockmessungen gegen den Messfehler (die
 * Rechnung des Block-Berichts), dazu die erledigten Einheiten je Woche. Ein
 * Block ohne Messung am Ende bleibt offen und zählt nie als Misserfolg. Die
 * Zahl erledigter Einheiten sagt etwas über Beständigkeit, nichts über Erfolg.
 */
const DAY = 86_400_000
const dayNum = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY
const weekdayOf = (day: string) => ((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7) + 1
const mondayOf = (day: string): string => new Date((dayNum(day) - (weekdayOf(day) - 1)) * DAY).toISOString().slice(0, 10)

export interface DevelopmentBlock {
  block: StoredTrainingBlock
  report: BlockReport
  /** Metriken mit Messung am Ende gegen die ohne. */
  measured: number
  open: number
}
export interface WeekCount {
  /** Montag der Woche. */
  weekStart: string
  done: number
}
export interface Development {
  blocks: DevelopmentBlock[]
  weeks: WeekCount[]
  totalDone: number
}

export const DEVELOPMENT_WEEKS = 12

export function developmentOf(blocks: StoredTrainingBlock[], results: StoredResult[], today: string): Development {
  const list = [...blocks].sort((a, b) => b.startDay.localeCompare(a.startDay)).map((block) => {
    const report = blockReport(block, results, today)
    return { block, report, measured: report.metrics.filter((m) => m.status === 'measured').length, open: report.metrics.filter((m) => m.status === 'open').length }
  })
  const thisMonday = mondayOf(today)
  const starts = Array.from({ length: DEVELOPMENT_WEEKS }, (_, i) => new Date((dayNum(thisMonday) - (DEVELOPMENT_WEEKS - 1 - i) * 7) * DAY).toISOString().slice(0, 10))
  const counts = new Map(starts.map((s) => [s, 0]))
  let totalDone = 0
  for (const b of blocks) {
    for (const c of b.completions) {
      totalDone++
      const m = mondayOf(c.day)
      if (counts.has(m)) counts.set(m, (counts.get(m) ?? 0) + 1)
    }
  }
  return { blocks: list, weeks: starts.map((weekStart) => ({ weekStart, done: counts.get(weekStart) ?? 0 })), totalDone }
}
