import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

/**
 * Wächter für die Produktdoktrin (docs/produktdoktrin.md, §2, §5, §29).
 *
 * KYDON sagt nicht, wie jemand trainieren soll, und leitet aus Gleichzeitigem
 * keine Ursache ab. Dieser Fall liest die deutschen und englischen
 * Oberflächentexte (ohne Rechtstexte) und schlägt an, sobald dort Ratgeber-
 * oder Kausalsprache auftaucht. Er ersetzt kein Lesen — er fängt das
 * Offensichtliche, bevor es live geht.
 */

const PATTERNS: Record<'de' | 'en', RegExp[]> = {
  de: [
    /\bmach(e|t)?\s+(mehr|weniger)\b/i,
    /\breduzier(e|t)\b/i,
    /\btrainier(e|t)\s+(mehr|weniger|gezielt)\b/i,
    /\bdu brauchst mehr\b/i,
    /\bdu solltest\b/i,
    /\bsolltest du\b/i,
    /\b(erhöhe|steigere|senke|verringere)\s+(dein|deine|den|die|das)\b/i,
    /\bwegen\s+(des|der|deines|deiner|dem|deinem|dein|deine)\b/i,
    /\baufgrund\s+(des|der|deines|deiner)\b/i,
    /\bdeshalb (sank|stieg|fiel)\b/i,
    /\bverursacht\b/i,
    /\bist die Ursache\b/i,
  ],
  en: [
    /\byou need more\b/i,
    /\b(reduce|increase|decrease)\s+your\b/i,
    /\btrain (more|less)\b/i,
    /(?<!what )\byou should (do|train|eat|rest)\b/i,
    /\bbecause of\b/i,
    /\bcaused by\b/i,
    /\bdue to\b/i,
  ],
}

const SKIP_TOP = new Set(['legal', 'privacy', 'terms', 'imprint', 'dpa'])

function* walk(value: unknown, path = ''): Generator<[string, string]> {
  if (typeof value === 'string') yield [path, value]
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) yield* walk(v, path ? `${path}.${k}` : k)
}

for (const lang of ['de', 'en'] as const) {
  test(`${lang}: keine Ratgeber- oder Kausalsprache in den Oberflächentexten`, () => {
    const hits: string[] = []
    for (const file of ['', '.extra']) {
      const dict = JSON.parse(readFileSync(`src/i18n/${lang}${file}.json`, 'utf-8'))
      for (const [key, text] of walk(dict)) {
        if (SKIP_TOP.has(key.split('.')[0])) continue
        for (const re of PATTERNS[lang]) {
          if (re.test(text)) {
            hits.push(`${key}: «${text.slice(0, 90)}»`)
            break
          }
        }
      }
    }
    expect(hits, `Verstoß gegen die Produktdoktrin:\n${hits.join('\n')}`).toEqual([])
  })
}

test('der Wächter erkennt, wonach er suchen soll', () => {
  expect(PATTERNS.de.some((re) => re.test('Mach mehr Plyometrie.'))).toBe(true)
  expect(PATTERNS.de.some((re) => re.test('Dein Sprung sank wegen des Umfangs.'))).toBe(true)
  expect(PATTERNS.en.some((re) => re.test('Reduce your volume.'))).toBe(true)
  expect(PATTERNS.de.some((re) => re.test('Beide Veränderungen traten im gleichen Zeitraum auf.'))).toBe(false)
})
