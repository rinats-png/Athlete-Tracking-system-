import { exerciseByKey, MUSCLES, type Muscle } from '@/data/exercises'
import type { StoredWorkout, StoredWorkoutSet } from '@/lib/store/localStore'
import type { TrendPoint } from '@/types/domain'

/**
 * Das Trainingslog rechnen — Schicht S2 aus docs/ausbau.md.
 *
 * Wie im Tagebuch: alles Beschreibung, nichts Bewertung (§81). Die Formeln
 * stammen aus dem Coaching-System v4.0.0 und sind gegen dessen Testbericht
 * geprüft (tests/training.spec.ts):
 *
 *   e1RM        Epley mit RIR: kg · (1 + (Wdh + RIR) / 30)
 *               «bei > 12 Wdh ungenauer» — v4 sagt es, und es stimmt: die
 *               Formel ist für schwere Sätze gedacht, nicht für Ausdauersätze.
 *   Volumen     Σ Gewicht × Wdh über die Arbeitssätze
 *   Muskel-     Arbeitssätze je Woche, zugeordnet über den PRIMÄRmuskel des
 *   volumen     Katalogs; Sekundärmuskeln zählen nicht (v4, Muskelvolumen)
 *   Block-      e1RM der letzten 4 Wochen gegen die 4 davor, je Übung. v4
 *   vergleich   nennt es «Plateau prüfen» — hier heisst es nur, was es ist:
 *               «unverändert», mit Zahl.
 *
 * Ein e1RM ist eine SCHÄTZUNG, kein Messwert. Er steht deshalb nicht im
 * Leistungsprofil neben einem gemessenen 1RM und bekommt keine Referenz —
 * zwei Zahlen mit demselben Namen und verschiedener Herkunft wären ein
 * stiller Rechenfehler (§89).
 */

/** Ab so vielen Wiederholungen ist der e1RM erkennbar unsicherer. */
export const E1RM_RELIABLE_MAX_REPS = 12

/** Epley mit RIR. Ein Satz mit 1 Wdh bei RIR 0 IST der 1RM — dann keine Formel. */
export function e1rm(set: Pick<StoredWorkoutSet, 'weightKg' | 'reps' | 'rir'>): number {
  const effort = set.reps + (set.rir ?? 0)
  if (effort <= 1) return set.weightKg
  return set.weightKg * (1 + effort / 30)
}

export function setVolume(set: Pick<StoredWorkoutSet, 'weightKg' | 'reps'>): number {
  return set.weightKg * set.reps
}

export function workoutVolume(workout: Pick<StoredWorkout, 'exercises'>): number {
  return workout.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + setVolume(set), 0), 0)
}

export function workoutSetCount(workout: Pick<StoredWorkout, 'exercises'>): number {
  return workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
}

/**
 * Ein e1RM braucht eine Last. Ein Satz mit 0 kg — Klimmzüge, Liegestütze,
 * Box Jumps — hat keinen: «0,0 kg e1RM» wäre eine Zahl ohne Aussage. Solche
 * Sätze zählen weiter als Sätze (Volumen je Muskel, Arbeitssätze), nur
 * nicht als Bestwert.
 */
export function hasLoad(set: Pick<StoredWorkoutSet, 'weightKg'>): boolean {
  return set.weightKg > 0
}

/** Bester e1RM einer Übung innerhalb einer Einheit, oder null ohne belastete Sätze. */
export function bestE1rmInWorkout(workout: StoredWorkout, exerciseKey: string): number | null {
  const sets = workout.exercises.filter((e) => e.exerciseKey === exerciseKey).flatMap((e) => e.sets).filter(hasLoad)
  if (sets.length === 0) return null
  return Math.max(...sets.map(e1rm))
}

/** Der e1RM je Einheit, chronologisch — die Zeitreihe einer Übung. */
export function e1rmHistory(workouts: StoredWorkout[], exerciseKey: string): TrendPoint[] {
  return [...workouts]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((w) => ({ performedAt: `${w.day}T12:00:00.000Z`, value: bestE1rmInWorkout(w, exerciseKey) }))
    .filter((p): p is TrendPoint => p.value != null)
}

