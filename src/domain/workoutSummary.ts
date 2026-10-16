/**
 * Zusammenfassung nach einer Einheit: was wurde gemacht, und was hat sich
 * gegenüber dem letzten Mal WIRKLICH verändert.
 *
 * JE ÜBUNG EIN WERT: mit Gewicht der beste geschätzte 1RM der Einheit (Epley
 * mit RIR, nur Sätze bis 12 Wiederholungen, `domain/training.ts`), ohne
 * Gewicht die Summe der Wiederholungen. Verglichen wird mit der letzten
 * Einheit derselben Übung im Trainingslog.
 *
 * BESSER NUR GEGEN DEN MESSFEHLER (Regel 7): die Streuung kommt aus der
 * eigenen Reihe dieser Übung (`typicalErrorOfSeries`), das Urteil aus
 * `judgeChange`. Unter vier Einheiten gibt es kein Urteil, nur die Differenz.
 * Der e1RM ist eine Schätzung und heisst in der Oberfläche auch so.
 *
 * Gleiche Übung über Plan und freies Training: die Übungen des Trainingslogs
 * tragen einen Altschlüssel (wenn es einen gibt) oder ihren Namen; der
 * Schlüssel hier folgt derselben Regel (`exerciseKeyOf`).
 *
 * Rein: kein React, kein Speicher, keine Uhr.
 */
import { judgeChange, typicalErrorOfSeries, type ChangeJudgement } from '@/domain/change'
import { E1RM_RELIABLE_MAX_REPS, e1rm } from '@/domain/training'
import type { SetLogEntry } from '@/domain/setLog'
import type { StoredWorkout } from '@/lib/store/localStore'

export type SummaryMetric = 'e1rm' | 'reps'

export interface ExerciseSummary {
  key: string
  name: string
  sets: number
  volumeKg: number
  metric: SummaryMetric
  /** Wert dieser Einheit (kg bzw. Wiederholungen). */
  value: number
  previous: { day: string; value: number } | null
  /** Änderung in Prozent gegenüber der letzten Einheit. */
  changePercent: number | null
  /** Urteil; null ohne Vorwert. */
  verdict: ChangeJudgement | null
  detectablePercent: number | null
  /** Einheiten dieser Übung bisher (für «ab der vierten …»). */
  points: number
}

export interface SessionSummary {
  sets: number
  volumeKg: number
  exercises: ExerciseSummary[]
}

/** Gemeinsamer Schlüssel für Satz-Log und Trainingslog. */
export function exerciseKeyOf(exerciseId: string | null, name: string, legacyOf: (id: string) => string | undefined): string {
  const legacy = exerciseId ? legacyOf(exerciseId) : undefined
  return legacy ? `l:${legacy}` : `n:${name.trim().toLowerCase()}`
}

const workoutKey = (e: StoredWorkout['exercises'][number]) => (e.exerciseKey && e.exerciseKey !== 'custom' ? `l:${e.exerciseKey}` : `n:${e.customName.trim().toLowerCase()}`)

/** Wert einer Übung in einer Einheit: bester e1RM (mit Gewicht) oder Wiederholungen gesamt. */
function valueOf(sets: { weightKg: number | null; reps: number | null; rir: number | null }[]): { metric: SummaryMetric; value: number } | null {
  const loaded = sets.filter((s) => s.weightKg != null && s.weightKg > 0 && s.reps != null && s.reps >= 1 && s.reps <= E1RM_RELIABLE_MAX_REPS)
  if (loaded.length > 0) {
    const best = Math.max(...loaded.map((s) => e1rm({ weightKg: s.weightKg as number, reps: s.reps as number, rir: s.rir })))
    return { metric: 'e1rm', value: Math.round(best * 10) / 10 }
  }
  const reps = sets.reduce((sum, s) => sum + (s.reps != null && s.reps > 0 ? s.reps : 0), 0)
  return reps > 0 ? { metric: 'reps', value: reps } : null
}

export function summarizeSession(sets: SetLogEntry[], history: StoredWorkout[], legacyOf: (id: string) => string | undefined): SessionSummary {
  const groups = new Map<string, { name: string; list: SetLogEntry[] }>()
  for (const s of sets) {
    const key = exerciseKeyOf(s.exerciseId, s.name, legacyOf)
    const g = groups.get(key) ?? { name: s.name, list: [] }
    g.list.push(s)
    groups.set(key, g)
  }
  const ordered = [...history].sort((a, b) => a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt))
  const exercises: ExerciseSummary[] = []
  for (const [key, { name, list }] of groups) {
    const now = valueOf(list)
    if (!now) continue
    const series: { day: string; value: number }[] = []
    for (const w of ordered) {
      const ex = w.exercises.filter((e) => workoutKey(e) === key)
      if (ex.length === 0) continue
      const v = valueOf(ex.flatMap((e) => e.sets.map((x) => ({ weightKg: x.weightKg, reps: x.reps, rir: x.rir }))))
      if (v && v.metric === now.metric) series.push({ day: w.day, value: v.value })
    }
    const previous = series.at(-1) ?? null
    const changePercent = previous && previous.value !== 0 ? Math.round(((now.value - previous.value) / Math.abs(previous.value)) * 1000) / 10 : null
    const te = typicalErrorOfSeries([...series.map((p) => p.value), now.value])
    const judged = changePercent != null ? judgeChange(changePercent, te) : null
    exercises.push({
      key,
      name,
      sets: list.length,
      volumeKg: Math.round(list.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0)),
      metric: now.metric,
      value: now.value,
      previous,
      changePercent,
      verdict: judged?.verdict ?? null,
      detectablePercent: judged?.detectablePercent ?? null,
      points: series.length + 1,
    })
  }
  return { sets: sets.length, volumeKg: exercises.reduce((sum, e) => sum + e.volumeKg, 0), exercises }
}
