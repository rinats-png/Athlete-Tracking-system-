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
  type AthleteData,
  type ImportOutcome,
  type StoredAssessment,
  type StoredAthlete,
  type StoredBiometric,
  type StoredData,
  type StoredResult,
} from './localStore'
import { emptyAthlete } from './schema'
import type { AttemptSelection, LoadReport, ValidatedContext } from './schema'

/** Leere Messbedingungen — nichts erfasst heisst nicht «unbekannt geraten». */
const EMPTY_CONTEXT: ValidatedContext = {
  surface: '',
  temperatureC: null,
  timeOfDay: null,
  equipment: '',
  trainingStatus: '',
}

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
  /** Bedingungen der Messung. Fehlt, wenn nichts erfasst wurde. */
  measurementContext?: Partial<ValidatedContext>
  notes?: string
}

interface AppDataValue {
  mode: AppMode
  /**
   * Bestand des AKTIVEN Athleten. Jeder Screen liest hierauf und muss deshalb
   * nicht wissen, ob gerade ein einzelner Nutzer oder ein Trainer mit zehn
   * Kunden vor dem Gerät sitzt.
   */
  data: AthleteData
  /** Rolle des Geräts: eigener Bestand oder mehrere betreute Athleten. */
  role: StoredData['role']
  setRole: (role: StoredData['role']) => void
  athletes: StoredAthlete[]
  activeAthleteId: string
  switchAthlete: (id: string) => void
  addAthlete: (name: string) => string
  renameAthlete: (id: string, name: string) => void
  /** Archiviert statt gelöscht — Messwerte gehen nie verloren. */
  archiveAthlete: (id: string, archived: boolean) => void
  /** Endgültig, mit allem Bestand. Nur auf ausdrückliche Bestätigung. */
  deleteAthlete: (id: string) => void
  /** Befund des letzten Ladevorgangs: Migration, abgewiesene Datensätze. */
  loadReport: LoadReport
  /** Körpergewicht zum Stichtag, für Relativkraft und Sinclair. */
  bodyWeightAt: (iso: string) => number | null
  saveProfile: (patch: Partial<AthleteData['profile']>) => void
  saveBranding: (patch: Partial<StoredData['branding']>) => void
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
  const [store, setStore] = useState<StoredData>(() =>
    mode === 'demo' && countResults(initial.data) === 0 ? buildDemoData() : initial.data,
  )
  const [storageBlocked, setStorageBlocked] = useState(initial.unavailable)

  useEffect(() => {
    if (mode === 'demo' && countResults(initial.data) === 0 && countResults(store) > 0) {
      if (!saveData(store)) setStorageBlocked(true)
    }
    // Nur beim Moduswechsel, nicht bei jeder Änderung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const commitStore = useCallback((next: StoredData) => {
    setStore(next)
    if (!saveData(next)) setStorageBlocked(true)
  }, [])

  /**
   * Der aktive Athlet. Fällt die Kennung ins Leere — etwa nach einem Import
   * eines fremden Bestands — wird der erste genommen statt eine leere Seite
   * zu zeigen.
   */
  const active =
    store.athletes.find((a) => a.id === store.activeAthleteId) ?? store.athletes[0]

  const data: AthleteData = useMemo(
    () => ({
      branding: store.branding,
      profile: active.profile,
      biometrics: active.biometrics,
      assessments: active.assessments,
      results: active.results,
    }),
    [store.branding, active],
  )

  /** Änderung am aktiven Athleten zurück in den Gesamtbestand schreiben. */
  const commitAthlete = useCallback(
    (next: AthleteData) => {
      commitStore({
        ...store,
        branding: next.branding,
        athletes: store.athletes.map((athlete) =>
          athlete.id === active.id
            ? {
                ...athlete,
                profile: next.profile,
                biometrics: next.biometrics,
                assessments: next.assessments,
                results: next.results,
              }
            : athlete,
        ),
      })
    },
    [commitStore, store, active.id],
  )

