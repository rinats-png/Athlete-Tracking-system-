import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { clearBackup, recoverFromBackup, writeBackup } from './backup'
import { backupReminder, type BackupReminder } from '@/domain/backupReminder'
import { buildDemoData } from '@/data/demoSeed'
import { deriveMetrics, primaryValue } from '@/lib/metrics/derive'
import { exportAthlete, importAthlete } from '@/lib/store/handover'
import type { HandoverOutcome } from '@/lib/store/handover'
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
  type StoredTestDay,
  type StoredObservation,
  type StoredDiaryEntry,
  type StoredWorkout,
  type StoredDecision,
  type StoredCockpit,
  type StoredMeal,
  type StoredNutrition,
  type StoredHealth,
  type StoredPeakWeek,
  type StoredAthlete,
  type StoredBiometric,
  type StoredData,
  type StoredFocus,
  type StoredResult,
} from './localStore'
import { AUDIT_LIMIT, emptyAthlete, type DiaryOptionalField } from './schema'
import { isEmptyEntry } from '@/domain/diary'
import { mergeSeries, type SeriesRow } from '@/lib/supabase/series'
import { mergeHealth, type IncomingHealth } from '@/lib/health/sync'
import { FOCUS_HARD_LIMIT } from '@/domain/trainingFocus'
import { withTracking } from './trackedActions'
import type {
  AttemptSelection,
  LoadReport,
  ValidatedAudit,
  ValidatedContext,
  ProtocolInfo,
} from './schema'

/** Leere Messbedingungen — nichts erfasst heisst nicht «unbekannt geraten». */
const EMPTY_CONTEXT: ValidatedContext = {
  surface: '',
  temperatureC: null,
  timeOfDay: null,
  equipment: '',
  trainingStatus: '',
}

/** Keine Protokollangaben — «Protokoll unbekannt». */
const EMPTY_PROTOCOL: ProtocolInfo = {
  version: null,
  method: null,
  tester: '',
  deviation: '',
  abortReason: '',
  invalidAttempts: [],
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
  /** Protokollangaben (v1.0). Fehlt bei Eingängen ohne Protokoll. */
  protocol?: Partial<ProtocolInfo>
  notes?: string
}

