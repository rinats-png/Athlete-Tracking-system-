import { expect, test } from '@playwright/test'
import { normPercentile } from '../src/data/norms'
import { estimateOneRepMax, vo2maxFromCooper } from '../src/lib/metrics'

/**
 * Reine Rechenprüfungen ohne Browser.
 *
 * Die Werte sind gegen dieselben Funktionen in der Datenbank gerechnet
 * (`public.norm_percentile`, Migration 20260829120400). Weichen beide
 * Seiten voneinander ab, zeigen Gastmodus und Kontomodus unterschiedliche
 * Zahlen für dieselbe Leistung — deshalb sind diese Fälle festgenagelt.
 */

test.describe('Scoring stimmt mit der Datenbank überein', () => {
  test('Perzentil interpoliert linear zwischen den Stützstellen', () => {
    // Illinois 16,5 s, Mann 30 J: zwischen 17,0 (P50) und 16,0 (P75)
    // -> 50 + 25 * (0,5/1,0) = 62,5. Identisch zum SQL-Ergebnis.
    expect(normPercentile('illinois_agility', 'durationSeconds', 'male', 30, 16.5)).toBeCloseTo(62.5, 4)

    // Cooper VO2max 50, Mann 30 J: zwischen 46 (P50) und 52 (P75)
    // -> 50 + 25 * (4/6) = 66,667.
    expect(normPercentile('cooper_12min', 'vo2max_ml_kg_min', 'male', 30, 50)).toBeCloseTo(66.6667, 3)
  })

  test('ausserhalb des Referenzbereichs wird geklemmt, nicht extrapoliert', () => {
    expect(normPercentile('illinois_agility', 'durationSeconds', 'male', 30, 5)).toBe(99)
    expect(normPercentile('illinois_agility', 'durationSeconds', 'male', 30, 40)).toBe(10)
  })

  test('ohne belastbare Referenz gibt es keinen Wert statt eines falschen', () => {
    expect(normPercentile('cooper_12min', 'vo2max_ml_kg_min', 'other', 30, 50)).toBeNull()
    expect(normPercentile('cooper_12min', 'vo2max_ml_kg_min', null, 30, 50)).toBeNull()
  })

  test('1RM nach Epley', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.667, 3)
  })

  test('VO2max nach Cooper', () => {
    // (3320 − 504,9) / 44,73 = 62,9353901…
    expect(vo2maxFromCooper(3320)).toBeCloseTo(62.9354, 4)
  })
})
