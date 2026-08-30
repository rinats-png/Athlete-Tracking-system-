import type { AppLocale, Sex } from '@/types/domain'
import type { UnitSystem } from '@/lib/format'

/** Ein gespeichertes Testergebnis. */
export interface StoredResult {
  id: string
  testSlug: string
  /** ISO-Zeitstempel der Durchführung. */
  performedAt: string
  /** Rohwerte, nach Feldschlüssel des Tests. */
  values: Record<string, number>
  /** Abgeleitete Werte (1RM, VO2max, Relativkraft …). */
  metrics: Record<string, number>
  /** Primärwert für Listen und Verläufe. */
  score: number | null
  /**
   * Kontext zum Zeitpunkt der Messung. Bewusst am Ergebnis gespeichert und
   * nicht nachträglich aus dem Profil gelesen — ein Ergebnis muss auch
   * reproduzierbar bleiben, wenn das Profil später korrigiert wird.
   */
  bodyWeightKg: number | null
  ageYears: number | null
  sex: Sex | null
  notes?: string
  createdAt: string
}

/** Stammdaten des Athleten. */
export interface StoredProfile {
  firstName: string
  lastName: string | null
  sex: Sex | null
  birthDate: string | null
  heightCm: number | null
  restingHr: number | null
  maxHr: number | null
  locale: AppLocale
  unitSystem: UnitSystem
}

/** Ein Eintrag der Biometrie-Zeitreihe. */
export interface StoredBiometric {
  id: string
  measuredOn: string
  bodyWeightKg: number | null
  bodyFatPercent: number | null
  restingHr: number | null
  createdAt: string
}

export interface StoredData {
  /** Schemaversion. Wird beim Laden geprüft, damit alte Stände migrierbar sind. */
  version: number
  profile: StoredProfile
  biometrics: StoredBiometric[]
  results: StoredResult[]
}

export const EMPTY_PROFILE: StoredProfile = {
  firstName: '',
  lastName: null,
  sex: null,
  birthDate: null,
  heightCm: null,
  restingHr: null,
  maxHr: null,
  locale: 'de',
  unitSystem: 'metric',
}