  const recordResult = useCallback<AppDataValue['recordResult']>(
    ({ testSlug, performedAt, values, assessmentId = null, attempts = [], attemptSelection = null, measurementContext, notes }) => {
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
        context: { ...EMPTY_CONTEXT, ...measurementContext },
        notes,
        createdAt: new Date().toISOString(),
      }
      commitAthlete(upsertResult(data, result))
      return result
    },
    [commitAthlete, data],
  )

  const value = useMemo<AppDataValue>(
    () => ({
      mode,
      data,
      role: store.role,
      setRole: (role) => commitStore({ ...store, role }),
      athletes: store.athletes,
      activeAthleteId: active.id,
      switchAthlete: (id) => {
        if (store.athletes.some((a) => a.id === id)) {
          commitStore({ ...store, activeAthleteId: id })
        }
      },
      addAthlete: (name) => {
        const athlete = { ...emptyAthlete(newId()), name: name.trim().slice(0, 120) }
        // Ein neu angelegter Athlet wird sofort der aktive: alles andere wäre
        // ein zusätzlicher Klick für den einzigen sinnvollen nächsten Schritt.
        commitStore({
          ...store,
          athletes: [...store.athletes, athlete],
          activeAthleteId: athlete.id,
        })
        return athlete.id
      },
      renameAthlete: (id, name) =>
        commitStore({
          ...store,
          athletes: store.athletes.map((a) =>
            a.id === id ? { ...a, name: name.slice(0, 120) } : a,
          ),
        }),
      archiveAthlete: (id, archived) => {
        const remaining = store.athletes.filter((a) => a.id !== id && !a.archived)
        commitStore({
          ...store,
          athletes: store.athletes.map((a) => (a.id === id ? { ...a, archived } : a)),
          // Wer den aktiven Athleten archiviert, soll nicht auf einem
          // ausgeblendeten Bestand stehen bleiben.
          activeAthleteId:
            archived && id === active.id && remaining.length > 0
              ? remaining[0].id
              : store.activeAthleteId,
        })
      },
      deleteAthlete: (id) => {
        // Der letzte Athlet lässt sich nicht löschen — ein Bestand ohne
        // Athleten ist nicht darstellbar. Zum Leeren gibt es "alles löschen".
        const rest = store.athletes.filter((a) => a.id !== id)
        if (rest.length === 0) return
        commitStore({
          ...store,
          athletes: rest,
          activeAthleteId: id === active.id ? rest[0].id : store.activeAthleteId,
        })
      },
      loadReport: initial.report,
      bodyWeightAt: (iso) => bodyWeightAt(data, iso),
      saveProfile: (patch) => commitAthlete({ ...data, profile: { ...data.profile, ...patch } }),
      saveBranding: (patch) => commitStore({ ...store, branding: { ...store.branding, ...patch } }),
      saveBiometric: (entry) =>
        commitAthlete(
          upsertBiometric(data, { ...entry, id: newId(), createdAt: new Date().toISOString() }),
        ),
      recordResult,
      deleteResult: (id) => commitAthlete(removeResult(data, id)),
      saveAssessment: (assessment) => commitAthlete(upsertAssessment(data, assessment)),
      deleteAssessment: (id) => commitAthlete(removeAssessment(data, id)),
      resetAll: () => {
        clearData()
        setStore(emptyData())
        setStorageBlocked(false)
      },
      loadDemo: () => commitStore(buildDemoData()),
      exportJson: () => exportData(store),
      importJson: (json) => {
        const outcome = importData(json)
        if (outcome.ok && outcome.data) setStore(outcome.data)
        return outcome
      },
      storageBlocked,
    }),
    [mode, data, store, active.id, initial.report, recordResult, commitAthlete, commitStore, storageBlocked],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

/** Messungen über alle Athleten — nur zur Frage «ist der Bestand leer?». */
function countResults(store: StoredData): number {
  return store.athletes.reduce((sum, athlete) => sum + athlete.results.length, 0)
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData muss innerhalb von <AppDataProvider> benutzt werden')
  return context
}
