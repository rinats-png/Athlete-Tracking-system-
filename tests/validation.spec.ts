import { expect, test } from '@playwright/test'
import { getTest } from '../src/data/testCatalog'
import { hasErrors, issuesFor, validateTestInput } from '../src/domain/validation'
import { assessQuality, isOutlier } from '../src/domain/dataQuality'
import type { StoredResult } from '../src/lib/store/localStore'

/**
 * Eingabeprüfung und Datenqualität.
 *
 * Der teuerste Fehler dieser App ist ein Tippfehler, der unbemerkt in den
 * Verlauf wandert: eine 1650 kg schwere Kniebeuge verschiebt Bestleistung,
 * Radar und jeden späteren Vergleich dauerhaft. Diese Fälle nageln fest,
 * was blockiert (error) und was nur beschriftet wird (warning) — die
 * Unterscheidung ist der ganze Punkt.
 */

const backSquat = getTest('back_squat_1rm')!
const cooper = getTest('cooper_12min')!

test.describe('Eingabeprüfung', () => {
  test('der Testkatalog kennt die geprüften Tests', () => {
    expect(backSquat).toBeTruthy()
    expect(cooper).toBeTruthy()
  })

  test('ein Tippfehler jenseits der Feldgrenze blockiert das Speichern', () => {
    const issues = validateTestInput(backSquat, { loadKg: 1650, reps: 3 }, { bodyWeightKg: 82 })
    expect(hasErrors(issues)).toBe(true)
    expect(issuesFor(issues, 'loadKg')[0]).toMatchObject({
      severity: 'error',
      messageKey: 'validation.max',
    })
  })

  test('ein plausibler Wert erzeugt keine Meldung', () => {
    const issues = validateTestInput(backSquat, { loadKg: 165, reps: 3 }, { bodyWeightKg: 82 })
    expect(issues).toEqual([])
  })

  test('fehlende Pflichtfelder werden benannt, nicht stillschweigend ergänzt', () => {
    const issues = validateTestInput(backSquat, { reps: 3 }, { bodyWeightKg: 82 })
    expect(issuesFor(issues, 'loadKg')[0]).toMatchObject({ messageKey: 'validation.required' })
    // Pro Feld nur eine Meldung: ein leeres Feld hat keine Spanne zu verletzen.
    expect(issuesFor(issues, 'loadKg')).toHaveLength(1)
  })

  test('Ganzzahlfelder nehmen keine Kommawerte an', () => {
    const issues = validateTestInput(backSquat, { loadKg: 165, reps: 2.5 }, { bodyWeightKg: 82 })
    expect(issuesFor(issues, 'reps').map((i) => i.messageKey)).toContain('validation.integer')
  })

  test('fehlendes Körpergewicht warnt, blockiert aber nicht', () => {
    const issues = validateTestInput(backSquat, { loadKg: 165, reps: 3 }, { bodyWeightKg: null })
    expect(hasErrors(issues)).toBe(false)
    expect(issuesFor(issues, '*')[0]).toMatchObject({
      severity: 'warning',
      messageKey: 'validation.noBodyWeight',
    })
  })

  test('ein Testdatum in der Zukunft wird abgelehnt', () => {
    const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const issues = validateTestInput(
      cooper,
      { distanceM: 3200 },
      { performedOn: morgen, bodyWeightKg: 82 },
    )
    expect(issuesFor(issues, 'performedOn')[0]).toMatchObject({
      severity: 'error',
      messageKey: 'validation.future',
    })

    const heute = new Date().toISOString().slice(0, 10)
    expect(
      validateTestInput(cooper, { distanceM: 3200 }, { performedOn: heute, bodyWeightKg: 82 }),
    ).toEqual([])
  })
})

const result = (overrides: Partial<StoredResult> = {}): StoredResult =>
  ({
    id: 'r1',
    testSlug: 'back_squat_1rm',
    performedAt: '2026-05-01T09:00:00.000Z',
    values: { loadKg: 165, reps: 3 },
    metrics: { one_rm_kg: 180 },
    score: 180,
    bodyWeightKg: 82,
    ageYears: 34,
    sex: 'male',
    assessmentId: null,
    attempts: [],
    attemptSelection: null,
    createdAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  }) as StoredResult

test.describe('Datenqualität', () => {
  test('vollständiger Datensatz gilt als belastbar', () => {
    expect(assessQuality(result())).toEqual({ status: 'valid', reasons: [] })
  })

  test('ohne Körpergewicht fehlt die Relativkraft — unvollständig, nicht ungültig', () => {
    const quality = assessQuality(result({ bodyWeightKg: null }))
    expect(quality.status).toBe('incomplete')
    expect(quality.reasons).toContain('quality.noBodyWeight')
  })

  test('ohne Geschlecht und Alter gibt es keinen Perzentilvergleich', () => {
    const quality = assessQuality(result({ sex: null, ageYears: null }))
    expect(quality.status).toBe('incomplete')
    expect(quality.reasons).toContain('quality.noBenchmarkContext')
  })

  test('ein nicht ausbelasteter Maximaltest wird als fraglich markiert', () => {
    const quality = assessQuality(result({ values: { loadKg: 165, reps: 3, rpe: 6 } }))
    expect(quality.status).toBe('questionable')
    expect(quality.reasons).toContain('quality.submaximal')
  })

  test('ein unbekannter Test wird nicht bewertet', () => {
    expect(assessQuality(result({ testSlug: 'gibt_es_nicht' })).status).toBe('incomplete')
  })
})

test.describe('Ausreisser', () => {
  const history = (scores: number[]) =>
    scores.map((score, i) => result({ id: `h${i}`, score }))

  test('unter drei Vorwerten wird nichts markiert', () => {
    expect(isOutlier(result({ id: 'neu', score: 400 }), history([180, 182]))).toBe(false)
  })

  test('ein Wert weit ausserhalb der eigenen Streuung fällt auf', () => {
    expect(isOutlier(result({ id: 'neu', score: 900 }), history([180, 182, 185, 184]))).toBe(true)
  })

  test('eine normale Steigerung wird nicht markiert', () => {
    expect(isOutlier(result({ id: 'neu', score: 190 }), history([180, 182, 185, 184]))).toBe(false)
  })

  test('der eigene Datensatz zählt nicht als eigene Historie', () => {
    const self = result({ id: 'r1', score: 900 })
    // Nur drei fremde Vorwerte in der Liste, der vierte Eintrag ist er selbst.
    expect(isOutlier(self, [...history([180, 182, 185]), self])).toBe(true)
  })
})
