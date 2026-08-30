import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buildDemoData } from '@/data/demoSeed'
import { deriveMetrics, primaryValue } from '@/lib/metrics/derive'
import { getTest } from '@/data/testCatalog'
import { ageFromBirthDate } from '@/lib/format'
import {
  bodyWeightAt,
  clearData,
  exportData,
  importData,
  loadData,
  newId,
  removeResult,
  saveData,
  upsertBiometric,
  upsertResult,
} from './localStore'
import type { StoredBiometric, StoredData, StoredProfile, StoredResult } from './types'

/**
 * Zentraler Datenzugriff der App.
 *
 * Alle Screens lesen und schreiben hierüber, nie direkt am Speicher. Dadurch
 * ist der Wechsel vom Gastmodus (lokal) auf ein Konto (Supabase) ein Austausch
 * dieser einen Schicht und nicht ein Umbau jedes Screens.
 */

export type AppMode = 'guest' | 'demo'

interface AppDataValue {
  mode: AppMode
  data: StoredData
  /** Körpergewicht zum Stichtag, für Relativkraft und Sinclair. */
  bodyWeightAt: (iso: string) => number | null
  saveProfile: (patch: Partial<StoredProfile>) => void
  saveBiometric: (entry: Omit<StoredBiometric, 'id' | 'createdAt'>) => void
  /** Legt ein Ergebnis an und rechnet die abgeleiteten Metriken gleich mit. */
  recordResult: (input: {
    testSlug: string
    performedAt: string
    values: Record<string, number>
    notes?: string
  }) => StoredResult | null
  deleteResult: (id: string) => void
  resetAll: () => void
  loadDemo: () => void
  exportJson: () => string
  importJson: (json: string) => boolean
  /** Meldet, ob der letzte Schreibvorgang gescheitert ist (volle oder gesperrte Ablage). */
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

export function AppDataProvider({
  mode,
  children,
}: {
  mode: AppMode
  children: React.ReactNode
}) {
  /**
   * Beim ersten Betreten des Demomodus einmalig befüllen — synchron beim
   * ersten Rendern, nicht nachgeladen. Ein nachgereichter Datensatz liesse
   * erst den Leerzustand erscheinen und würde das Layout verschieben, sobald
   * er eintrifft; genau darauf gehen Fehlklicks zurück.
   *
   * Danach ist es ein ganz normaler Bestand, der sich bearbeiten und löschen
   * lässt.
   */
  const [data, setData] = useState<StoredData>(() => {
    const stored = loadData()
    if (mode === 'demo' && stored.results.length === 0) return buildDemoData()
    return stored
  })
  const [storageBlocked, setStorageBlocked] = useState(false)

  // Den erzeugten Demobestand einmalig festschreiben.
  useEffect(() => {
    if (mode === 'demo' && loadData().results.length === 0 && data.results.length > 0) {
      if (!saveData(data)) setStorageBlocked(true)
    }
    // Nur beim Moduswechsel, nicht bei jeder Änderung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const commit = useCallback((next: StoredData) => {
    setData(next)
    if (!saveData(next)) setStorageBlocked(true)
  }, [])

  const saveProfile = useCallback(
    (patch: Partial<StoredProfile>) =>
      commit({ ...data, profile: { ...data.profile, ...patch } }),
    [commit, data],
  )

  const saveBiometric = useCallback(
    (entry: Omit<StoredBiometric, 'id' | 'createdAt'>) =>
      commit(
        upsertBiometric(data, { ...entry, id: newId(), createdAt: new Date().toISOString() }),
      ),
    [commit, data],
  )

  const recordResult = useCallback<AppDataValue['recordResult']>(
    ({ testSlug, performedAt, values, notes }) => {
      const test = getTest(testSlug)
      if (!test) return null

      const ctx = {
        bodyWeightKg: bodyWeightAt(data, performedAt),
        ageYears: ageFromBirthDate(data.profile.birthDate),
        sex: data.profile.sex,
      }
      const metrics = deriveMetrics(test, values, ctx)
      const result: StoredResult = {
        id: newId(),
        testSlug,
        performedAt,
        values,
        metrics,
        score: primaryValue(test, values, metrics),
        bodyWeightKg: ctx.bodyWeightKg,
        ageYears: ctx.ageYears,
        sex: ctx.sex,
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
      bodyWeightAt: (iso) => bodyWeightAt(data, iso),
      saveProfile,
      saveBiometric,
      recordResult,
      deleteResult: (id) => commit(removeResult(data, id)),
      resetAll: () => {
        clearData()
        const empty = loadData()
        setData(empty)
        setStorageBlocked(false)
      },
      loadDemo: () => commit(buildDemoData()),
      exportJson: exportData,
      importJson: (json) => {
        const imported = importData(json)
        if (imported) setData(imported)
        return imported != null
      },
      storageBlocked,
    }),
    [mode, data, saveProfile, saveBiometric, recordResult, commit, storageBlocked],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData muss innerhalb von <AppDataProvider> benutzt werden')
  return ctx
}
