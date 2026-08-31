import { expect, test } from '@playwright/test'
import { TEST_CATALOG, type TestDefinition, type TestField } from '../src/data/testCatalog'
import { deriveMetrics, primaryValue } from '../src/lib/metrics/derive'

/**
 * Die Kennzahlen eines Tests stehen seit Befund 05 in seiner eigenen
 * Definition. Der Gewinn daran ist erst dann echt, wenn eine Prüfung
 * verlangt, dass jede angekündigte Kennzahl auch entsteht.
 *
 * Vorher konnte ein Test seine Kennzahl in `derivedMetrics` nennen, ohne dass
 * sie irgendwo gerechnet wurde. Die Eingabe funktionierte, das Ergebnis
 * wurde gespeichert, und die Kennzahl fehlte still. Genau dieser Fall fällt
 * hier auf.
 */

/** Ein plausibler Wert in der Mitte des erlaubten Bereichs. */
function sampleValue(field: TestField): number {
  const min = field.min ?? 1
  const max = field.max ?? min + 100
  const mid = min + (max - min) / 2
  return field.type === 'integer' ? Math.max(1, Math.round(mid)) : Math.round(mid * 100) / 100
}

/** Alle Felder belegt — auch die freiwilligen, sonst bliebe die Prüfung stumpf. */
function fullInput(testDef: TestDefinition): Record<string, number> {
  const values: Record<string, number> = {}
  for (const field of testDef.fields) values[field.key] = sampleValue(field)
  // Teilwerte müssen kleiner sein als die Gesamtzahl, sonst ergäbe der
  // Ermüdungsindex eine Zahl, die kein Athlet je erzeugen könnte.
  if (values.reps != null && values.repsFirst30 != null) {
    values.repsFirst30 = Math.max(1, Math.round(values.reps * 0.6))
  }
  if (values.peakPowerW != null && values.minPowerW != null) {
    values.minPowerW = Math.round(values.peakPowerW * 0.7)
  }
  // Der Radteil liegt innerhalb der Gesamtzeit — die Mitte beider Bereiche
  // ergäbe sonst einen Laufteil von negativer Länge.
  if (values.durationSeconds != null && values.bikeMinutes != null) {
    values.bikeMinutes = Math.max(1, Math.round((values.durationSeconds * 0.6) / 60))
  }
  if (values.peakPowerW != null && values.lastSprintPowerW != null) {
    values.lastSprintPowerW = Math.round(values.peakPowerW * 0.8)
  }
  return values
}

const ctx = { bodyWeightKg: 78, ageYears: 28, sex: 'male' as const }

test.describe('Kennzahlen je Test', () => {
  for (const testDef of TEST_CATALOG) {
    test(`${testDef.slug} bildet jede angekündigte Kennzahl`, () => {
      const metrics = deriveMetrics(testDef, fullInput(testDef), ctx)
      const missing = testDef.derivedMetrics.filter((key) => metrics[key] == null)
      expect(missing, `${testDef.slug}: ${missing.join(', ')}`).toEqual([])
    })
  }

  test('jeder Test liefert bei vollständiger Eingabe seinen Primärwert', () => {
    const withoutPrimary = TEST_CATALOG.filter((testDef) => {
      const values = fullInput(testDef)
      return primaryValue(testDef, values, deriveMetrics(testDef, values, ctx)) == null
    }).map((testDef) => testDef.slug)
    expect(withoutPrimary).toEqual([])
  })

  test('ohne Körpergewicht fehlt die betroffene Kennzahl, statt eine Null zu erfinden', () => {
    const grip = TEST_CATALOG.find((testDef) => testDef.slug === 'grip_strength')!
    const metrics = deriveMetrics(grip, fullInput(grip), {
      bodyWeightKg: null,
      ageYears: 28,
      sex: 'male',
    })
    expect(metrics.grip_relative).toBeUndefined()
    expect(metrics.gripKg).toBeGreaterThan(0)
  })

  test('kein Test rechnet ohne Eingabe eine Kennzahl herbei', () => {
    for (const testDef of TEST_CATALOG) {
      const metrics = deriveMetrics(testDef, {}, ctx)
      for (const [key, value] of Object.entries(metrics)) {
        expect(Number.isFinite(value), `${testDef.slug}.${key}`).toBe(true)
      }
    }
  })
})
