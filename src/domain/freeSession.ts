/**
 * Freies Training: eine Einheit ohne Termin im Plan.
 *
 * Drei Wege führen hierher: etwas eintragen (Trainingslog), eine fertige
 * Einheit aus dem Katalog der Pläne wählen (`librarySession` in
 * `domain/library.ts`) oder eine eigene Einheit für heute zusammenstellen
 * (`customSession`). Beide letzten ergeben eine geplante Einheit, die der
 * Player wie jede andere führt — sie gehört aber zu keinem Block und hakt
 * deshalb keinen Termin ab. Gespeichert wird sie als Training (Satz-Log →
 * Trainingslog) und als Einheit im Tagebuch.
 *
 * Rein: kein React, kein Speicher, keine Uhr außer den übergebenen Werten.
 */
import type { StoredPlannedSession } from '@/lib/store/localStore'

export interface FreePick {
  exerciseId: string
  name: string
  sets: number
  /** Wiederholungen oder Dauer als Text, wie im Plan ("8", "30 s"); leer = frei. */
  reps: string | null
}

export const MAX_FREE_EXERCISES = 12

/** Eine selbst zusammengestellte Einheit für heute. */
export function customSession(id: string, title: string, picks: FreePick[]): StoredPlannedSession {
  return {
    id: id.slice(0, 80),
    day: 1,
    weekFrom: 1,
    weekTo: null,
    kind: 'own',
    title: title.trim().slice(0, 60),
    note: '',
    ruleId: null,
    ruleVersion: null,
    primaryIntent: 'GPP',
    evidenceStrength: null,
    evidenceSpecificity: null,
    plannedDurationMin: null,
    highIntensity: false,
    blocks: picks.slice(0, MAX_FREE_EXERCISES).map((p) => ({
      type: 'library_exercise' as const,
      exerciseId: p.exerciseId.slice(0, 60),
      name: p.name.slice(0, 120),
      sets: Math.min(20, Math.max(1, Math.round(p.sets))),
      reps: p.reps ? p.reps.slice(0, 40) : null,
      rpe: null,
      restS: null,
      intensity: null,
      intent: '',
      role: 'primary' as const,
      ruleId: null,
      note: '',
    })),
    retestMetric: '',
    coachModified: false,
    coachModificationReason: null,
    removed: false,
  }
}

/** Ob eine Einheit sich führen lässt: Name und mindestens eine Übung. */
export function canStartCustom(title: string, picks: FreePick[]): boolean {
  return title.trim().length > 0 && picks.length > 0 && picks.length <= MAX_FREE_EXERCISES
}
