import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { REFERENCES } from '../src/data/references'

/**
 * Lizenzfeld an jeder Referenzquelle (Master-Spezifikation, Entscheidung 13).
 * Jede offene Quelle steht in docs/referenzlizenzen.md — sonst ginge sie
 * zwischen Code und Doku verloren.
 */
test('jede Referenz trägt eine Rechtelage, jede offene steht in der Liste', () => {
  const doc = readFileSync(new URL('../docs/referenzlizenzen.md', import.meta.url), 'utf-8')
  const open = doc.slice(doc.indexOf('## Offene Fälle'), doc.indexOf('## Geklärt'))
  for (const r of REFERENCES) {
    expect(['open_access', 'public_domain', 'published_values', 'published_table', 'unclear'], r.source.study).toContain(r.source.license)
    if (r.source.license === 'published_table' || r.source.license === 'unclear') {
      expect(open, r.source.study).toContain(r.source.study)
    }
  }
})
