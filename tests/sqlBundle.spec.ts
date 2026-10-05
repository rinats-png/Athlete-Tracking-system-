import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
// @ts-expect-error — reine .mjs-Datei ohne Typen
import { buildBundle, OPEN_MIGRATIONS } from '../scripts/buildSqlBundle.mjs'

/** Sammeldatei der offenen Migrationen: enthält die Einzeldateien unverändert und in der richtigen Reihenfolge. */
test('die Sammeldatei ist aktuell und folgt der Reihenfolge der Migrationen', () => {
  const file = readFileSync('supabase/einspielen/offene_migrationen.sql', 'utf8')
  expect(file, 'npm run sql:bundle ausführen').toBe(buildBundle())
  let pos = -1
  for (const f of OPEN_MIGRATIONS as string[]) {
    const at = file.indexOf(`-- ########## ${f} ##########`)
    expect(at, f).toBeGreaterThan(pos)
    pos = at
    expect(file).toContain(readFileSync(`supabase/migrations/${f}`, 'utf8').trim())
  }
  // Die Reihenfolge entspricht der Zeitstempel-Reihenfolge der Dateinamen.
  expect([...(OPEN_MIGRATIONS as string[])].sort()).toEqual(OPEN_MIGRATIONS)
})
test('die Sammeldatei enthält kein Geheimnis', () => {
  const file = readFileSync('supabase/einspielen/offene_migrationen.sql', 'utf8')
  expect(file).toMatch(/vault\.decrypted_secrets/)
  expect(file).not.toMatch(/x-cron-secret['"]\s*,\s*'[A-Za-z0-9]{16,}/)
})
