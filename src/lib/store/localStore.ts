import { EMPTY_PROFILE, type StoredBiometric, type StoredData, type StoredResult } from './types'

/**
 * Lokaler Speicher für den Gastmodus.
 *
 * Alles bleibt im `localStorage` des Geräts. Es wird nichts übertragen, kein
 * Konto angelegt, keine Kennung vergeben — das ist die Zusage des Gastmodus
 * und der Grund, warum diese Schicht überhaupt existiert statt direkt gegen
 * Supabase zu gehen.
 *
 * Die Schnittstelle ist bewusst dieselbe, die später eine Supabase-Variante
 * bekommt: laden, speichern, löschen. Ein Wechsel auf ein Konto heisst dann,
 * diesen Datensatz einmal hochzuladen — nicht die halbe App umzuschreiben.
 */

const STORAGE_KEY = 'baseline.data.v1'
const SCHEMA_VERSION = 1

function emptyData(): StoredData {
  return { version: SCHEMA_VERSION, profile: { ...EMPTY_PROFILE }, biometrics: [], results: [] }
}

/**
 * Der Speicher darf nie die App zum Absturz bringen: privater Modus, volle
 * Quote oder ein beschädigter Eintrag führen zu einem leeren Datensatz, nicht
 * zu einer weissen Seite.
 */
export function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<StoredData>
    if (parsed.version !== SCHEMA_VERSION) return emptyData()
    return {
      version: SCHEMA_VERSION,
      profile: { ...EMPTY_PROFILE, ...parsed.profile },
      biometrics: Array.isArray(parsed.biometrics) ? parsed.biometrics : [],
      results: Array.isArray(parsed.results) ? parsed.results : [],
    }
  } catch {
    return emptyData()
  }
}

export function saveData(data: StoredData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: SCHEMA_VERSION }))
    return true
  } catch {
    return false
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Nichts zu tun — der Speicher war ohnehin nicht verfügbar. */
  }
}

/** Vollständiger Export für "meine Daten mitnehmen". */
export function exportData(): string {
  return JSON.stringify(loadData(), null, 2)
}

export function importData(json: string): StoredData | null {
  try {
    const parsed = JSON.parse(json) as StoredData
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.results)) return null
    const data: StoredData = {
      version: SCHEMA_VERSION,
      profile: { ...EMPTY_PROFILE, ...parsed.profile },
      biometrics: Array.isArray(parsed.biometrics) ? parsed.biometrics : [],
      results: parsed.results,
    }
    return saveData(data) ? data : null
  } catch {
    return null
  }
}

/** Kennungen ohne Zufallsquelle des Servers — `crypto` ist überall verfügbar. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function upsertResult(data: StoredData, result: StoredResult): StoredData {
  const results = data.results.filter((r) => r.id !== result.id)
  results.push(result)
  results.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
  return { ...data, results }
}

export function removeResult(data: StoredData, id: string): StoredData {
  return { ...data, results: data.results.filter((r) => r.id !== id) }
}

export function upsertBiometric(data: StoredData, entry: StoredBiometric): StoredData {
  // Ein Eintrag je Tag: eine spätere Messung am selben Tag ersetzt die frühere.
  const biometrics = data.biometrics.filter((b) => b.measuredOn !== entry.measuredOn)
  biometrics.push(entry)
  biometrics.sort((a, b) => (a.measuredOn < b.measuredOn ? 1 : -1))
  return { ...data, biometrics }
}

/** Das zum Zeitpunkt gültige Körpergewicht: der jüngste Eintrag davor. */
export function bodyWeightAt(data: StoredData, iso: string): number | null {
  const day = iso.slice(0, 10)
  const entry = data.biometrics
    .filter((b) => b.bodyWeightKg != null && b.measuredOn <= day)
    .sort((a, b) => (a.measuredOn < b.measuredOn ? 1 : -1))[0]
  return entry?.bodyWeightKg ?? data.biometrics.find((b) => b.bodyWeightKg != null)?.bodyWeightKg ?? null
}
