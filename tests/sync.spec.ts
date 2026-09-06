import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openDemo, openGuest, stubAuth } from './helpers'

/**
 * Die Synchronisierung.
 *
 * DER TEUERSTE FEHLER wäre hier nicht ein fehlgeschlagener Abgleich, sondern
 * ein stiller Datenverlust: ein Stand, den ein zweites Gerät geschrieben hat,
 * überschrieben von einem Gerät, das ihn nie gesehen hat. Die ersten Fälle
 * halten fest, dass das nicht passieren kann.
 *
 * Der zweite teure Fehler wäre eine Übertragung, die niemand eingeschaltet
 * hat. Auch dafür steht ein Fall.
 */

test.describe('Nichts verlässt das Gerät von allein', () => {
  test('ohne Einschalten wird nicht abgeglichen', async ({ page }) => {
    const calls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('supabase.co') && r.url().includes('/rest/')) calls.push(r.url())
    })
    await stubAuth(page)
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('3200')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')
    await page.waitForTimeout(600)

    expect(calls, 'Messen allein überträgt nichts').toEqual([])
  })

  test('das Profil zeigt den Schalter und sagt, was übertragen würde', async ({ page }) => {
    await stubAuth(page)
    await openDemo(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Synchronisierung' })).toBeVisible()
    await expect(page.getByText(/Alles bleibt auf diesem Gerät/)).toBeVisible()
    await expect(page.getByText(/Nicht übertragen wird dein Passwort/)).toBeVisible()
  })
})

test.describe('Der Schreibvorgang', () => {
  test('verlangt den Stand, den dieses Gerät zuletzt gesehen hat', () => {
    /*
     * Die Bedingung steht IN der Abfrage (`.eq('updated_at', expected)`), nicht
     * als Prüfung davor. Zwischen einer Prüfung und einem Schreibvorgang passt
     * genau der fremde Schreibvorgang, den es zu verhindern gilt — und das
     * wäre der stille Datenverlust.
     */
    const code = readFileSync('src/lib/supabase/sync.ts', 'utf8')
    expect(code).toContain(".eq('updated_at', expected as string)")
    // Und bei fehlgeschlagenem Vergleich wird gemeldet statt geschrieben.
    expect(code).toContain('conflicts.push(athlete.id)')
  })

  test('ein Bestand aus einer neueren Fassung wird nicht heruntergerechnet', () => {
    const code = readFileSync('src/lib/supabase/sync.ts', 'utf8')
    expect(code).toContain('row.schema_version > CURRENT_SCHEMA_VERSION')
  })

  test('geholte Athleten werden ergänzt, nicht ersetzt', () => {
    const code = readFileSync('src/lib/store/AppDataProvider.tsx', 'utf8')
    expect(code).toContain('const fresh = incoming.filter((a) => a && !known.has(a.id))')
  })
})

test.describe('Die Regeln der Datenbank', () => {
  test('jede Tabelle hat Zeilenschutz und eine Regel je Vorgang', () => {
    // Ohne Kommentare: die Begründung im Kopf der Datei DARF von «for all»
    // sprechen — die Anweisungen dürfen es nicht.
    const sql = readFileSync('supabase/migrations/20260906_baseline_core.sql', 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n')
    for (const table of ['public.accounts', 'public.athlete_documents']) {
      expect(sql, table).toContain(`alter table ${table} enable row level security`)
    }
    // Vier Vorgänge je Tabelle, jeder ausdrücklich auf den Eigentümer begrenzt.
    for (const op of ['for select', 'for insert', 'for update', 'for delete']) {
      expect(sql.match(new RegExp(op, 'g'))?.length ?? 0, op).toBeGreaterThanOrEqual(2)
    }
    // Kein «for all»: dann sähe man einer Tabelle nicht mehr an, ob Lesen und
    // Schreiben wirklich dieselbe Bedingung haben.
    expect(sql).not.toContain('for all')
  })

  test('kein Dienstschlüssel im Frontend', () => {
    const files = ['src/lib/supabase/client.ts', 'src/lib/supabase/auth.ts', 'src/lib/supabase/sync.ts']
    for (const f of files) {
      const code = readFileSync(f, 'utf8')
      expect(code, f).not.toMatch(/service_role|SERVICE_ROLE|secret_key/)
    }
  })
})
