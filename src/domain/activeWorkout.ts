/**
 * Die laufende Einheit: was gerade trainiert wird, seit wann, mit welchen
 * Pausen — und genug Zustand, um nach Neuladen, Wegwischen oder einem
 * Wechsel auf einen anderen Bildschirm genau dort weiterzumachen.
 *
 * WARUM NICHT IM BESTAND: eine laufende Einheit ist ein Zwischenstand auf
 * diesem Gerät, kein Datum über den Athleten. Erst «Speichern» schreibt ins
 * Tagebuch, den Plan und das Trainingslog (dort mit Schema und Abgleich).
 * Der Zwischenstand liegt deshalb unter einem eigenen Schlüssel
 * (`lib/activeWorkout.ts`) und wird nie abgeglichen.
 *
 * Der gespeicherte Wert gilt als unzuverlässig (anderer Stand der App,
 * manuell verändert): `parseActiveWorkout` prüft die Form und verwirft, was
 * nicht passt, statt einen Bildschirm abstürzen zu lassen.
 *
 * Rein: kein React, kein Speicher, keine Uhr.
 */

export type WorkoutKind = 'plan' | 'free' | 'run' | 'clock' | 'camera'

export interface ActiveWorkout {
  v: 1
  kind: WorkoutKind
  /** Anzeigename («Kraft A · Unterkörper», «Boxen 12 × 3:00»). */
  title: string
  /** Wohin «Zurück» führt (immer eine Adresse des Trainingsbereichs). */
  path: string
  startedAt: number
  /** Summe abgeschlossener Pausen in Millisekunden. */
  pausedMs: number
  /** Beginn der laufenden Pause, sonst null. */
  pausedAt: number | null
  /** Ende der laufenden Satzpause (Krafttraining), sonst null. */
  restEnd: number | null
  /** Was der jeweilige Bildschirm zum Fortsetzen braucht; er prüft es selbst. */
  data: unknown
}

export const WORKOUT_KINDS: readonly WorkoutKind[] = ['plan', 'free', 'run', 'clock', 'camera']

/** Nach so vielen Stunden fragt die App, ob die Einheit verworfen werden soll. */
export const STALE_HOURS = 12

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function parseActiveWorkout(raw: unknown): ActiveWorkout | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== 1 || !WORKOUT_KINDS.includes(o.kind as WorkoutKind)) return null
  if (typeof o.title !== 'string' || typeof o.path !== 'string' || !o.path.startsWith('/plan/')) return null
  if (!num(o.startedAt) || !num(o.pausedMs) || o.pausedMs < 0) return null
  if (o.pausedAt != null && !num(o.pausedAt)) return null
  if (o.restEnd != null && !num(o.restEnd)) return null
  return {
    v: 1,
    kind: o.kind as WorkoutKind,
    title: o.title.slice(0, 80),
    path: o.path.slice(0, 300),
    startedAt: o.startedAt,
    pausedMs: o.pausedMs,
    pausedAt: (o.pausedAt as number | null) ?? null,
    restEnd: (o.restEnd as number | null) ?? null,
    data: o.data ?? null,
  }
}

export function startWorkout(input: { kind: WorkoutKind; title: string; path: string; now: number; data?: unknown }): ActiveWorkout {
  return { v: 1, kind: input.kind, title: input.title.slice(0, 80), path: input.path, startedAt: input.now, pausedMs: 0, pausedAt: null, restEnd: null, data: input.data ?? null }
}

/** Laufzeit in Sekunden ohne Pausen. */
export function workoutElapsedS(w: Pick<ActiveWorkout, 'startedAt' | 'pausedMs' | 'pausedAt'>, now: number): number {
  return Math.max(0, ((w.pausedAt ?? now) - w.startedAt - w.pausedMs) / 1000)
}

export function pauseWorkout(w: ActiveWorkout, now: number): ActiveWorkout {
  return w.pausedAt != null ? w : { ...w, pausedAt: now }
}

export function resumeWorkout(w: ActiveWorkout, now: number): ActiveWorkout {
  return w.pausedAt == null ? w : { ...w, pausedMs: w.pausedMs + Math.max(0, now - w.pausedAt), pausedAt: null }
}

export function isStale(w: ActiveWorkout, now: number): boolean {
  return now - w.startedAt > STALE_HOURS * 3_600_000
}

/** Gemessene Dauer in ganzen Minuten für das Tagebuch (1..600). */
export function measuredMinutes(w: Pick<ActiveWorkout, 'startedAt' | 'pausedMs' | 'pausedAt'>, now: number): number {
  return Math.min(600, Math.max(1, Math.round(workoutElapsedS(w, now) / 60)))
}
