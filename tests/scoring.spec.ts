import { expect, test } from '@playwright/test'
import { estimateOneRepMax, vo2maxFromCooper } from '../src/lib/metrics'
import { lookupPercentile } from '../src/domain/benchmark'
import { radarProfile } from '../src/lib/scoring'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * Reine Rechenprüfungen ohne Browser.
 *
 * Die Werte sind gegen dieselben Funktionen in der Datenbank gerechnet
 * (`public.norm_percentile`, Migration 20260829120400). Weichen beide
 * Seiten voneinander ab, zeigen Gastmodus und Kontomodus unterschiedliche
 * Zahlen für dieselbe Leistung — deshalb sind diese Fälle festgenagelt.
 */

const result = (
  testSlug: string,
  values: Record<string, number>,
  metrics: Record<string, number> = {},
  overrides: Partial<StoredResult> = {},
): StoredResult =>
  ({
    id: `${testSlug}-1`,
    testSlug,
    performedAt: '2026-05-01T09:00:00.000Z',
    values,
    metrics,
    score: Object.values(values)[0] ?? null,
    bodyWeightKg: 80,
    ageYears: 28,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    context: { surface: '', temperatureC: null, timeOfDay: null, equipment: '', trainingStatus: '' },
    createdAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  }) as StoredResult

/**
 * Kein Perzentil ohne benannte Quelle.
 *
 * Bis hierher fiel die App auf eine Startbelegung zurück, die über sich
 * selbst `validated: false` sagte. Damit trug jede Achse eine Zahl, auch wo
 * es keine Referenz gab, und das Leistungsprofil auf der Übersicht bestand
 * bei den meisten Nutzern vollständig aus erfundenen Perzentilen. Diese
 * Fälle halten fest, dass das nicht zurückkommt.
 */
test.describe('Perzentil nur aus belegten Referenzen', () => {
  test('ein Test ohne Referenz bekommt kein Perzentil', () => {
    // Für den Unterarmstütz gibt es keine hinterlegte Referenz.
    expect(lookupPercentile(result('plank_hold', { durationSeconds: 120 }))).toBeNull()
  })

  test('eine belegte Referenz liefert eines', () => {
    // VO2max: mean_sd der nicht-athletischen Kontrollgruppe.
    const value = result('cooper_12min', { distanceM: 2800 }, { vo2max_ml_kg_min: 45 })
    const percentile = lookupPercentile(value)
    expect(percentile).not.toBeNull()
    expect(percentile!).toBeGreaterThan(50)
  })

  test('eine Achse ohne Referenz bleibt im Profil leer statt geraten', () => {
    const axes = radarProfile([result('plank_hold', { durationSeconds: 120 })], 'population')
    const axis = axes.find((a) => a.hasData)
    expect(axis, 'die Messung zählt als vorhanden').toBeTruthy()
    expect(axis!.score, 'aber ohne Referenz gibt es keinen Wert').toBeNull()
  })

  test('ohne passende Kohorte gibt es kein Perzentil', () => {
    // Die Griffkraft-Referenzen sind nach Geschlecht getrennt: ohne Angabe
    // passt keine. Bei der VO2max gibt es eine neutrale Kohorte, dort bleibt
    // die Antwort erhalten — das ist der Unterschied zwischen «keine Daten»
    // und «Daten, die für dich nicht gelten».
    expect(lookupPercentile(result('grip_strength', { gripKg: 50 }, {}, { sex: null }))).toBeNull()
    expect(
      lookupPercentile(result('cooper_12min', { distanceM: 2800 }, { vo2max_ml_kg_min: 45 }, { sex: null })),
    ).not.toBeNull()
  })
})

test.describe('Rechenwege', () => {
  test('1RM nach Epley', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.667, 3)
  })

  test('VO2max nach Cooper', () => {
    // (3320 − 504,9) / 44,73 = 62,9353901…
    expect(vo2maxFromCooper(3320)).toBeCloseTo(62.9354, 4)
  })
})
