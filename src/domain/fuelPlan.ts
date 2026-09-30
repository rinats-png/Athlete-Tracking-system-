import { FUEL_NOTES, type ContextKey, type FuelNote } from '@/data/fuelContext'
import type { FuelRule } from '@/data/fuelRules'
import { intraSessionBand, type IntraBand, type SessionFueling } from '@/domain/fueling'
import { PROTEIN_BAND } from '@/domain/fueling'

/**
 * Plan je Einheit und Wettkampftag (docs/fuel.md, Stufe 2) und die eigenen
 * Werte aus dem Tagebuch. Rein: keine Oberfläche, kein Speicher.
 *
 * WAS DER PLAN IST: eine Spanne für davor, währenddessen und danach, aus der
 * Regel der Disziplin und den Angaben zur Einheit. Kein Trinkplan mit Ziel,
 * jeden Gewichtsverlust zu verhindern (Hyponatriämie, Spezifikation §8), kein
 * festes Verhältnis der Kohlenhydratarten, keine 120 g/h als Standard. Zahlen
 * ohne Grundlage werden nicht gerechnet — fehlt eine Eingabe, fehlt die Zeile.
 *
 * QUELLEN: Thomas, Erdman & Burke (2016) für davor und danach, Jeukendrup
 * (2014) für die Zufuhr in der Einheit, Sawka et al. (2007) für den Ausgleich
 * gemessener Verluste, Hew-Butler et al. (2015) für den Schutz vor zu viel
 * Trinken.
 */

export const FUEL_PLAN_VERSION = '1.0.0'

export type SessionKind = 'training' | 'race'

export interface FuelPlanInput {
  rule: FuelRule
  weightKg: number | null
  durationMin: number
  kind: SessionKind
  /** Stunden bis zur nächsten Einheit. Null = unbekannt. */
  hoursToNext: number | null
  /** Ab dieser Zufuhr (g/h) traten bei dir Beschwerden auf. Null = keine bekannt. */
  gutTroubleGPerH: number | null
  /** Gemessener Körpermasseverlust der Einheit in kg. Null = nicht gemessen. */
  lossKg: number | null
}

export interface FuelPlan {
  before: {
    /** g Kohlenhydrate je kg, 1–4 Stunden vorher. Nur bei Wettkampf oder ab 60 min. */
    carbsPerKg: [number, number] | null
    carbsG: [number, number] | null
    /** ml Flüssigkeit 2–4 Stunden vorher (5–10 ml/kg). */
    fluidMl: [number, number] | null
    /** Aufladen: 10–12 g/kg und Tag über 36–48 Stunden. */
    load: { carbsPerKg: [number, number]; carbsG: [number, number] | null; hours: [number, number] } | null
    /** Kein Aufladen nötig (Rennen unter 90 min). */
    loadNotNeeded: boolean
  }
  during: {
    band: IntraBand
    /** Obergrenze wegen früherer Beschwerden abgesenkt; der Wert ist die Grenze. */
    gutCapGPerH: number | null
    /** Mehrere Kohlenhydratarten und Gewöhnung nötig (ab 60 g/h). */
    needsMixAndPractice: boolean
    /** Wettkampf im Kampfformat: während des Kampfes nichts, zwischen den Kämpfen der Turniertag-Planer. */
    betweenBouts: boolean
  }
  after: {
    /** 1,0–1,2 g/kg und Stunde über etwa 4 Stunden, nur bei unter 8 Stunden bis zur nächsten Einheit. */
    rapid: { carbsPerKgH: [number, number]; hours: number; carbsG: [number, number] | null } | null
    /** Protein je Mahlzeit: 0,3 g/kg. */
    proteinPerMealG: number | null
    /** 125–150 % des gemessenen Verlusts, in ml. */
    rehydrateMl: [number, number] | null
  }
  sourceIds: string[]
}

const g = (perKg: [number, number], kg: number | null): [number, number] | null =>
  kg == null || kg <= 0 ? null : [Math.round(perKg[0] * kg), Math.round(perKg[1] * kg)]

