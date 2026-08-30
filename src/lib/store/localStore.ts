import {
  CURRENT_SCHEMA_VERSION,
  emptyData,
  parseStoredData,
  storedDataSchema,
  type LoadReport,
  type ValidatedAssessment,
  type ValidatedBiometric,
  type ValidatedData,
  type ValidatedResult,
} from './schema'

/**
 * Lokaler Speicher für den Gastmodus.
 *
 * Alles bleibt im `localStorage` des Geräts. Es wird nichts übertragen, kein
 * Konto angelegt, keine Kennung vergeben — das ist die Zusage des Gastmodus
 * und der Grund, warum diese Schicht überhaupt existiert statt direkt gegen
 * ein Backend zu gehen.
 *
 * Die Schnittstelle ist bewusst dieselbe, die später eine Cloud-Variante
 * bekommt: laden, speichern, löschen. Ein Wechsel auf ein Konto heisst dann,
 * diesen Datensatz einmal hochzuladen — nicht die halbe App umzuschreiben.
 *
 * Validierung und Migration liegen in `schema.ts` und laufen bei jedem Laden.
 */

const STORAGE_KEY = 'baseline.data.v1'

export type StoredData = ValidatedData
export type StoredResult = ValidatedResult
export type StoredAssessment = ValidatedAssessment
export type StoredBiometric = ValidatedBiometric

export interface LoadResult {
  data: StoredData
  report: LoadReport
  /** Der Speicher war nicht lesbar (privater Modus, gesperrt). */
  unavailable: boolean
}

/**
 * Der Speicher darf nie die App zum Absturz bringen: privater Modus, volle
 * Quote oder ein beschädigter Eintrag führen zu einem leeren Bestand mit
 * Bericht, nicht zu einer weissen Seite.
 */
export function loadData(): LoadResult {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: emptyData(), report: emptyReport(), unavailable: true }
  }

  if (!raw) return { data: emptyData(), report: emptyReport(), unavailable: false }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return {
      data: emptyData(),
      report: { ...emptyReport(), rejected: [{ kind: 'file', id: '-', reason: 'Kein gültiges JSON' }] },
      unavailable: false,
    }
  }

  const { data, report } = parseStoredData(parsedJson)
  return { data: data ?? emptyData(), report, unavailable: false }
}

function emptyReport(): LoadReport {
  return { migratedFrom: null, fromNewerVersion: false, rejected: [] }
}

export function saveData(data: StoredData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: CURRENT_SCHEMA_VERSION }))
    return true
  } catch {
    // Quota überschritten oder Speicher gesperrt. Der Aufrufer meldet das;
    // die laufende Sitzung bleibt benutzbar.
    return false
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Der Speicher war ohnehin nicht verfügbar. */
  }
}

/** Exportformat. Der Umschlag macht die Datei ohne Kontext lesbar. */
export interface ExportEnvelope {
  format: 'BASELINE_DATA_EXPORT'
  schemaVersion: number
  appVersion: string
  createdAt: string
  data: StoredData
}

export function exportData(data: StoredData, appVersion = __APP_VERSION__): string {
  const envelope: ExportEnvelope = {
    format: 'BASELINE_DATA_EXPORT',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion,
    createdAt: new Date().toISOString(),
    data,
  }
  return JSON.stringify(envelope, null, 2)
}

export interface ImportOutcome {
  ok: boolean
  data: StoredData | null
  report: LoadReport
  /** Verständlicher Grund, wenn der Import gar nicht möglich war. */
  error: 'invalid_json' | 'unknown_format' | 'newer_version' | 'storage_full' | null
}

/**
 * Import mit vollständiger Prüfung.
 *
 * Angenommen werden sowohl der Umschlag als auch ein blanker Bestand — ältere
 * Exporte hatten keinen Umschlag, und die dürfen nicht wertlos werden.
 */
export function importData(json: string): ImportOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, data: null, report: emptyReport(), error: 'invalid_json' }
  }

  const candidate =
    parsed && typeof parsed === 'object' && (parsed as ExportEnvelope).format === 'BASELINE_DATA_EXPORT'
      ? (parsed as ExportEnvelope).data
      : parsed

  if (!candidate || typeof candidate !== 'object' || !('version' in (candidate as object))) {
    return { ok: false, data: null, report: emptyReport(), error: 'unknown_format' }
  }

  const { data, report } = parseStoredData(candidate)
  if (!data) {
    return {
      ok: false,
      data: null,
      report,
      error: report.fromNewerVersion ? 'newer_version' : 'unknown_format',
    }
  }

  if (!saveData(data)) {
    return { ok: false, data: null, report, error: 'storage_full' }
  }
  return { ok: true, data, report, error: null }
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

export function upsertAssessment(data: StoredData, assessment: StoredAssessment): StoredData {
  const assessments = data.assessments.filter((a) => a.id !== assessment.id)
  assessments.push(assessment)
  assessments.sort((a, b) => (a.performedOn < b.performedOn ? 1 : -1))
  return { ...data, assessments }
}

export function removeAssessment(data: StoredData, id: string): StoredData {
  return {
    ...data,
    assessments: data.assessments.filter((a) => a.id !== id),
    // Ergebnisse bleiben erhalten und verlieren nur die Zuordnung — ein
    // gelöschter Termin darf keine Messwerte mitnehmen.
    results: data.results.map((r) => (r.assessmentId === id ? { ...r, assessmentId: null } : r)),
  }
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
  const before = data.biometrics
    .filter((b) => b.bodyWeightKg != null && b.measuredOn <= day)
    .sort((a, b) => (a.measuredOn < b.measuredOn ? 1 : -1))[0]
  if (before?.bodyWeightKg != null) return before.bodyWeightKg
  // Kein Eintrag vor dem Test: der früheste vorhandene ist die beste Schätzung.
  const earliest = [...data.biometrics]
    .filter((b) => b.bodyWeightKg != null)
    .sort((a, b) => (a.measuredOn > b.measuredOn ? 1 : -1))[0]
  return earliest?.bodyWeightKg ?? null
}

export { CURRENT_SCHEMA_VERSION, emptyData, storedDataSchema }
