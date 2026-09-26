import { expect, test } from '@playwright/test'
import { readDict } from './helpers'

/**
 * Peak Week ist ein Protokoll, kein Plan (Master-Spezifikation, Entscheidung 9).
 *
 * Wer hier später eine «Empfehlung» ergänzt, soll an diesem Fall hängen
 * bleiben: eine falsche Wasser-, Natrium- oder Kohlenhydratvorgabe in der
 * Woche vor dem Wettkampf ist ein gesundheitliches Risiko.
 */
test('die Peak-Week-Texte schreiben nichts vor', () => {
  const peak = readDict('de').peak as Record<string, unknown>
  const texts = Object.entries(peak)
    // Der eine Satz, der ausdrücklich sagt, dass es KEINE Vorgaben gibt.
    .filter(([k]) => k !== 'noPrescription')
    .flatMap(([, v]) => (typeof v === 'string' ? [v] : Object.values(v as Record<string, string>)))
    .join(' ')
  for (const word of ['solltest', 'empfohlen', 'Empfehlung', 'reduzier', 'erhöh', 'g/kg', 'mg', 'Liter', 'trinke', 'iss ']) {
    expect(texts, `«${word}» wäre eine Vorgabe`).not.toContain(word)
  }
  expect(String(peak.noPrescription)).toContain('Keine Vorgaben')
})
