import { expect, test } from '@playwright/test'
import { TEST_CATALOG } from '../src/data/testCatalog'
import { strikeTest } from '../src/data/testProtocols'

/**
 * Varianten desselben Protokolls waren Kopien: Schlagtest 60 s, Tritttest
 * 60 s und Schlagtest 180 s trugen je eine eigene Anleitung. Wer eine
 * präzisierte, hinterliess zwei Athleten mit verschiedenen Vorgaben unter
 * demselben Testgedanken. Die Fälle hier halten fest, dass die Unterschiede
 * Parameter bleiben und nicht wieder auseinanderlaufen.
 */

const strikeSlugs = ['punch_test_60s', 'kick_test_60s', 'punch_test_180s']
const strikes = strikeSlugs.map((slug) => TEST_CATALOG.find((t) => t.slug === slug)!)

test.describe('Parametrisierte Protokolle', () => {
  test('die drei Schlag- und Tritttests stehen weiter im Katalog', () => {
    expect(strikes.map((t) => t?.slug)).toEqual(strikeSlugs)
  })

  test('die Anleitung nennt die Dauer, die im Protokoll steht', () => {
    for (const testDef of strikes) {
      const seconds = testDef.protocol.durationSeconds!
      const phrase = seconds >= 120 ? `${seconds / 60} Minuten` : `${seconds} Sekunden`
      expect(testDef.instructions.de, testDef.slug).toContain(phrase)
    }
  })

  test('der Parametersatz steht am Test', () => {
    expect(strikes.map((t) => t.variant)).toEqual([
      { action: 'punch', durationSeconds: 60 },
      { action: 'kick', durationSeconds: 60 },
      { action: 'punch', durationSeconds: 180 },
    ])
  })

  test('gleiche Parameter ergeben dieselbe Anleitung — zwei Kopien können nicht auseinanderlaufen', () => {
    const again = strikeTest({
      slug: 'punch_test_60s',
      sortOrder: 504,
      durationSeconds: 60,
      action: 'punch',
      maxReps: 400,
      name: { de: 'x', en: 'x' },
      shortName: { de: 'x', en: 'x' },
      summary: { de: 'x', en: 'x' },
    })
    const original = strikes[0]
    expect(again.instructions).toEqual(original.instructions)
    expect(again.fields).toEqual(original.fields)
    expect(again.derivedMetrics).toEqual(original.derivedMetrics)
  })

  test('ab einer vollen Runde kommt die Frequenz je Minute dazu', () => {
    const short = strikes[0]
    const long = strikes[2]
    expect(short.derivedMetrics).not.toContain('reps_per_minute')
    expect(long.derivedMetrics).toContain('reps_per_minute')
  })

  test('die Anleitung verspricht nichts, was der Test nicht misst', () => {
    for (const testDef of strikes) {
      expect(testDef.instructions.de).toContain('Schlagkraft misst dieser Test ausdrücklich nicht')
    }
  })
})
