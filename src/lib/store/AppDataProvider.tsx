import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buildDemoData } from '@/data/demoSeed'
import { deriveMetrics, primaryValue } from '@/lib/metrics/derive'
import { getTest } from '@/data/testCatalog'
import { ageFromBirthDate } from '@/lib/format'
import {
  bodyWeightAt,
  clearData,
  emptyData,
  exportData,
  importData,
  loadData,
  newId,
  removeAssessment,
  removeResult,
  saveData,
  upsertAssessment,
  upsertBiometric,
  upsertResult,
  type ImportOutcome,
  type StoredAssessment,
  type StoredBiometric,
  type StoredData,
  type StoredResult,
} from './localStore'
import type { AttemptSelection, LoadReport } from './schema'

/**
 * Zentraler Datenzugriff der App.
 *
 * Alle Screens lesen und schreiben hierüber, nie direkt am Speicher. Dadurch
 * ist der Wechsel vom Gastmodus (lokal) auf ein Konto (Cloud) ein Austausch
 * dieser einen Schicht und nicht ein Umbau jedes Screens.
 */

export type AppMode = 'guest' | 'demo'

export interface RecordResultInput {
  testSlug: string
  performedAt: string
  values: Record<string, number>
  assessmentId?: string | null
  /** Rohversuche, wenn das Protokoll mehrere vorsieht. */
  attempts?: Record<string, number>[]
  attemptSelection?: AttemptSelection | null
  notes?: string
}

interface AppDataValue {
  mode: AppMode
  data: StoredData
  /** Befund des letzten Ladevorgangs: Migration, abgewiesene Datensätze. */
  loadReport: LoadReport
  /** Körpergewicht zum Stichtag, für Relativkraft und Sinclair. */
  bodyWeightAt: (iso: string) => number | null
  saveProfile: (patch: Partial<StoredData['profile']>) => void
  saveBiometric: (entry: Omit<StoredBiometric, 'id' | 'createdAt'>) => void
  /** Legt ein Ergebnis an und rechnet die abgeleiteten Metriken gleich mit. */
  recordResult: (input: RecordResultInput) => StoredResult | null
  deleteResult: (id: string) => void
  saveAssessment: (assessment: StoredAssessment) => void
  deleteAssessment: (id: string) => void
  resetAll: () => void
  loadDemo: () => void
  exportJson: () => string
  importJson: (json: string) => ImportOutcome
  /** Meldet, ob der letzte Schreibvorgang gescheitert ist. */
  storageBlocked: boolean
}

const AppDataContext = createContext<AppDataValue | null>(null)

const MODE_KEY = 'baseline.mode'

export function readMode(): AppMode | null {
  try {
    const value = localStorage.getItem(MODE_KEY)
    return value === 'guest' || value === 'demo' ? value : null
  } catch {
    return null
  }
}

export function writeMode(mode: AppMode | null) {
  try {
    if (mode) localStorage.setItem(MODE_KEY, mode)
    else localStorage.removeItem(MODE_KEY)
  } catch {
    /* Ohne Speicher gilt der Modus nur für diese Sitzung. */
  }
}

export function AppDataProvider({ mode, children }: { mode: AppMode; children: React.ReactNode }) {
  /**
   * Beim ersten Betreten des Demomodus einmalig befüllen — synchron beim
   * ersten Rendern, nicht nachgeladen. Ein nachgereichter Bestand liesse erst
   * den Leerzustand erscheinen und würde das Layout verschieben, sobald er
   * eintrifft; genau darauf gehen Fehlklicks zurück.
   */
  const [initial] = useState(() => loadData())
  const [data, setData] = useState<StoredData>(() =>
    mode === 'demo' && initial.data.results.length === 0 ? buildDemoData() : initial.data,
  )
  const [storageBlocked, setStorageBlocked] = useState(initial.unavailable)

  useEffect(() => {
    if (mode === 'demo' && initial.data.results.length === 0 && data.results.length > 0) {
      if (!saveData(data)) setStorageBlocked(true)
    }
    // Nur beim Moduswechsel, nicht bei jeder Änderung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const commit = useCallback((next: StoredData) => {
    setData(next)
    if (!saveData(next)) setStorageBlocked(true)
  }, [])

  const recordResult = useCallback<AppDataValue['recordResult']>(
    ({ testSlug, performedAt, values, assessmentId = null, attempts = [], attemptSelection = null, notes }) => {
      const test = getTest(testSlug)
      if (!test) return null

      const context = {
        bodyWeightKg: bodyWeightAt(data, performedAt),
        ageYears: ageFromBirthDate(data.profile.birthDate),
        sex: data.profile.sex,
      }
      const metrics = deriveMetrics(test, values, context)
      const result: StoredResult = {
        id: newId(),
        testSlug,
        performedAt,
        values,
        metrics,
        score: primaryValue(test, values, metrics),
        bodyWeightKg: context.bodyWeightKg,
        ageYears: context.ageYears,
        sex: context.sex,
        assessmentId,
        attempts,
        attemptSelection,
        notes,
        createdAt: new Date().toISOString(),
      }
      commit(upsertResult(data, result))
      return result
    },
    [commit, data],
  )

  const value = useMemo<AppDataValue>(
    () => ({
      mode,
      data,
      loadReport: initial.report,
      bodyWeightAt: (iso) => bodyWeightAt(data, iso),
      saveProfile: (patch) => commit({ ...data, profile: { ...data.profile, ...patch } }),
      saveBiometric: (entry) =>
        commit(upsertBiometric(data, { ...entry, id: newId(), createdAt: new Date().toISOString() })),
      recordResult,
      deleteResult: (id) => commit(removeResult(data, id)),
      saveAssessment: (assessment) => commit(upsertAssessment(data, assessment)),
      deleteAssessment: (id) => commit(removeAssessment(data, id)),
      resetAll: () => {
        clearData()
        setData(emptyData())
        setStorageBlocked(false)
      },
      loadDemo: () => commit(buildDemoData()),
      exportJson: () => exportData(data),
      importJson: (json) => {
        const outcome = importData(json)
        if (outcome.ok && outcome.data) setData(outcome.data)
        return outcome
      },
      storageBlocked,
    }),
    [mode, data, initial.report, recordResult, commit, storageBlocked],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData muss innerhalb von <AppDataProvider> benutzt werden')
  return context
}
