import { useCallback, useEffect, useRef } from 'react'
import { pauseWorkout, resumeWorkout, startWorkout, workoutElapsedS, type ActiveWorkout, type WorkoutKind } from '@/domain/activeWorkout'
import { readActiveWorkout, useActiveWorkout, writeActiveWorkout } from '@/lib/activeWorkout'
import { useWakeLock } from '@/lib/useWakeLock'
import { useTicker } from './useTicker'

/**
 * Die laufende Einheit eines Player-Bildschirms.
 *
 * Öffnen heisst starten: liegt keine Einheit auf dem Gerät, beginnt sie beim
 * ersten Anzeigen (ein Tipp vom Startknopf bis zur laufenden Uhr). Liegt
 * schon eine mit derselben Adresse da, geht es dort weiter — auch nach
 * Neuladen. Liegt eine ANDERE da, startet nichts von selbst (`conflict`):
 * der Bildschirm fragt, ob weitermachen oder verwerfen.
 *
 * Solange die Einheit läuft und nicht pausiert ist, bleibt der Bildschirm wach.
 */
export function useWorkoutSession(input: { kind: WorkoutKind; title: string; path: string | null; data?: unknown; autoStart?: boolean }) {
  const active = useActiveWorkout()
  const mine = active && input.path != null && active.path === input.path ? active : null
  const conflict = active != null && mine == null
  const started = useRef(false)

  useEffect(() => {
    // Einmal je Öffnen entscheiden: läuft schon etwas, wird fortgesetzt; sonst
    // starten. Danach nie wieder von selbst — sonst begänne nach «Speichern»
    // (Zwischenstand gelöscht) sofort eine neue Einheit.
    if (started.current || input.path == null || input.autoStart === false) return
    started.current = true
    if (readActiveWorkout()) return
    writeActiveWorkout(startWorkout({ kind: input.kind, title: input.title, path: input.path, now: Date.now(), data: input.data }))
  }, [input.kind, input.title, input.path, input.data, input.autoStart])

  const running = mine != null && mine.pausedAt == null
  useWakeLock(running)
  const now = useTicker(mine != null, 500)

  const patch = useCallback((fn: (w: ActiveWorkout) => ActiveWorkout) => {
    const cur = readActiveWorkout()
    if (cur && input.path != null && cur.path === input.path) writeActiveWorkout(fn(cur))
  }, [input.path])

  return {
    workout: mine,
    conflict: conflict ? active : null,
    elapsedS: mine ? workoutElapsedS(mine, now) : 0,
    now,
    start: (data?: unknown) => {
      if (input.path == null) return
      writeActiveWorkout(startWorkout({ kind: input.kind, title: input.title, path: input.path, now: Date.now(), data }))
    },
    setData: (data: unknown) => patch((w) => ({ ...w, data })),
    /** Den Start vorziehen (Phase überspringen): die Uhr rechnet nur aus Start und Pausen. */
    shiftStart: (ms: number) => patch((w) => ({ ...w, startedAt: w.startedAt - Math.max(0, ms) })),
    pause: () => patch((w) => pauseWorkout(w, Date.now())),
    resume: () => patch((w) => resumeWorkout(w, Date.now())),
    /** Gespeichert oder verworfen: der Zwischenstand verschwindet. */
    clear: () => {
      const cur = readActiveWorkout()
      if (!cur || input.path == null || cur.path === input.path) writeActiveWorkout(null)
    },
    /** Eine andere laufende Einheit verwerfen und diese starten. */
    replace: (data?: unknown) => {
      if (input.path == null) return
      writeActiveWorkout(startWorkout({ kind: input.kind, title: input.title, path: input.path, now: Date.now(), data }))
    },
  }
}