export interface AppDataValue {
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
  /**
   * Legt einen betreuten Athleten an. `activate` steuert, ob er sofort der
   * aktive wird — im Einstieg darf er das NICHT, sonst wechselt der Bestand
   * unter dem laufenden Ablauf weg.
   */
  addAthlete: (name: string, options?: { activate?: boolean }) => string
  renameAthlete: (id: string, name: string) => void
  /**
   * Beobachtungswerte des aktiven Athleten. Sie tragen KEINEN Score und
   * KEINE Achse — deshalb stehen sie neben `data.results` und nicht darin.
   */
  observations: StoredObservation[]
  addObservation: (entry: { key: string; observedAt: string; value: number; device: string; note: string }) => void
  deleteObservation: (id: string) => void
  /**
   * Tagebuch des aktiven Athleten (Schicht S1). Ein Eintrag je Tag.
   *
   * `saveDiaryEntry` legt den Tag an oder ergänzt ihn — ein Feld nach dem
   * anderen, so wie es abends eingetippt wird. Wird der Eintrag dadurch
   * leer, verschwindet er: ein leerer Tag ist kein Tag, sondern eine Lücke.
   */
  diary: StoredDiaryEntry[]
  saveDiaryEntry: (day: string, patch: Partial<Omit<StoredDiaryEntry, 'id' | 'day' | 'createdAt' | 'updatedAt'>>) => void
  /** Welche freiwilligen Felder dieser Athlet im Tagebuch sieht. */
  diaryFields: DiaryOptionalField[]
  setDiaryFields: (fields: DiaryOptionalField[]) => void
  /**
   * Trainingslog des aktiven Athleten (Schicht S2).
   *
   * Eine Einheit mit Dauer und RPE schreibt ihre Session-Last ins Tagebuch
   * desselben Tages — als Tagebuch-Einheit mit fester Kennung, damit ein
   * zweites Speichern sie ersetzt und ein Löschen sie mitnimmt. Eine Last,
   * die an zwei Stellen stünde, wäre zwei Wahrheiten.
   */
  workouts: StoredWorkout[]
  saveWorkout: (workout: StoredWorkout) => void
  deleteWorkout: (id: string) => void
  /**
   * Decision-Log und Cockpit-Schwellen des aktiven Athleten (Schicht S3).
   * Entscheidungen werden nie gelöscht, nur verworfen: ein Log, aus dem
   * Einträge verschwinden, beweist nichts.
   */
  decisions: StoredDecision[]
  saveDecision: (decision: StoredDecision) => void
  cockpit: StoredCockpit
  saveCockpit: (patch: Partial<StoredCockpit>) => void
  /** Mahlzeiten und Aktivitätsniveau des aktiven Athleten (Schicht S4). */
  meals: StoredMeal[]
  saveMeal: (meal: StoredMeal) => void
  deleteMeal: (id: string) => void
  nutrition: StoredNutrition
  saveNutrition: (patch: Partial<StoredNutrition>) => void
  /**
   * Gesundheitsschicht (S5, Art. 9). Bewusst EIN Zugang statt zehn
   * Speicherfunktionen: die Regeln stehen in domain/health.ts und geben
   * jeweils ein neues Objekt zurück — der Provider legt es nur ab. So kann
   * kein Bildschirm die Einwilligung umgehen, indem er eine Liste direkt
   * beschreibt.
   */
  health: StoredHealth
  updateHealth: (fn: (health: StoredHealth) => StoredHealth) => void
  peakWeeks: StoredPeakWeek[]
  savePeakWeek: (week: StoredPeakWeek) => void
  deletePeakWeek: (id: string) => void
  /** Verschluesselte Datensaetze vom Server einarbeiten (S5). Gibt zurueck, wie viele wirkten. */
  mergeHealthRecords: (athleteId: string, incoming: IncomingHealth[]) => number
  /** Einwilligung eines Athleten setzen. */
  setConsent: (id: string, consent: StoredAthlete['consent']) => void
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
  /**
   * Trainingsschwerpunkte des aktiven Athleten (§74).
   *
   * Der Text kommt vom Trainer; die App wertet ihn nie aus und erzeugt ihn
   * nie. Angelegt und geschlossen wird ausdrücklich von Hand — ein
   * Schwerpunkt, den die App selbst setzt, wäre eine Trainingsempfehlung.
   */
  /** Der gesamte Bestand — für Export, Sicherung und Abgleich. */
  store: StoredData
  /**
   * Athleten aus einer Zweitschrift übernehmen.
   *
   * NUR HINZUFÜGEN, nie ersetzen: ein Abgleich, der einen lokalen Athleten
   * überschreibt, wäre genau der Datenverlust, den §89 verbietet. Wer schon
   * hier ist, bleibt unangetastet; über abweichende Stände entscheidet der
   * Nutzer im Profil.
   */
  mergeAthletes: (incoming: StoredAthlete[]) => void
  /**
   * Fremde Zeitreihen-Zeilen (Tagebuch, Einheiten, Entscheidungen,
   * Mahlzeiten) in die vorhandenen Athleten einarbeiten. Der juengere
   * Eintrag gewinnt; ein Grabstein loescht. Siehe lib/supabase/series.ts.
   */
  mergeSeriesRows: (rows: SeriesRow[]) => number
  focuses: StoredFocus[]
  saveFocus: (focus: StoredFocus) => void
  closeFocus: (id: string, closed: boolean) => void
  deleteFocus: (id: string) => void
  /** Änderungsnachweis des aktiven Athleten, neueste zuerst (§57). */
  audit: ValidatedAudit[]
  saveBiometric: (entry: Omit<StoredBiometric, 'id' | 'createdAt'>) => void
  /** Legt ein Ergebnis an und rechnet die abgeleiteten Metriken gleich mit. */
  recordResult: (input: RecordResultInput) => StoredResult | null
  deleteResult: (id: string) => void
  /**
   * Einen Messwert korrigieren.
   *
   * DIE LÜCKE, DIE DAS SCHLIESST: bisher liess sich ein Ergebnis nur löschen.
   * Wer 172,5 statt 127,5 eintippte, musste es wegwerfen und neu erfassen —
   * und verlor dabei Datum, Bedingungen, Beleg und die Zuordnung zum Termin.
   * Der häufigste Handgriff war der einzige, den die App nicht konnte.
   *
   * Abgeleitete Werte werden NEU GERECHNET, nicht mitgeschleppt: eine
   * korrigierte Last mit dem alten Relativkraftwert daneben wäre ein stiller
   * Rechenfehler (§89). Auch Körpergewicht und Alter zum — womöglich
   * geänderten — Messtag werden neu bestimmt.
   */
  editResult: (
    id: string,
    patch: {
      values?: Record<string, number>
      performedAt?: string
      measurementContext?: Partial<ValidatedContext>
      protocol?: Partial<ProtocolInfo>
      notes?: string
    },
  ) => StoredResult | null
  /** Belegbild an ein bestehendes Ergebnis hängen oder entfernen (§14). */
  setResultPhoto: (id: string, dataUrl: string | null) => void
  /**
   * Eine Station eines Gruppentests: ein Test, viele Athleten, ein
   * Schreibvorgang. Gibt die Zahl der geschriebenen Ergebnisse zurück.
   */
  /**
   * `conditions` gilt für ALLE geschriebenen Werte: an einem Testtag sind
   * Untergrund, Temperatur und Ausrüstung für jeden dieselben.
   */
  recordForGroup: (
    testSlug: string,
    performedAt: string,
    values: Record<string, number>[],
    conditions?: { surface: string; temperatureC: number | null; equipment: string },
  ) => number
  saveAssessment: (assessment: StoredAssessment) => void
  /** Testtage des Geräts. Gehören keinem einzelnen Athleten. */
  testDays: StoredTestDay[]
  saveTestDay: (day: StoredTestDay) => void
  /** Einen einzelnen Athleten zur Übergabe ausgeben. Null, wenn es ihn nicht gibt. */
  exportAthleteJson: (athleteId: string) => string | null
  /** Einen übergebenen Athleten aufnehmen — ergänzend, nie ersetzend. */
  importAthleteJson: (json: string) => HandoverOutcome
  deleteTestDay: (id: string) => void
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

const MODE_KEY = 'kydon.mode'

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
    ({ testSlug, performedAt, values, assessmentId = null, attempts = [], attemptSelection = null, measurementContext, protocol, notes }) => {
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
        protocol: { ...EMPTY_PROTOCOL, ...protocol },
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


  /**
   * Schwerpunkte schreiben.
   *
   * Eigener Weg statt `commitAthlete`, weil Schwerpunkte nicht Teil der
   * Athletensicht sind: die Auswertungen rechnen mit Messwerten, und ein
   * Trainersatz darf in keine Rechnung geraten. Der Nachweis hält fest, DASS
   * etwas geändert wurde, nicht was drinstand (§57).
   */
  const commitFocuses = useCallback(
    (
      update: (current: StoredFocus[]) => StoredFocus[],
      event: { action: ValidatedAudit['action']; id: string },
    ) => {
      const source = storeRef.current
      const activeId = source.athletes.some((a) => a.id === source.activeAthleteId)
        ? source.activeAthleteId
        : source.athletes[0].id
      const entry: ValidatedAudit = {
        id: newId(),
        at: new Date().toISOString(),
        action: event.action,
        entity: 'focus',
        entityId: event.id,
        label: '',
      }
      commitStore({
        ...source,
        athletes: source.athletes.map((athlete) =>
          athlete.id === activeId
            ? {
                ...athlete,
                focuses: update(athlete.focuses).slice(0, FOCUS_HARD_LIMIT),
                audit: [entry, ...athlete.audit].slice(0, AUDIT_LIMIT),
              }
            : athlete,
        ),
      })
    },
    [commitStore],
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
      addAthlete: (name, options) => {
        const activate = options?.activate ?? true
        // Der jeweils letzte geschriebene Stand, nicht der zuletzt
        // gerenderte: zwei Athleten kurz hintereinander angelegt, und der
        // erste wäre sonst wieder weg.
        const source = storeRef.current
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
          ...source,
          athletes: [...source.athletes, athlete],
          activeAthleteId: activate ? athlete.id : source.activeAthleteId,
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
      observations:
        store.athletes.find((a) => a.id === store.activeAthleteId)?.observations ?? [],
      addObservation: (entry) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) =>
            a.id === current.activeAthleteId
              ? {
                  ...a,
                  observations: [
                    ...a.observations,
                    { id: newId(), createdAt: new Date().toISOString(), ...entry },
                  ],
                }
              : a,
          ),
        })
      },
      diary: store.athletes.find((a) => a.id === store.activeAthleteId)?.diary ?? [],
      saveDiaryEntry: (day, patch) => {
        const current = storeRef.current
        const now = new Date().toISOString()
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => {
            if (a.id !== current.activeAthleteId) return a
            const existing = a.diary.find((e) => e.day === day)
            const merged: StoredDiaryEntry = existing
              ? { ...existing, ...patch, updatedAt: now }
              : {
                  id: newId(),
                  day,
                  weightKg: null,
                  sleepHours: null,
                  sleepQuality: null,
                  energy: null,
                  stress: null,
                  soreness: null,
                  steps: null,
                  adherence: null,
                  sessions: [],
                  note: '',
                  ...patch,
                  createdAt: now,
                  updatedAt: now,
                }
            const rest = a.diary.filter((e) => e.day !== day)
            return { ...a, diary: isEmptyEntry(merged) ? rest : [...rest, merged] }
          }),
        })
      },
      diaryFields: store.athletes.find((a) => a.id === store.activeAthleteId)?.diaryFields ?? [],
      setDiaryFields: (fields) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) =>
            a.id === current.activeAthleteId ? { ...a, diaryFields: fields } : a,
          ),
        })
      },
      workouts: store.athletes.find((a) => a.id === store.activeAthleteId)?.workouts ?? [],
      saveWorkout: (workout) => {
        const current = storeRef.current
        const now = new Date().toISOString()
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => {
            if (a.id !== current.activeAthleteId) return a
            const previous = a.workouts.find((w) => w.id === workout.id) ?? null
            const sessionId = workout.diarySessionId ?? previous?.diarySessionId ?? newId()
            const wantsSession = workout.durationMin != null && workout.rpe != null
            // Die alte Tagebuch-Einheit weicht — auch wenn der Tag gewechselt hat.
            let diary = a.diary.map((e) => ({ ...e, sessions: e.sessions.filter((s) => s.id !== sessionId) }))
            if (wantsSession) {
              const existing = diary.find((e) => e.day === workout.day)
              const session = { id: sessionId, kind: 'strength' as const, durationMin: workout.durationMin!, rpe: workout.rpe!, note: workout.title.slice(0, 200) }
              diary = existing
                ? diary.map((e) => (e.day === workout.day ? { ...e, sessions: [...e.sessions, session], updatedAt: now } : e))
                : [...diary, { id: newId(), day: workout.day, weightKg: null, sleepHours: null, sleepQuality: null, energy: null, stress: null, soreness: null, steps: null, adherence: null, sessions: [session], note: '', createdAt: now, updatedAt: now }]
            }
            diary = diary.filter((e) => !isEmptyEntry(e))
            const saved: StoredWorkout = { ...workout, diarySessionId: wantsSession ? sessionId : null, updatedAt: now }
            return { ...a, diary, workouts: [...a.workouts.filter((w) => w.id !== workout.id), saved] }
          }),
        })
      },
      decisions: store.athletes.find((a) => a.id === store.activeAthleteId)?.decisions ?? [],
      saveDecision: (decision) => {
        const current = storeRef.current
        const now = new Date().toISOString()
        commitStore({
          ...current,
          athletes: current.athletes.map((a) =>
            a.id === current.activeAthleteId
              ? { ...a, decisions: [...a.decisions.filter((d) => d.id !== decision.id), { ...decision, updatedAt: now }] }
              : a,
          ),
        })
      },
      cockpit: store.athletes.find((a) => a.id === store.activeAthleteId)?.cockpit ?? { sleepDropPct: 15, energyDropPct: 15, stressRisePct: 25, weightChangePctWeek: 1, adherenceBelow: 4, minCompletenessPct: 70 },
      saveCockpit: (patch) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => (a.id === current.activeAthleteId ? { ...a, cockpit: { ...a.cockpit, ...patch } } : a)),
        })
      },
      meals: store.athletes.find((a) => a.id === store.activeAthleteId)?.meals ?? [],
      saveMeal: (meal) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => (a.id === current.activeAthleteId ? { ...a, meals: [...a.meals.filter((m) => m.id !== meal.id), meal] } : a)),
        })
      },
      deleteMeal: (id) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => (a.id === current.activeAthleteId ? { ...a, meals: a.meals.filter((m) => m.id !== id) } : a)),
        })
      },
      nutrition: store.athletes.find((a) => a.id === store.activeAthleteId)?.nutrition ?? { pal: 1.55 },
      health: store.athletes.find((a) => a.id === store.activeAthleteId)?.health ?? { consents: [], labs: [], symptoms: [], cycle: [], selfImage: [], meds: [], photos: [], trainingKcalPerDay: null, updatedAt: null },
      updateHealth: (fn) => {
        const current = storeRef.current
        // Der Zeitstempel wird HIER gesetzt, an der einen Stelle, durch die
        // jede Aenderung laeuft: der verschluesselte Abgleich braucht ihn fuer
        // Einwilligungen und Einstellungen, die selbst keinen tragen.
        const at = new Date().toISOString()
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => (a.id === current.activeAthleteId ? { ...a, health: { ...fn(a.health), updatedAt: at } } : a)),
        })
      },
      peakWeeks: store.athletes.find((a) => a.id === store.activeAthleteId)?.peakWeeks ?? [],
      savePeakWeek: (week) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) =>
            a.id === current.activeAthleteId ? { ...a, peakWeeks: [...a.peakWeeks.filter((w) => w.id !== week.id), week] } : a,
          ),
        })
      },
      mergeHealthRecords: (athleteId, incoming) => {
        const current = storeRef.current
        let total = 0
        const athletes = current.athletes.map((a) => {
          if (a.id !== athleteId) return a
          const { athlete, changed } = mergeHealth(a, incoming)
          total += changed
          return athlete
        })
        // Nur schreiben, wenn wirklich etwas anders ist: sonst entstuende bei
        // jedem Abgleich ein neuer Stand ohne Aenderung.
        if (total > 0) commitStore({ ...current, athletes })
        return total
      },
      deletePeakWeek: (id) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => (a.id === current.activeAthleteId ? { ...a, peakWeeks: a.peakWeeks.filter((w) => w.id !== id) } : a)),
        })
      },
      saveNutrition: (patch) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => (a.id === current.activeAthleteId ? { ...a, nutrition: { ...a.nutrition, ...patch } } : a)),
        })
      },
      deleteWorkout: (id) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) => {
            if (a.id !== current.activeAthleteId) return a
            const gone = a.workouts.find((w) => w.id === id)
            const diary = gone?.diarySessionId
              ? a.diary
                  .map((e) => ({ ...e, sessions: e.sessions.filter((s) => s.id !== gone.diarySessionId) }))
                  .filter((e) => !isEmptyEntry(e))
              : a.diary
            return { ...a, diary, workouts: a.workouts.filter((w) => w.id !== id) }
          }),
        })
      },
      deleteObservation: (id) => {
        const current = storeRef.current
        commitStore({
          ...current,
          athletes: current.athletes.map((a) =>
            a.id === current.activeAthleteId
              ? { ...a, observations: a.observations.filter((o) => o.id !== id) }
              : a,
          ),
        })
      },
      setConsent: (id, consent) =>
        commitStore({
          ...storeRef.current,
          athletes: storeRef.current.athletes.map((a) => (a.id === id ? { ...a, consent } : a)),
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
      /**
       * Ein Test, viele Athleten, EIN Schreibvorgang.
       *
       * Athletenweise über `recordResult` zu gehen ginge nicht: die Aktion
       * schreibt immer in den aktiven Athleten, und zwischen zwei Aufrufen
       * zieht der Zustand nicht nach — die Werte überschrieben einander.
       * Deshalb baut diese Aktion den gesamten Bestand in einem Zug.
       */
      recordForGroup: (testSlug, performedAt, values, conditions) => {
        const test = getTest(testSlug)
        if (!test) return 0
        const source = storeRef.current
        let written = 0
        const athletes = source.athletes.map((athlete, index) => {
          const input = values[index]
          if (!input || Object.keys(input).length === 0) return athlete
          const view = {
            branding: source.branding,
            profile: athlete.profile,
            biometrics: athlete.biometrics,
            assessments: athlete.assessments,
            results: athlete.results,
          }
          const context = {
            bodyWeightKg: bodyWeightAt(view, performedAt),
            ageYears: ageFromBirthDate(athlete.profile.birthDate),
            sex: athlete.profile.sex,
          }
          const metrics = deriveMetrics(test, input, context)
          const result: StoredResult = {
            id: newId(),
            testSlug,
            performedAt,
            values: input,
            metrics,
            score: primaryValue(test, input, metrics),
            bodyWeightKg: context.bodyWeightKg,
            ageYears: context.ageYears,
            sex: context.sex,
            assessmentId: null,
            attempts: [],
            attemptSelection: null,
            context: { ...EMPTY_CONTEXT, ...(conditions ?? {}) },
            protocol: EMPTY_PROTOCOL,
            notes: undefined,
            photo: null,
            createdAt: new Date().toISOString(),
          }
          written++
          const entry: ValidatedAudit = {
            id: newId(),
            at: new Date().toISOString(),
            action: 'created',
            entity: 'result',
            entityId: result.id,
            label: test.name.de,
          }
          return {
            ...athlete,
            results: [result, ...athlete.results].sort((a, b) =>
              b.performedAt.localeCompare(a.performedAt),
            ),
            audit: [entry, ...athlete.audit].slice(0, AUDIT_LIMIT),
          }
        })
        if (written > 0) commitStore({ ...source, athletes })
        return written
      },
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
      editResult: (id, patch) => {
        const previous = data.results.find((r) => r.id === id)
        if (!previous) return null
        const test = getTest(previous.testSlug)
        if (!test) return null

        const performedAt = patch.performedAt ?? previous.performedAt
        const values = patch.values ?? previous.values
        const context = {
          bodyWeightKg: bodyWeightAt(data, performedAt),
          ageYears: ageFromBirthDate(data.profile.birthDate),
          sex: data.profile.sex,
        }
        const metrics = deriveMetrics(test, values, context)
        const next: StoredResult = {
          ...previous,
          performedAt,
          values,
          metrics,
          score: primaryValue(test, values, metrics),
          bodyWeightKg: context.bodyWeightKg,
          ageYears: context.ageYears,
          sex: context.sex,
          context: { ...previous.context, ...patch.measurementContext },
          protocol: { ...previous.protocol, ...patch.protocol },
          notes: patch.notes ?? previous.notes,
        }

        commitAthlete((current) => upsertResult(current, next), {
          action: 'edited',
          entity: 'result',
          entityId: id,
          label: test.name.de,
        })
        return next
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
      testDays: store.testDays,
      saveTestDay: (day) => {
        const current = storeRef.current
        const exists = current.testDays.some((d) => d.id === day.id)
        commitStore({
          ...current,
          testDays: exists
            ? current.testDays.map((d) => (d.id === day.id ? day : d))
            : [...current.testDays, day],
        })
      },
      deleteTestDay: (id) => {
        const current = storeRef.current
        // Nur die Planung verschwindet. Die Messwerte des Tages liegen bei den
        // Athleten und bleiben — ein gelöschter Plan darf keine Daten mitnehmen.
        commitStore({ ...current, testDays: current.testDays.filter((d) => d.id !== id) })
      },
      exportAthleteJson: (athleteId) => exportAthlete(storeRef.current, athleteId),
      importAthleteJson: (json) => {
        const outcome = importAthlete(json, storeRef.current)
        if (outcome.ok && outcome.data) commitStore(outcome.data)
        return outcome
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
      store,
      mergeAthletes: (incoming) => {
        const current = storeRef.current
        const known = new Set(current.athletes.map((a) => a.id))
        const fresh = incoming.filter((a) => a && !known.has(a.id))
        if (fresh.length === 0) return
        commitStore({ ...current, athletes: [...current.athletes, ...fresh] })
      },
      mergeSeriesRows: (rows) => {
        const current = storeRef.current
        let changed = 0
        const athletes = current.athletes.map((a) => {
          const r = mergeSeries(a, rows)
          changed += r.changed
          return r.athlete
        })
        if (changed > 0) commitStore({ ...current, athletes })
        return changed
      },
      focuses: active.focuses,
      saveFocus: (focus) =>
        commitFocuses(
          (current) =>
            current.some((f) => f.id === focus.id)
              ? current.map((f) => (f.id === focus.id ? focus : f))
              : [...current, focus],
          { action: active.focuses.some((f) => f.id === focus.id) ? 'edited' : 'created', id: focus.id },
        ),
      closeFocus: (id, closed) =>
        commitFocuses(
          (list) =>
            list.map((f) =>
              f.id === id ? { ...f, closedAt: closed ? new Date().toISOString() : null } : f,
            ),
          { action: 'edited', id },
        ),
      deleteFocus: (id) =>
        commitFocuses((list) => list.filter((f) => f.id !== id), { action: 'deleted', id }),
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
    [mode, data, store, active.id, active.focuses, initial.report, recordResult, commitAthlete, commitFocuses, commitStore, storageBlocked, recoveredAt],
  )

  // Die Zählung hängt an den Aktionen, nicht an den Bildschirmen — siehe
  // trackedActions.ts. Ohne Einwilligung ist jede Hülle ein Durchreichen.
  const tracked = useMemo(() => withTracking(value), [value])

  return <AppDataContext.Provider value={tracked}>{children}</AppDataContext.Provider>
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
