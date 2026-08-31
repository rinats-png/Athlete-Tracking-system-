/**
 * Fachliche Typen der App. Bewusst von Hand gepflegt und nicht aus der
 * Datenbank generiert: `npm run db:types` erzeugt später die reinen
 * Tabellentypen nach src/types/supabase.ts, diese Datei bleibt die
 * Domänensprache, gegen die die UI programmiert.
 */

export const PERFORMANCE_DIMENSIONS = [
  'endurance',
  'max_strength',
  'relative_strength',
  'strength_endurance',
  'power',
  'agility',
] as const

export type PerformanceDimension = (typeof PERFORMANCE_DIMENSIONS)[number]

export type TestCategory =
  | 'endurance'
  | 'max_strength'
  | 'strength_endurance'
  | 'power'
  | 'speed'
  | 'agility'
  | 'conditioning'

export type ScoringDirection = 'higher_is_better' | 'lower_is_better'
export type ScoreMode = 'personal_best' | 'population'
export type Sex = 'male' | 'female' | 'other'
export type AppLocale = 'de' | 'en'

/** Eine Achse des Spider-Web-Diagramms. */
export interface RadarAxis {
  /** Kennung der Profilachse (siehe data/profileAxes.ts). */
  axisId: string
  /**
   * Die zugehörige der sechs allgemeinen Fähigkeiten — oder null bei einer
   * sportartspezifischen Kennzahlachse wie «Laufökonomie». Die Körperansicht
   * zeigt nur Achsen mit Fähigkeit, weil nur die eine Körperregion haben.
   */
  dimension: PerformanceDimension | null
  /** 0–100. Bedeutung hängt vom Modus ab: % der Bestleistung oder Perzentil. */
  score: number | null
  testCount: number
  latestPerformedAt: string | null
  hasData: boolean
}

export interface RadarDelta {
  dimension: PerformanceDimension
  baselineScore: number | null
  currentScore: number | null
  deltaPoints: number | null
  deltaPercent: number | null
}

export interface TestSummary {
  id: string
  slug: string
  name: string
  category: TestCategory
  dimension: PerformanceDimension
  performedAt: string
  /** Primärwert in der Anzeigeeinheit des Tests. */
  value: number
  unit: string
  direction: ScoringDirection
  /** Veränderung gegenüber dem vorherigen Ergebnis desselben Tests, in Prozent. */
  deltaPercent: number | null
  isPersonalBest: boolean
  rpe: number | null
  /** Abgeleitete Werte, z. B. { one_rm_kg: 165, relative_strength_bw: 1.94 } */
  derived: Record<string, { value: number; unit: string | null }>
}

export interface TrendPoint {
  performedAt: string
  value: number
}

export interface AthleteProfile {
  id: string
  firstName: string
  lastName: string | null
  sex: Sex | null
  birthDate: string | null
  bodyWeightKg: number | null
  heightCm: number | null
  restingHr: number | null
  maxHr: number | null
  lastAssessmentOn: string | null
}

/** Leistungsniveau des Athleten. Reihenfolge = aufsteigende Einordnung. */
export const PERFORMANCE_LEVELS = [
  'recreational',
  'trained',
  'advanced',
  'competitive',
  'elite',
] as const
export type PerformanceLevel = (typeof PERFORMANCE_LEVELS)[number]

export const DOMINANT_SIDES = ['left', 'right', 'ambidextrous'] as const
export type DominantSide = (typeof DOMINANT_SIDES)[number]
