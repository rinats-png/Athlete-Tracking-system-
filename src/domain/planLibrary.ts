import { exportPlan } from '@/domain/planFile'
import type { StoredPlanTemplate, StoredTrainingBlock } from '@/lib/store/localStore'

/**
 * Eigene Planvorlagen mit Versionen (Trainingsbereich Etappe 12).
 *
 * Eine Vorlage ist ein Plan als Datei (siehe planFile.ts): Struktur und
 * Eigenes, nie Evidenz oder Dosis. Unter demselben Namen erneut gespeichert
 * wird eine neue Version; die letzten fünf bleiben. Beim Verwenden gilt wie
 * beim Import: Regeln werden aus dem Register neu gebaut.
 */
export const MAX_TEMPLATES = 20
export const MAX_VERSIONS = 5
/** Eine Vorlage (eine Version) darf höchstens so groß sein; alle zusammen höchstens `MAX_TOTAL_CHARS`: der lokale Speicher ist begrenzt. */
export const MAX_CONTENT_CHARS = 60_000
export const MAX_TOTAL_CHARS = 600_000

const totalChars = (list: StoredPlanTemplate[]) => list.reduce((n, t) => n + t.versions.reduce((m, v) => m + v.content.length, 0), 0)

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export type SaveResult = { ok: true; list: StoredPlanTemplate[]; version: number } | { ok: false; error: 'no_name' | 'no_sessions' | 'too_many' | 'too_big' }

export function saveAsTemplate(list: StoredPlanTemplate[], block: StoredTrainingBlock, name: string, newId: () => string, now: string): SaveResult {
  const clean = name.trim().slice(0, 60)
  if (!clean) return { ok: false, error: 'no_name' }
  if (!block.sessions.some((s) => !s.removed)) return { ok: false, error: 'no_sessions' }
  const content = exportPlan({ ...block, name: clean })
  if (content.length > MAX_CONTENT_CHARS) return { ok: false, error: 'too_big' }
  const existing = list.find((t) => same(t.name, clean))
  if (existing) {
    const version = Math.max(...existing.versions.map((v) => v.version)) + 1
    const versions = [...existing.versions, { version, savedAt: now, content }].slice(-MAX_VERSIONS)
    if (totalChars(list) - existing.versions.reduce((m, v) => m + v.content.length, 0) + versions.reduce((m, v) => m + v.content.length, 0) > MAX_TOTAL_CHARS) return { ok: false, error: 'too_big' }
    return { ok: true, version, list: list.map((t) => (t.id === existing.id ? { ...t, weeks: block.weeks, versions } : t)) }
  }
  if (list.length >= MAX_TEMPLATES) return { ok: false, error: 'too_many' }
  if (totalChars(list) + content.length > MAX_TOTAL_CHARS) return { ok: false, error: 'too_big' }
  return { ok: true, version: 1, list: [...list, { id: newId(), name: clean, weeks: block.weeks, versions: [{ version: 1, savedAt: now, content }] }] }
}

export const latestVersion = (t: StoredPlanTemplate) => t.versions[t.versions.length - 1]

export const deleteTemplate = (list: StoredPlanTemplate[], id: string): StoredPlanTemplate[] => list.filter((t) => t.id !== id)

/** Nur eine Version löschen; die letzte verbleibende nimmt die ganze Vorlage mit. */
export function deleteVersion(list: StoredPlanTemplate[], id: string, version: number): StoredPlanTemplate[] {
  return list.flatMap((t) => {
    if (t.id !== id) return [t]
    const versions = t.versions.filter((v) => v.version !== version)
    return versions.length === 0 ? [] : [{ ...t, versions }]
  })
}
