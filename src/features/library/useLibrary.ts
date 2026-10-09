import { useEffect, useState } from 'react'
import { loadExercises, loadExerciseText, loadPlanWeeks, loadProgramIndex } from '@/data/library'
import type { ExerciseText, LibraryExercise, PlanWeek, ProgramIndex } from '@/domain/libraryTypes'

/** Lädt Übungsdatenbank und Programmindex nach; `null`, solange sie unterwegs sind. */
export function useLibrary(enabled = true): { exercises: LibraryExercise[] | null; index: ProgramIndex | null } {
  const [exercises, setExercises] = useState<LibraryExercise[] | null>(null)
  const [index, setIndex] = useState<ProgramIndex | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    void loadExercises().then((e) => live && setExercises(e))
    void loadProgramIndex().then((i) => live && setIndex(i))
    return () => {
      live = false
    }
  }, [enabled])
  return { exercises, index }
}

/** Wochen eines Plans; `undefined` beim Laden, `null` wenn es den Plan nicht gibt. */
export function usePlanWeeks(planId: string | undefined): PlanWeek[] | null | undefined {
  const [weeks, setWeeks] = useState<PlanWeek[] | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setWeeks(undefined)
    if (!planId) return setWeeks(null)
    void loadPlanWeeks(planId).then((w) => live && setWeeks(w))
    return () => {
      live = false
    }
  }, [planId])
  return weeks
}

/** Texte einer Übung; `undefined` beim Laden, `null` wenn es keine gibt. */
export function useExerciseText(category: string | undefined, id: string | undefined): ExerciseText | null | undefined {
  const [text, setText] = useState<ExerciseText | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setText(undefined)
    if (!category || !id) return
    void loadExerciseText(category, id).then((x) => live && setText(x))
    return () => {
      live = false
    }
  }, [category, id])
  return text
}
