import { expect, test } from '@playwright/test'
import { buildMetric, confidenceFromSample, confidenceLabel, qualityFromSample, DERIVE_VERSION } from '../src/domain/metricContract'
import { CURRENT_SCHEMA_VERSION, emptyData, parseStoredData } from '../src/lib/store/schema'

/**
 * Der Vertrag einer abgeleiteten Kennzahl (Master-Spezifikation D1).
 *
 * Geprüft wird die Zusage, auf die sich jede Anzeige verlässt: unter der
 * Mindestmenge gibt es keinen Wert, und jede Kennzahl sagt, woraus und nach
 * welcher Fassung sie entstand.
 */

const period = { from: '2026-09-01', to: '2026-09-28' }
const spec = { key: 'demo', algorithm: 'demo_mean', algorithmVersion: '1.0.0', unit: '%', minSample: 3, targetSample: 10 }

test.describe('Metric Contract', () => {
  test('unter der Mindestmenge: kein Wert, Warnung, keine Konfidenz', () => {
    const m = buildMetric(spec, { value: 42, sampleSize: 2, period })
    expect(m.value).toBeNull()
    expect(m.warnings).toContain('insufficient_data')
    expect(m.confidence).toBeNull()
    expect(m.quality).toBe('low')
    expect(m.algorithmVersion).toBe('1.0.0')
  })

  test('ab der Mindestmenge: Wert mit Qualität und Konfidenz nach Stichprobe', () => {
    const mid = buildMetric(spec, { value: 42, sampleSize: 5, period })
    expect(mid.value).toBe(42)
    expect(mid.quality).toBe('medium')
    expect(mid.confidence).toBe(0.5)
    expect(mid.confidenceLabel).toBe('MEDIUM')

    const full = buildMetric(spec, { value: 42, sampleSize: 12, period, completeness: 0.9 })
    expect(full.quality).toBe('high')
    expect(full.confidence).toBe(0.9)
    expect(full.confidenceLabel).toBe('HIGH')
  })

  test('Lücken im Zeitfenster senken die Konfidenz und werden benannt', () => {
    const m = buildMetric(spec, { value: 42, sampleSize: 10, period, completeness: 0.5 })
    expect(m.confidence).toBe(0.5)
    expect(m.warnings).toContain('low_completeness')
  })

  test('vorläufige Formeln und Schätzungen sind gekennzeichnet', () => {
    const m = buildMetric({ ...spec, provisional: true, estimate: true }, { value: 1, sampleSize: 10, period })
    expect(m.warnings).toEqual(expect.arrayContaining(['provisional_formula', 'estimate']))
  })

  test('Stufen und Hilfsfunktionen', () => {
    expect(confidenceLabel(0.39)).toBe('LOW')
    expect(confidenceLabel(0.4)).toBe('MEDIUM')
    expect(confidenceLabel(0.7)).toBe('HIGH')
    expect(confidenceLabel(null)).toBeNull()
    expect(qualityFromSample(0, 1, 5)).toBe('low')
    expect(confidenceFromSample(20, 10)).toBe(1)
  })
})

test.describe('Schema 27', () => {
  test('ein Bestand der Version 26 wird angehoben, alte Ergebnisse haben keine bekannte Fassung', () => {
    const old = { ...emptyData(), version: 26 } as any
    old.athletes[0].results = [
      {
        id: 'r1',
        testSlug: 'run_5k',
        performedAt: '2026-01-01T10:00:00.000Z',
        values: { durationSeconds: 1500 },
        metrics: {},
        score: 1500,
        createdAt: '2026-01-01T10:00:00.000Z',
      },
    ]
    delete old.athletes[0].insightState
    const { data, report } = parseStoredData(old)
    expect(report.migratedFrom).toBe(26)
    expect(data?.version).toBe(CURRENT_SCHEMA_VERSION)
    expect(data?.athletes[0].results[0].deriveVersion).toBeNull()
    expect(data?.athletes[0].insightState).toEqual([])
    expect(data?.athletes[0].nutrition.weightRateBand).toBeNull()
  })

  test('die Fassung der Ableitungen ist gesetzt', () => {
    expect(DERIVE_VERSION).toMatch(/^\d{4}\.\d{2}\.\d+$/)
  })
})
