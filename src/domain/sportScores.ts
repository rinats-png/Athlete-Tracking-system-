import type { StoredResult } from '@/lib/store/localStore'
import { getTest } from '@/data/testCatalog'
import { disciplineById } from '@/data/sportProfiles'

/**
 * Sportartspezifische Sammelwerte (§81, vorläufig).
 *
 * Das Zielgruppendokument nennt fünf solcher Werte. Zwei entstehen aus einem
 * einzigen Test und werden dort gerechnet (`bike_threshold_score`,
 * `swim_technique_score`). Die drei hier fassen MEHRERE Testergebnisse
 * zusammen — deshalb stehen sie nicht bei den abgeleiteten Kennzahlen eines
 * Ergebnisses, sondern hier, wo der ganze Bestand eines Athleten vorliegt.
 *
 * ALLE DREI SIND VORLÄUFIG. Die Bestandteile sind belegt oder gemessen; ihre
 * Verrechnung zu einer Zahl zwischen 0 und 100 ist eine Festlegung dieser App.
 * Sie tragen deshalb ihre Grundlage mit: `basis` sagt, aus welchen Tests der
 * Wert entstanden ist, und die Oberfläche zeigt ihn nur mit dem Vermerk
 * «vorläufig». Ein Sammelwert ohne sichtbare Grundlage wäre die schlechteste
 * Form einer Zahl: er sieht nach Messung aus und ist eine Setzung.
 *
 * KEIN WERT AUS NICHTS. Fehlt ein Bestandteil, wird der Score nicht aus dem
 * Rest hochgerechnet, sondern gar nicht gebildet. Ein aus einem einzigen Test
 * gebildeter «Sammelwert» wäre nur dieser Test unter anderem Namen.
 */

export interface SportScore {
  key: 'grip_score' | 'fight_endurance_score' | 'run_economy_score'
  /** 0–100. */
  value: number
  /** Aus welchen Tests er entstanden ist — Slugs, für die Anzeige übersetzt. */
  basis: string[]
  /** Immer true. Steht als Feld da, damit die Oberfläche es nicht vergessen kann. */
  provisional: true
}

/** Lineare Skalierung mit Klemmung an den Rändern. */
function scale(value: number, low: number, high: number): number {
  if (high === low) return 0
  const ratio = (value - low) / (high - low)
  return Math.min(100, Math.max(0, ratio * 100))
}

/** Bester Wert einer Kennzahl über alle Ergebnisse eines Tests. */
function bestMetric(
  results: StoredResult[],
  slug: string,
  metric: string,
  direction: 'higher' | 'lower',
): number | null {
  const values = results
    .filter((r) => r.testSlug === slug)
    .map((r) => r.metrics?.[metric])
    .filter((v): v is number => v != null && Number.isFinite(v))
  if (values.length === 0) return null
  return direction === 'higher' ? Math.max(...values) : Math.min(...values)
}

/**
 * Skalierungsspannen. Alle sind Festlegungen dieser App und durch belegte
 * Referenzkollektive zu ersetzen — sie stehen hier beisammen, damit man sie
 * an einer Stelle austauschen kann, statt sie im Code zu suchen.
 */
export const SCORE_SCALES = {
  /** Griffkraft je Körpergewicht: 0,4 bis 1,0. */
  gripRelative: { low: 0.4, high: 1.0 },
  /** Haltezeit am Griff in Sekunden: 20 bis 120. */
  gripHang: { low: 20, high: 120 },
  /** SJFT-/SWFT-Index: 16 (sehr gut) bis 8 (Weltklasse) — kleiner ist besser. */
  fightIndex: { low: 16, high: 8 },
  /** Abfall über wiederholte Aktionen in Prozent: 40 (schlecht) bis 5. */
  fatigueDrop: { low: 40, high: 5 },
  /** Verhältnis Wettkampfpace zu Schwellenpace: 1,15 bis 0,92. */
  paceRatio: { low: 1.15, high: 0.92 },
} as const

/**
 * Griffwert aus Maximalkraft und Ausdauer der Griffmuskulatur.
 *
 * Braucht beide Seiten der Eigenschaft: wer stark zupackt, aber nicht halten
 * kann, hat im Griffkampf ein anderes Problem als umgekehrt — und ein
 * Mittelwert aus nur einer der beiden Zahlen verdeckt genau das.
 */
