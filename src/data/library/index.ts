import type { LibraryExercise, PlanWeek, ProgramIndex } from '@/domain/libraryTypes'

/**
 * Nachladen der Trainingsbibliothek. Die Daten (≈ 350 KB Index + Übungen,
 * 15–80 KB je Plan) gehören nicht ins Startpaket; sie kommen erst, wenn ein
 * Bildschirm der Bibliothek öffnet, und liegen danach im Service-Worker-Cache
 * — offline nutzbar (Regel 3).
 *
 * Erzeugt mit `node scripts/buildLibrary.mjs` aus `content/library/`.
 */

let exercises: Promise<LibraryExercise[]> | null = null
let index: Promise<ProgramIndex> | null = null

export function loadExercises(): Promise<LibraryExercise[]> {
  exercises ??= import('./exerciseRegistry.json').then((m) => m.default as unknown as LibraryExercise[])
  return exercises
}

export function loadProgramIndex(): Promise<ProgramIndex> {
  index ??= import('./programIndex.json').then((m) => m.default as unknown as ProgramIndex)
  return index
}

const planFiles = import.meta.glob<{ default: PlanWeek[] }>('./plans/*.json')

export async function loadPlanWeeks(planId: string): Promise<PlanWeek[] | null> {
  const load = planFiles[`./plans/${planId}.json`]
  if (!load) return null
  return (await load()).default
}

export const PLAN_IDS = Object.keys(planFiles).map((p) => p.replace('./plans/', '').replace('.json', ''))
