import type { StoredPlanCompletion, StoredTrainingBlock, StoredWorkout } from '@/lib/store/localStore'

/**
 * Satz-Log des Session Players → Trainingslog.
 *
 * Der Player hält fest, was je Satz war (Parametervertrag der Übung). Sätze mit
 * Wiederholungen gehen zusätzlich als Workout ins Trainingslog, damit Verlauf
 * und e1RM sie sehen — verbunden über `diarySessionId` mit der Tagebuch-
 * Einheit, die die Last trägt. Das Workout trägt darum weder Dauer noch RPE:
 * die Last entsteht an genau einer Stelle (Schicht S2).
 *
 * Zeit- und Streckensätze (Halten, Lauf, Schlitten) bleiben nur im Plan:
 * das Trainingslog kennt Gewicht × Wiederholungen, mehr nicht.
 */

export type SetLogEntry = StoredPlanCompletion['sets'][number]

export function workoutFromSets(
  sets: SetLogEntry[],
  ctx: { id: string; day: string; title: string; diarySessionId: string; now: string; newId: () => string; legacyOf: (exerciseId: string) => string | undefined },
): StoredWorkout | null {
  const usable = sets.filter((s) => s.reps != null && s.reps >= 1 && s.reps <= 100)
  if (usable.length === 0) return null
  const groups = new Map<string, SetLogEntry[]>()
  for (const s of usable) {
    const key = `${s.part}:${s.exerciseId ?? s.name}`
    groups.set(key, [...(groups.get(key) ?? []), s])
  }
  const exercises = [...groups.values()].slice(0, 20).map((list) => {
    const first = list[0]
    const legacy = first.exerciseId ? ctx.legacyOf(first.exerciseId) : undefined
    return {
      id: ctx.newId(),
      exerciseKey: legacy ?? 'custom',
      customName: legacy ? '' : first.name.slice(0, 80),
      sets: list
        .sort((a, b) => a.set - b.set)
        .slice(0, 20)
        .map((s) => ({ id: ctx.newId(), weightKg: s.weightKg ?? 0, reps: s.reps as number, rir: s.rir != null && s.rir <= 5 ? s.rir : null })),
    }
  })
  return { id: ctx.id, day: ctx.day, title: ctx.title.slice(0, 60), exercises, durationMin: null, rpe: null, diarySessionId: ctx.diarySessionId, note: '', createdAt: ctx.now, updatedAt: ctx.now }
}

/**
 * Was beim letzten Mal war: die Sätze der jüngsten erledigten Einheit mit
 * dieser Übung (alle Blöcke). Nur Anzeige — der Player schlägt nichts vor,
 * was nicht im Plan steht.
 */
export function lastSetsFor(exerciseId: string, blocks: StoredTrainingBlock[]): { day: string; sets: SetLogEntry[] } | null {
  let best: { day: string; sets: SetLogEntry[] } | null = null
  for (const b of blocks) {
    for (const c of b.completions) {
      const sets = (c.sets ?? []).filter((s) => s.exerciseId === exerciseId)
      if (sets.length > 0 && (!best || c.day > best.day)) best = { day: c.day, sets }
    }
  }
  return best
}

/** Volumen eines Satz-Logs: Summe Gewicht × Wiederholungen (nur Sätze mit beidem). */
export const setVolumeKg = (sets: SetLogEntry[]): number => Math.round(sets.reduce((sum, s) => sum + (s.weightKg != null && s.reps != null ? s.weightKg * s.reps : 0), 0))
