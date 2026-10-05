import { EXERCISES, type Muscle } from '@/data/exercises'
import type { StoredCustomExercise } from '@/lib/store/localStore'

/**
 * Übungsbibliothek (Trainingsbereich Etappe 15): der Katalog und die eigenen
 * Übungen in einer Suche. Eigene Übungen tragen nur, was der Mensch einträgt
 * (Name, Muskelgruppe): keine Anleitung, keine Wirkungsbehauptung.
 */
export const MAX_CUSTOM = 50

export interface LibraryEntry {
  /** Katalogschlüssel; `null` bei eigenen Übungen. */
  key: string | null
  /** Kennung der eigenen Übung; `null` im Katalog. */
  customId: string | null
  name: string
  muscle: Muscle | null
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')

/** Katalog und eigene Übungen, gefiltert nach Suchtext und Muskelgruppe. Eigene stehen vor dem Katalog. */
export function searchLibrary(query: string, customs: StoredCustomExercise[], muscle: Muscle | null, lang: 'de' | 'en', limit = 200): LibraryEntry[] {
  const q = fold(query)
  const own: LibraryEntry[] = customs.map((c) => ({ key: null, customId: c.id, name: c.name, muscle: c.muscle }))
  const catalog: LibraryEntry[] = EXERCISES.map((e) => ({ key: e.key, customId: null, name: e.name[lang], muscle: e.muscle }))
  return [...own, ...catalog]
    .filter((e) => (muscle == null || e.muscle === muscle) && (q === '' || fold(e.name).includes(q) || (e.key != null && fold(EXERCISES.find((x) => x.key === e.key)!.name[lang === 'de' ? 'en' : 'de']).includes(q))))
    .slice(0, limit)
}

export type AddCustomResult = { ok: true; list: StoredCustomExercise[] } | { ok: false; error: 'no_name' | 'duplicate' | 'too_many' }

export function addCustomExercise(list: StoredCustomExercise[], name: string, muscle: Muscle | null, newId: () => string): AddCustomResult {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 60)
  if (!clean) return { ok: false, error: 'no_name' }
  const f = fold(clean)
  if (list.some((c) => fold(c.name) === f) || EXERCISES.some((e) => fold(e.name.de) === f || fold(e.name.en) === f)) return { ok: false, error: 'duplicate' }
  if (list.length >= MAX_CUSTOM) return { ok: false, error: 'too_many' }
  return { ok: true, list: [...list, { id: newId(), name: clean, muscle }] }
}

export const removeCustomExercise = (list: StoredCustomExercise[], id: string): StoredCustomExercise[] => list.filter((c) => c.id !== id)