export function gripScore(results: StoredResult[]): SportScore | null {
  const relative = bestMetric(results, 'grip_strength', 'grip_relative', 'higher')
  const hang = bestMetric(results, 'grip_hang_time', 'durationSeconds', 'higher')
  if (relative == null || hang == null) return null
  const value =
    (scale(relative, SCORE_SCALES.gripRelative.low, SCORE_SCALES.gripRelative.high) +
      scale(hang, SCORE_SCALES.gripHang.low, SCORE_SCALES.gripHang.high)) /
    2
  return { key: 'grip_score', value, basis: ['grip_strength', 'grip_hang_time'], provisional: true }
}

/** Tests, deren Ermüdungsindex in den Kampfausdauerwert eingeht. */
const FATIGUE_SOURCES = [
  'punch_test_60s',
  'punch_test_180s',
  'kick_test_60s',
  'uchi_komi_fitness_test',
  'jjapt',
  'fatigue_circuit_4x30s',
]

/**
 * Kampfausdauer aus dem SJFT- oder SWFT-Index und dem Abfall über wiederholte
 * Aktionen.
 *
 * Der Index allein beschreibt eine einzelne Belastungsform; der Abfall über
 * wiederholte technische Aktionen ergänzt sie um die Seite, die im Kampf
 * zuletzt bricht.
 */
export function fightEnduranceScore(results: StoredResult[]): SportScore | null {
  const sjft = bestMetric(results, 'special_judo_fitness_test', 'sjft_index', 'lower')
  const swft = bestMetric(results, 'special_wrestling_fitness_test', 'swft_index', 'lower')
  const index = sjft != null && swft != null ? Math.min(sjft, swft) : (sjft ?? swft)
  if (index == null) return null

  const drops = FATIGUE_SOURCES.map((slug) =>
    bestMetric(results, slug, 'fatigue_index_percent', 'lower'),
  ).filter((v): v is number => v != null)
  if (drops.length === 0) return null

  const indexSlug = sjft != null && (swft == null || sjft <= swft)
    ? 'special_judo_fitness_test'
    : 'special_wrestling_fitness_test'
  const value =
    (scale(index, SCORE_SCALES.fightIndex.low, SCORE_SCALES.fightIndex.high) +
      scale(Math.min(...drops), SCORE_SCALES.fatigueDrop.low, SCORE_SCALES.fatigueDrop.high)) /
    2
  return {
    key: 'fight_endurance_score',
    value,
    basis: [indexSlug, 'fatigue_index_percent'],
    provisional: true,
  }
}

/**
 * Näherung an die Laufökonomie aus dem Verhältnis von Wettkampfpace zu
 * geschätzter Schwellenpace.
 *
 * AUSDRÜCKLICH NICHT die Laufökonomie im Sinne der Physiologie: die ist der
 * Sauerstoffverbrauch bei fester submaximaler Geschwindigkeit und braucht eine
 * Spiroergometrie. Wer nahe an seiner Schwellenpace Rennen läuft, hält sein
 * Tempo besser — mehr sagt dieser Wert nicht, und er ersetzt die Messung nicht.
 */
export function runEconomyScore(results: StoredResult[]): SportScore | null {
  const thresholdDistance = bestMetric(results, 'threshold_run_30min', 'distanceM', 'higher')
  if (thresholdDistance == null || thresholdDistance <= 0) return null
  const thresholdPace = (30 * 60) / (thresholdDistance / 1000)

  for (const slug of ['run_10k', 'run_5k']) {
    const seconds = bestMetric(results, slug, 'durationSeconds', 'lower')
    const meters = getTest(slug)?.protocol.targetDistanceM
    if (seconds == null || !meters) continue
    const racePace = seconds / (meters / 1000)
    const value = scale(
      racePace / thresholdPace,
      SCORE_SCALES.paceRatio.low,
      SCORE_SCALES.paceRatio.high,
    )
    return { key: 'run_economy_score', value, basis: ['threshold_run_30min', slug], provisional: true }
  }
  return null
}

/**
 * Die Sammelwerte, die zur gewählten Disziplin passen.
 *
 * Ohne Disziplin werden alle gebildet, die aus dem Bestand entstehen können —
 * die Auswahl ist eine Anzeigehilfe, keine Sperre.
 */
export function sportScoresFor(
  results: StoredResult[],
  disciplineId: string | null,
): SportScore[] {
  const discipline = disciplineId ? disciplineById(disciplineId) : undefined
  const category = discipline?.categoryId
  const wanted: Record<string, boolean> = {
    grip_score: category == null || category === 'combat' || category === 'hybrid',
    fight_endurance_score: category == null || category === 'combat',
    run_economy_score: category == null || category === 'running' || category === 'triathlon',
  }
  return [gripScore(results), fightEnduranceScore(results), runEconomyScore(results)].filter(
    (s): s is SportScore => s != null && wanted[s.key],
  )
}
