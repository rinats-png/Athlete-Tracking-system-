import { expect, test } from '@playwright/test'
import { TEST_CATALOG, type TestDefinition, type TestField } from '../src/data/testCatalog'
import { TEST_CLASSIFICATION } from '../src/data/testClassification'
import { deriveMetrics } from '../src/lib/metrics/derive'
import { PERFORMANCE_DIMENSIONS } from '../src/types/domain'

/**
 * Die Einordnung — welcher Test auf welche Achse einzahlt und aus welcher
 * Kennzahl — steht seit Befund 04 geschlossen in einer Tabelle statt
 * zwischen den Anleitungstexten. Der Gewinn ist erst dann echt, wenn die
 * Tabelle nachweislich vollständig ist und ihre Kennzahlen tatsächlich
 * entstehen.
 */

const sample = (field: TestField): number => {
  const min = field.min ?? 1
  const max = field.max ?? min + 100
  const mid = min + (max - min) / 2
  return field.type === 'integer' ? Math.max(1, Math.round(mid)) : Math.round(mid * 100) / 100
}

const allMetrics = (testDef: TestDefinition): Record<string, number> => {
  const values: Record<string, number> = {}
  for (const field of testDef.fields) values[field.key] = sample(field)
  if (values.reps != null && values.repsFirst30 != null) {
    values.repsFirst30 = Math.max(1, Math.round(values.reps * 0.6))
  }
  if (values.durationSeconds != null && values.bikeMinutes != null) {
    values.bikeMinutes = Math.max(1, Math.round((values.durationSeconds * 0.6) / 60))
  }
  return deriveMetrics(testDef, values, { bodyWeightKg: 78, ageYears: 28, sex: 'male' })
}

test.describe('Einordnung der Tests', () => {
  test('jeder Test im Katalog hat genau einen Eintrag', () => {
    const missing = TEST_CATALOG.filter((t) => TEST_CLASSIFICATION[t.slug] == null).map(
      (t) => t.slug,
    )
    expect(missing).toEqual([])
  })

  test('kein Eintrag steht ohne Test', () => {
    const slugs = new Set(TEST_CATALOG.map((t) => t.slug))
    const orphans = Object.keys(TEST_CLASSIFICATION).filter((slug) => !slugs.has(slug))
    expect(orphans).toEqual([])
  })

  test('jeder Test zahlt auf mindestens eine Achse ein', () => {
    const without = TEST_CATALOG.filter(
      (t) => Object.keys(t.dimensionMetrics).length === 0,
    ).map((t) => t.slug)
    expect(without).toEqual([])
  })

  test('jede genannte Achse ist eine bekannte Achse', () => {
    for (const [slug, entry] of Object.entries(TEST_CLASSIFICATION)) {
      for (const axis of Object.keys(entry.dimensionMetrics)) {
        expect(PERFORMANCE_DIMENSIONS, `${slug}: ${axis}`).toContain(axis)
      }
      expect(PERFORMANCE_DIMENSIONS, slug).toContain(entry.dimension)
    }
  })

  test('jede Kennzahl der Einordnung wird von ihrem Test auch gebildet', () => {
    const broken: string[] = []
    for (const testDef of TEST_CATALOG) {
      const metrics = allMetrics(testDef)
      for (const [axis, key] of Object.entries(testDef.dimensionMetrics)) {
        if (metrics[key] == null) broken.push(`${testDef.slug} → ${axis}: ${key}`)
      }
    }
    expect(broken).toEqual([])
  })

  test('die Einordnung lässt sich ändern, ohne die Protokolltexte anzufassen', () => {
    // Die Zusammenführung ist eine reine Ergänzung: das Protokoll bleibt, wie
    // die Katalogdatei es aufschreibt.
    const cooper = TEST_CATALOG.find((t) => t.slug === 'cooper_12min')!
    expect(cooper.protocol).toEqual({ mode: 'countdown', durationSeconds: 720 })
    expect(cooper.dimensionMetrics).toEqual(TEST_CLASSIFICATION.cooper_12min.dimensionMetrics)
    expect(cooper.direction).toBe(TEST_CLASSIFICATION.cooper_12min.direction)
  })
})