export function planFuel(i: FuelPlanInput): FuelPlan {
  const race = i.kind === 'race'
  const kg = i.weightKg && i.weightKg > 0 ? i.weightKg : null

  // --- davor
  const preCarbs: [number, number] = [1, 4]
  const showPre = race || i.durationMin >= 60
  const loadOk = race && i.rule.carbLoad === 'appropriate' && i.durationMin > 90
  const loadPerKg: [number, number] = [10, 12]

  // --- während: die Dauerstaffel, in Rennen von der Regel geformt
  let band: IntraBand = intraSessionBand(i.durationMin)
  if (race && band.kind === 'range') {
    if (i.rule.intra === 'g30_60') band = { kind: 'range', lo: band.lo, hi: Math.min(band.hi, 60) }
    if (i.rule.intra === 'g60_90' && i.durationMin >= 120) band = { kind: 'range', lo: 60, hi: 90 }
  }
  const betweenBouts = race && i.rule.intra === 'between_bouts'
  if (betweenBouts) band = { kind: 'none' }
  let gutCapGPerH: number | null = null
  if (band.kind === 'range' && i.gutTroubleGPerH != null && i.gutTroubleGPerH < band.hi) {
    gutCapGPerH = i.gutTroubleGPerH
    band = { kind: 'range', lo: Math.min(band.lo, i.gutTroubleGPerH), hi: i.gutTroubleGPerH }
  }

  // --- danach
  const rapidOn = i.hoursToNext != null && i.hoursToNext < 8
  const rapidPerKgH: [number, number] = [1.0, 1.2]

  return {
    before: {
      carbsPerKg: showPre ? preCarbs : null,
      carbsG: showPre ? g(preCarbs, kg) : null,
      fluidMl: kg ? [Math.round(5 * kg), Math.round(10 * kg)] : null,
      load: loadOk ? { carbsPerKg: loadPerKg, carbsG: g(loadPerKg, kg), hours: [36, 48] } : null,
      loadNotNeeded: race && i.rule.carbLoad === 'not_essential' && i.durationMin <= 90,
    },
    during: { band, gutCapGPerH, needsMixAndPractice: band.kind === 'range' && band.hi >= 60, betweenBouts },
    after: {
      rapid: rapidOn ? { carbsPerKgH: rapidPerKgH, hours: 4, carbsG: g(rapidPerKgH, kg) } : null,
      proteinPerMealG: kg ? Math.round(0.3 * kg) : null,
      rehydrateMl: i.lossKg != null && i.lossKg > 0 ? [Math.round(i.lossKg * 1250), Math.round(i.lossKg * 1500)] : null,
    },
    sourceIds: ['thomas2016', 'jeukendrup2014', 'sawka2007', 'hewbutler2015'],
  }
}

// --- Eigene Werte -----------------------------------------------------------

export interface SweatProfile {
  n: number
  min: number
  max: number
  median: number
}

/** Schweissrate aus gemessenen Einheiten (l/h). Null ohne eine Messung. */
export function sweatProfile(rows: SessionFueling[]): SweatProfile | null {
  const v = rows.map((r) => r.sweatRateLph).filter((x): x is number => x != null && x > 0).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
  return { n: v.length, min: v[0], max: v[v.length - 1], median: Math.round(median * 100) / 100 }
}

export interface GutProfile {
  /** Höchste Zufuhr (g/h) ohne oder mit leichten Beschwerden, Einheiten ab 45 min. */
  toleratedGPerH: number | null
  /** Niedrigste Zufuhr (g/h), bei der deutliche oder starke Beschwerden auftraten. */
  troubleGPerH: number | null
  n: number
}

/** Magen-Darm-Grenze aus Einheiten mit Zufuhr und Beschwerdeangabe. Null ohne solche. */
export function gutProfile(rows: SessionFueling[]): GutProfile | null {
  const useful = rows.filter((r) => r.carbsPerHour != null && r.giScore != null && r.durationMin >= 45)
  if (useful.length === 0) return null
  const ok = useful.filter((r) => (r.giScore as number) <= 1).map((r) => r.carbsPerHour as number)
  const bad = useful.filter((r) => (r.giScore as number) >= 2).map((r) => r.carbsPerHour as number)
  return { toleratedGPerH: ok.length ? Math.max(...ok) : null, troubleGPerH: bad.length ? Math.min(...bad) : null, n: useful.length }
}

