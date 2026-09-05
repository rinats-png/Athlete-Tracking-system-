import type { Sex } from '@/types/domain'

/**
 * Die Form eines Referenzwerts — ohne die Werte selbst.
 *
 * Warum eine eigene Datei: die Referenzen sind auf zwei Dateien verteilt
 * (`references.ts` für den Grundbestand, `referencesExtended.ts` für die
 * Ergänzungen aus der erweiterten Quelltabelle). Beide brauchen dieselben
 * Typen, und `references.ts` fügt am Ende beide Listen zusammen. Stünden die
 * Typen dort, entstünde ein Ringschluss zwischen den Modulen.
 */

export type ReferenceCohort = 'population' | 'athlete'
export type ReferenceMethod = 'mean_sd' | 'percentiles' | 'bands' | 'anchor' | 'median'
/** A = Normtabelle/Metaanalyse · B = gute Vergleichsstudie · C/D = Einzelstudie oder indirekt. */
export type ReferenceQuality = 'A' | 'B' | 'C' | 'D'

export interface ReferenceSource {
  /** Kurzbezeichnung der Arbeit, wie sie im Bericht erscheint. */
  study: string
  /** Stichprobengrösse, soweit angegeben. */
  n: number | null
}

export interface ReferenceBand {
  /** Obergrenze dieses Bandes; null = nach oben offen. */
  upTo: number | null
  label: { de: string; en: string }
}

export interface ReferenceEntry {
  testSlug: string
  metricKey: string
  cohort: ReferenceCohort
  /** Wie die Gruppe dem Nutzer genannt wird — der wichtigste Teil des Eintrags. */
  cohortLabel: { de: string; en: string }
  /** Nur bei Athletenkohorten: für welche Disziplinen der Eintrag gilt. */
  disciplineIds?: string[]
  sex: Exclude<Sex, 'other'> | 'all'
  ageMin: number
  ageMax: number
  method: ReferenceMethod
  /** `mean_sd` */
  mean?: number
  sd?: number
  /**
   * `percentiles`: Werte zu 10/25/50/75/90/99, in der Richtung der Kennzahl
   * selbst notiert. Bei «kleiner ist besser» ist die Reihe also absteigend
   * (P10 = langsamste Zeit). Die Zuordnung Wert → Perzentil steckt damit
   * schon in den Stützstellen; sie wird nicht noch einmal gedreht.
   */
  values?: number[]
  /**
   * Welche Perzentile die Werte in `values` bezeichnen. Ohne diese Angabe
   * gilt die Standardreihe 10/25/50/75/90/99.
   *
   * WARUM ES DAS GIBT: manche Quellen berichten andere Stützstellen. Die
   * ACSM-Tabellen etwa nennen P50, P75, P90 und P95 — kein P10 und kein P25.
   * Ohne dieses Feld bliebe nur, die fehlenden Ränder zu erfinden oder den
   * Eintrag wegzulassen. Beides wäre schlechter als die Wahrheit: vier
   * belegte Stützstellen, dazwischen interpoliert, an den Rändern geklemmt.
   */
  percentileAnchors?: number[]
  /** `bands`: aufsteigend nach `upTo`. */
  bands?: ReferenceBand[]
  /** `anchor`: der Bezugswert selbst. */
  anchor?: number
  /** `median`: der publizierte Median der Gruppe. */
  median?: number
  source: ReferenceSource
  quality: ReferenceQuality
  /**
   * Abweichungen zwischen dem Protokoll der Quelle und dem der App. Steht in
   * der Oberfläche am Vergleich — ohne diesen Hinweis wäre ein Feldwert
   * stillschweigend mit einem Laborwert verglichen.
   */
  protocolNote?: { de: string; en: string }
}

/** Die Standardreihe, wenn ein Eintrag keine eigene nennt. */
export const P_ANCHORS = [10, 25, 50, 75, 90, 99] as const
