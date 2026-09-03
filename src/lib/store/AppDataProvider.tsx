import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { clearBackup, recoverFromBackup, writeBackup } from './backup'
import { backupReminder, type BackupReminder } from '@/domain/backupReminder'
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
import { AUDIT_LIMIT, emptyAthlete } from './schema'
import type {
  AttemptSelection,
  LoadReport,
  ValidatedAudit,
  ValidatedContext,
} from './schema'

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
  /** Notizen des Trainers zum aktiven Athleten (§74). */
  athleteNotes: string
  saveAthleteNotes: (notes: string) => void
  /** Änderungsnachweis des aktiven Athleten, neueste zuerst (§57). */
  audit: ValidatedAudit[]
  saveBiometric: (entry: Omit<StoredBiometric, 'id' | 'createdAt'>) => void
  /** Legt ein Ergebnis an und rechnet die abgeleiteten Metriken gleich mit. */
  recordResult: (input: RecordResultInput) => StoredResult | null
  deleteResult: (id: string) => void
  /** Belegbild an ein bestehendes Ergebnis hängen oder entfernen (§14). */
  setResultPhoto: (id: string, dataUrl: string | null) => void
  saveAssessment: (assessment: StoredAssessment) => void
  deleteAssessment: (id: string) => void
  resetAll: () => void
  loadDemo: () => void
  exportJson: () => string
  importJson: (json: string) => ImportOutcome
  /** Meldet, ob der letzte Schreibvorgang gescheitert ist. */
  storageBlocked: boolean
  /** Ob und warum eine Sicherung fällig ist (§32). */
  backupDue: BackupReminder
  /** Der Export ist erfolgt — Grundlage der nächsten Erinnerung. */
  markExported: () => void
  /**
   * Der Bestand kam aus der Zweitschrift zurück, weil der Gerätespeicher
   * geräumt worden war. Trägt den Zeitpunkt der Zweitschrift.
   */
  recoveredAt: string | null
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
  /**
   * Der jeweils letzte geschriebene Stand, synchron.
   *
   * DER FEHLER, DEN DAS BEHEBT: Drei Schreibvorgänge hintereinander im
   * selben Ereignis — Profil, Gewicht, Ergebnis — bauten alle auf demselben
   * alten Bestand auf, weil der Zustand von React erst beim nächsten Rendern
   * nachzieht. Der letzte gewann, die beiden ersten waren weg: ein Einstieg,
   * der Profil und Ergebnis speichert, verlor das Profil. Die Referenz hält
   * den Stand fest, sobald er geschrieben ist, nicht erst, sobald er
   * gerendert ist.
   */
  const storeRef = useRef<StoredData>(store)
  const [recoveredAt, setRecoveredAt] = useState<string | null>(null)

  /**
   * Wiederherstellung nach einer Räumung des Gerätespeichers.
   *
   * Nur wenn der `localStorage` gar nichts hergab UND noch nichts gemessen
   * wurde, darf die Zweitschrift einspringen. Sonst überschriebe eine alte
   * Sicherung einen frischen Bestand — genau der Datenverlust, den sie
   * verhindern soll.
   */
  useEffect(() => {
    if (mode === 'demo') return
    if (initial.unavailable) return
    // Lag ein Eintrag vor, ist er die Wahrheit — auch ein leerer. Sonst
    // überschriebe eine alte Sicherung einen absichtlich geleerten Bestand.
    if (!initial.absent) return
    let abgebrochen = false
    void recoverFromBackup().then((recovery) => {
      if (abgebrochen || !recovery) return
      // In der Zwischenzeit wurde schon geschrieben: dann gilt das Neue.
      if (storeRef.current !== initial.data) return
      storeRef.current = recovery.data
      setStore(recovery.data)
      setRecoveredAt(recovery.savedAt)
      saveData(recovery.data)
    })
    return () => {
      abgebrochen = true
    }
    // Einmal beim Start, nicht bei jeder Änderung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    if (mode === 'demo' && countResults(initial.data) === 0 && countResults(store) > 0) {
      if (!saveData(store)) setStorageBlocked(true)
    }
    // Nur beim Moduswechsel, nicht bei jeder Änderung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const commitStore = useCallback(
    (next: StoredData) => {
      storeRef.current = next
      setStore(next)
      if (!saveData(next)) setStorageBlocked(true)
      // Die Zweitschrift läuft nebenher: sie darf die Eingabe nicht bremsen,
      // und ihr Scheitern ist kein Fehler der Sitzung.
      if (mode !== 'demo') void writeBackup(next)
    },
    [mode],
  )

  /** Sicht auf den aktiven Athleten eines beliebigen Stands. */
  const viewOf = (source: StoredData): AthleteData => {
    const athlete = source.athletes.find((a) => a.id === source.activeAthleteId) ?? source.athletes[0]
    return {
      branding: source.branding,
      profile: athlete.profile,
      biometrics: athlete.biometrics,
      assessments: athlete.assessments,
      results: athlete.results,
    }
  }

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

  /**
   * Änderung am aktiven Athleten zurück in den Gesamtbestand schreiben,
   * zusammen mit einem Eintrag im Änderungsnachweis (§57).
   *
   * Der Nachweis hält fest, WANN WAS passiert ist — nicht, was vorher
   * drinstand. Ein Verlaufsspeicher mit allen alten Ständen wäre ein
   * zweiter Bestand mit denselben personenbezogenen Daten, den niemand
   * angefordert hat.
   */
  const commitAthlete = useCallback(
    (update: (current: AthleteData) => AthleteData, event?: Omit<ValidatedAudit, 'id' | 'at'>) => {
      const entry: ValidatedAudit | null = event
        ? { ...event, id: newId(), at: new Date().toISOString() }
        : null
      const source = storeRef.current
      const activeId = source.athletes.some((a) => a.id === source.activeAthleteId)
        ? source.activeAthleteId
        : source.athletes[0].id
      const next = update(viewOf(source))

      commitStore({
        ...source,
        branding: next.branding,
        athletes: source.athletes.map((athlete) =>
          athlete.id === activeId
            ? {
                ...athlete,
                profile: next.profile,
                biometrics: next.biometrics,
                assessments: next.assessments,
                results: next.results,
                audit: entry ? [entry, ...athlete.audit].slice(0, AUDIT_LIMIT) : athlete.audit,
              }
            : athlete,
        ),
      })
    },
    [commitStore],
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
        // Ein Beleg kommt nach dem Eintragen dazu, nicht währenddessen: die
        // Zahl ist der Zweck, das Bild ist die Absicherung.
        photo: null,
        createdAt: new Date().toISOString(),
      }
      commitAthlete((current) => upsertResult(current, result), {
        action: 'created',
        entity: 'result',
        entityId: result.id,
        label: test.name.de,
      })
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
        const base = emptyAthlete(newId())
        // Ein vom Trainer angelegter Kunde gilt als eingerichtet: seine
        // Angaben kommen aus dem Profil, nicht aus dem Einstieg.
        const athlete = {
          ...base,
          name: name.trim().slice(0, 120),
          profile: { ...base.profile, onboardingCompletedAt: new Date().toISOString() },
        }
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
      saveProfile: (patch) =>
        commitAthlete((current) => ({ ...current, profile: { ...current.profile, ...patch } })),
      saveBranding: (patch) => commitStore({ ...store, branding: { ...store.branding, ...patch } }),
      saveBiometric: (entry) =>
        commitAthlete((current) =>
          upsertBiometric(current, { ...entry, id: newId(), createdAt: new Date().toISOString() }),
        ),
      recordResult,
      setResultPhoto: (id, dataUrl) => {
        const target = data.results.find((r) => r.id === id)
        if (!target) return
        commitAthlete(
          (current) => ({
            ...current,
            results: current.results.map((r) =>
              r.id === id
                ? { ...r, photo: dataUrl ? { dataUrl, addedAt: new Date().toISOString() } : null }
                : r,
            ),
          }),
          {
            action: 'edited',
            entity: 'result',
            entityId: id,
            label: getTest(target.testSlug)?.name.de ?? target.testSlug,
          },
        )
      },
      deleteResult: (id) => {
        const removed = data.results.find((r) => r.id === id)
        commitAthlete((current) => removeResult(current, id), {
          action: 'deleted',
          entity: 'result',
          entityId: id,
          label: removed ? (getTest(removed.testSlug)?.name.de ?? removed.testSlug) : '',
        })
      },
      saveAssessment: (assessment) =>
        commitAthlete((current) => upsertAssessment(current, assessment), {
          action: data.assessments.some((a) => a.id === assessment.id) ? 'edited' : 'created',
          entity: 'assessment',
          entityId: assessment.id,
          label: assessment.title ?? assessment.performedOn,
        }),
      deleteAssessment: (id) =>
        commitAthlete((current) => removeAssessment(current, id), {
          action: 'deleted',
          entity: 'assessment',
          entityId: id,
          label: data.assessments.find((a) => a.id === id)?.title ?? '',
        }),
      resetAll: () => {
        clearData()
        void clearBackup()
        const fresh = emptyData()
        storeRef.current = fresh
        setStore(fresh)
        setStorageBlocked(false)
      },
      loadDemo: () => commitStore(buildDemoData()),
      athleteNotes: active.notes,
      saveAthleteNotes: (notes) =>
        commitStore({
          ...store,
          athletes: store.athletes.map((a) =>
            a.id === active.id ? { ...a, notes: notes.slice(0, 4000) } : a,
          ),
        }),
      audit: active.audit,
      exportJson: () => exportData(store),
      backupDue: backupReminder(store),
      markExported: () => commitStore({ ...store, lastExportAt: new Date().toISOString() }),
      recoveredAt,
      importJson: (json) => {
        const outcome = importData(json)
        if (outcome.ok && outcome.data) {
          storeRef.current = outcome.data
          setStore(outcome.data)
        }
        return outcome
      },
      storageBlocked,
    }),
    [mode, data, store, active.id, initial.report, recordResult, commitAthlete, commitStore, storageBlocked, recoveredAt],
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
