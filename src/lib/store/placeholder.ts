import type { StoredAthlete } from './localStore'

/**
 * Ein leerer Platzhalter — der eine Athlet, den ein frischer Bestand haben
 * muss (`emptyData`). Er geht nie hoch: Er trägt nichts, und in einem
 * gemeinsamen Bestand hiessen alle Platzhalter gleich ('athlete-1') und
 * stünden sich als Konflikt im Weg.
 */
export function isBlankPlaceholder(a: StoredAthlete): boolean {
  return (
    !a.name &&
    a.results.length === 0 &&
    a.assessments.length === 0 &&
    a.biometrics.length === 0 &&
    a.observations.length === 0 &&
    a.diary.length === 0 &&
    a.workouts.length === 0 &&
    a.decisions.length === 0 &&
    a.meals.length === 0
  )
}
