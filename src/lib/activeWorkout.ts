import { useEffect, useState } from 'react'
import { parseActiveWorkout, type ActiveWorkout } from '@/domain/activeWorkout'

/**
 * Zwischenstand der laufenden Einheit auf diesem Gerät (`domain/activeWorkout.ts`).
 *
 * Eigener Schlüssel ausserhalb des Bestands: kein Abgleich, keine Migration —
 * es ist ein Notizzettel, der beim Speichern oder Verwerfen verschwindet.
 * Jede Änderung meldet sich an alle offenen Bildschirme (gleicher Tab per
 * Ereignis, andere Tabs über `storage`), damit die Leiste «Training läuft»
 * immer stimmt.
 */
const KEY = 'kydon.workout.active.v1'
const EVENT = 'kydon:active-workout'

export function readActiveWorkout(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? parseActiveWorkout(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function writeActiveWorkout(w: ActiveWorkout | null): void {
  try {
    if (w) localStorage.setItem(KEY, JSON.stringify(w))
    else localStorage.removeItem(KEY)
  } catch {
    // Privater Modus oder voller Speicher: die Einheit läuft weiter, übersteht nur kein Neuladen.
  }
  window.dispatchEvent(new Event(EVENT))
}

export function onActiveWorkoutChange(fn: () => void): () => void {
  const storage = (e: StorageEvent) => {
    if (e.key === KEY) fn()
  }
  window.addEventListener(EVENT, fn)
  window.addEventListener('storage', storage)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener('storage', storage)
  }
}

export function useActiveWorkout(): ActiveWorkout | null {
  const [w, setW] = useState(readActiveWorkout)
  useEffect(() => onActiveWorkoutChange(() => setW(readActiveWorkout())), [])
  return w
}