/**
 * Alle Übungen mit belasteten Sätzen, mit bestem e1RM und Anzahl Einheiten.
 * Körpergewichtsübungen ohne Zusatzlast stehen nicht hier — sie haben
 * keinen Bestwert, nur Sätze.
 */
export function exerciseSummary(workouts: StoredWorkout[]): { exerciseKey: string; customName: string; best: number; sessions: number }[] {
  const map = new Map<string, { customName: string; best: number; sessions: number }>()
  for (const w of workouts) {
    const seen = new Set<string>()
    for (const ex of w.exercises) {
      const loaded = ex.sets.filter(hasLoad)
      if (loaded.length === 0) continue
      const key = ex.exerciseKey === 'custom' ? `custom:${ex.customName}` : ex.exerciseKey
      const best = Math.max(...loaded.map(e1rm))
      const current = map.get(key)
      map.set(key, {
        customName: ex.customName,
        best: Math.max(current?.best ?? 0, best),
        sessions: (current?.sessions ?? 0) + (seen.has(key) ? 0 : 1),
      })
      seen.add(key)
    }
  }
  return [...map.entries()]
    .map(([exerciseKey, v]) => ({ exerciseKey: exerciseKey.startsWith('custom:') ? 'custom' : exerciseKey, ...v }))
    .sort((a, b) => b.sessions - a.sessions || b.best - a.best)
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/**
 * Arbeitssätze je Primärmuskel in einem Fenster (Vorgabe: die letzten 7 Tage
 * einschliesslich `endDay`). Freie Übungen ohne Katalogeintrag zählen in
 * keine Gruppe — ehrlicher als ein geratener Muskel.
 */
export function setsPerMuscle(workouts: StoredWorkout[], endDay: string, days = 7): Record<Muscle, number> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>
  for (const w of workouts) {
    const age = daysBetween(w.day, endDay)
    if (age < 0 || age >= days) continue
    for (const ex of w.exercises) {
      const def = exerciseByKey(ex.exerciseKey)
      if (!def) continue
      out[def.muscle] += ex.sets.length
    }
  }
  return out
}

export type BlockVerdict = 'up' | 'down' | 'unchanged' | 'insufficient'

/** Unter dieser relativen Änderung gilt ein Block als unverändert (v4: 1 %). */
export const BLOCK_THRESHOLD = 0.01
export const BLOCK_DAYS = 28
/** Je Block mindestens so viele Einheiten, sonst ist der Vergleich zwei Tage gegen zwei Tage. */
export const BLOCK_MIN_SESSIONS = 2

/**
 * Der e1RM des aktuellen 4-Wochen-Blocks gegen den Block davor.
 *
 * «unverändert» ist eine Beschreibung, keine Diagnose: ob das ein Plateau
 * ist, das jemand brechen sollte, oder eine geplante Erhaltungsphase, weiss
 * die App nicht. Sie sagt nur die Zahl.
 */
export function blockCompare(
  workouts: StoredWorkout[],
  exerciseKey: string,
  endDay: string,
): { verdict: BlockVerdict; deltaPercent: number | null; current: number | null; previous: number | null } {
  const cur: number[] = []
  const prev: number[] = []
  for (const w of workouts) {
    const best = bestE1rmInWorkout(w, exerciseKey)
    if (best == null) continue
    const age = daysBetween(w.day, endDay)
    if (age < 0) continue
    if (age < BLOCK_DAYS) cur.push(best)
    else if (age < BLOCK_DAYS * 2) prev.push(best)
  }
  if (cur.length < BLOCK_MIN_SESSIONS || prev.length < BLOCK_MIN_SESSIONS) {
    return { verdict: 'insufficient', deltaPercent: null, current: null, previous: null }
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const current = mean(cur)
  const previous = mean(prev)
  const delta = (current - previous) / previous
  const verdict: BlockVerdict = Math.abs(delta) < BLOCK_THRESHOLD ? 'unchanged' : delta > 0 ? 'up' : 'down'
  return { verdict, deltaPercent: delta * 100, current, previous }
}