export interface FeelByBand {
  within: { n: number; mean: number }
  below: { n: number; mean: number }
}

/**
 * Energie in der Einheit (1–5), getrennt nach Zufuhr in der Spanne und
 * darunter. Beschreibend, keine Ursache: zwei Gruppen mit Mittelwert. Null,
 * solange eine Gruppe unter zwei Einheiten hat.
 */
export function feelByBand(rows: SessionFueling[]): FeelByBand | null {
  const mean = (a: number[]) => Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10
  const within = rows.filter((r) => r.energyFeel != null && r.belowBand === false).map((r) => r.energyFeel as number)
  const below = rows.filter((r) => r.energyFeel != null && r.belowBand === true).map((r) => r.energyFeel as number)
  if (within.length < 2 || below.length < 2) return null
  return { within: { n: within.length, mean: mean(within) }, below: { n: below.length, mean: mean(below) } }
}

export { PROTEIN_BAND }

// --- Turniertag (Kampfsport, Fechten) -----------------------------------------

export interface TournamentInput {
  bouts: number
  /** Dauer eines Kampfes in Minuten. */
  boutMin: number
  /** Pause zwischen zwei Kämpfen in Minuten, im Mittel. */
  gapMin: number
}

export type GapKind = 'sips' | 'small' | 'snack'

export interface TournamentPlan {
  gaps: number
  gapKind: GapKind
  /** g Kohlenhydrate je Pause. Null bei «nur Flüssigkeit». */
  carbsPerGapG: [number, number] | null
  /** Ganzer Turnierblock vom ersten bis zum letzten Kampf, in Minuten. */
  spanMin: number
  totalG: [number, number] | null
}

/**
 * Verpflegung zwischen den Kämpfen. Die Vorlage sagt nur «kleine, schnell
 * verdauliche Kohlenhydrate und Flüssigkeit, soweit verträglich» und nennt
 * keine Menge. Die Mengen hier sind deshalb ÜBERTRAGEN: 30–60 g je Stunde
 * (Jeukendrup 2014, Ausdauer) auf die Länge der Pause gerechnet, und in der
 * Oberfläche als «Übertragen, Evidenz niedrig» gekennzeichnet. Unter zehn
 * Minuten Pause nur Flüssigkeit. Nichts davon betrifft Wiegen oder Gewicht.
 */
export function tournamentPlan(t: TournamentInput): TournamentPlan | null {
  if (!(t.bouts >= 1) || !(t.boutMin > 0) || !(t.gapMin >= 0)) return null
  const gaps = Math.max(0, Math.round(t.bouts) - 1)
  const spanMin = t.bouts * t.boutMin + gaps * t.gapMin
  const gapKind: GapKind = t.gapMin < 10 ? 'sips' : t.gapMin < 30 ? 'small' : 'snack'
  const per: [number, number] | null = gapKind === 'sips' ? null : [Math.round((30 * t.gapMin) / 60), Math.round((60 * t.gapMin) / 60)]
  return {
    gaps,
    gapKind,
    carbsPerGapG: per,
    spanMin,
    totalG: per ? [per[0] * gaps, per[1] * gaps] : null,
  }
}

// --- Hitze, Kälte, Reise ------------------------------------------------------

export type Conditions = 'normal' | 'hot' | 'cold'
export type Travel = 'none' | 'trip' | 'zones'

/**
 * Hinweise für die gewählten Bedingungen. Ändert keine Spanne — die Vorlage
 * nennt dafür keine Zahlen. Eine Reise mit Zeitzonenwechsel schliesst die
 * Reise ein.
 */
export function contextNotes(conditions: Conditions, travel: Travel): FuelNote[] {
  const on = new Set<ContextKey>()
  if (conditions === 'hot') on.add('hot')
  if (conditions === 'cold') on.add('cold')
  if (travel !== 'none') on.add('trip')
  if (travel === 'zones') on.add('zones')
  return FUEL_NOTES.filter((n) => on.has(n.applies))
}
