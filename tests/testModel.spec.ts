import { expect, test } from '@playwright/test'
import { TEST_CATALOG, getTest } from '../src/data/testCatalog'
import { describeTest, testMode } from '../src/domain/testModel'

/**
 * Der Test als ein Objekt (Konzept §30): Sportart, Protokoll, Equipment,
 * Referenzen, Evidenz, Testmodus — zusammengeführt aus den Schichten, ohne
 * dass irgendwo eine Angabe erfunden wird.
 */

test.describe('Testmodell', () => {
  test('der Testmodus folgt aus dem Protokoll', () => {
    expect(testMode(getTest('cooper_12min')!)).toBe('timer')
    expect(testMode(getTest('back_squat_1rm')!)).toBe('series')
    expect(testMode(getTest('lactate_step_test')!)).toBe('external')
    // Der FTP-Test hat eine feste Dauer — die App läuft den Countdown, den
    // Wert liefert der Leistungsmesser. Zeit vor Gerät.
    expect(testMode(getTest('ftp_20min')!)).toBe('timer')
    // Rudern über 2000 m: der Wert kommt vom Ergometer.
    expect(testMode(getTest('row_2000m')!)).toBe('external')
    expect(testMode(getTest('run_5k')!)).toBe('manual')
  })

  test('jeder Test im Katalog hat einen Modus', () => {
    for (const testDef of TEST_CATALOG) {
      expect(['manual', 'timer', 'series', 'external']).toContain(testMode(testDef))
    }
  })

  test('die Griffkraft kennt ihre Sportarten, Referenzen und Evidenz', () => {
    const model = describeTest('grip_strength')!
    expect(model.sports.some((s) => s.disciplineId === 'general_fitness' && s.role === 'core')).toBe(true)
    expect(model.sports.some((s) => s.disciplineId === 'judo')).toBe(true)
    expect(model.references.length).toBeGreaterThan(0)
    expect(model.evidence.quality).toBe('A')
    expect(model.hasPopulationReference).toBe(true)
    expect(model.evidence.sources.length).toBeGreaterThan(0)
  })

  test('Referenzen für «jeden Test mit dieser Kennzahl» gelten auch für den Cooper-Test', () => {
    const model = describeTest('cooper_12min')!
    expect(model.references.some((r) => r.metricKey === 'vo2max_ml_kg_min')).toBe(true)
  })

  test('ohne Referenz gibt es keine Evidenzstufe — und keine erfundene', () => {
    // Beispiel war der Unterarmstütz; er hat inzwischen einen Bezugswert aus
    // dem US Army Fitness Test. Der Seilklettergang hat keinen.
    const model = describeTest('rope_climb')!
    expect(model.references).toEqual([])
    expect(model.evidence.quality).toBeNull()
    expect(model.hasPopulationReference).toBe(false)
  })

  test('ein Bezugswert allein ist eine Evidenzstufe, aber keine Bevölkerungsreferenz', () => {
    // Der Unterarmstütz hat jetzt genau das: den Höchstwert des US Army
    // Fitness Test, gebunden an die Behördendisziplinen. Er trägt eine
    // Datenqualität, aber er sagt nichts über die Allgemeinbevölkerung.
    const model = describeTest('plank_hold')!
    expect(model.references.length).toBeGreaterThan(0)
    expect(model.evidence.quality).not.toBeNull()
    expect(model.hasPopulationReference).toBe(false)
  })

  test('ein unbekannter Test ergibt kein Modell', () => {
    expect(describeTest('gibt_es_nicht')).toBeNull()
  })
})
