import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'
import { emptyData } from '../src/lib/store/schema'
import { blockFonts, openGuest } from './helpers'

/**
 * Die Umbenennung von Baseline zu Kydon — und was dabei NICHT passieren darf.
 *
 * Ein neuer Name ist für die Marke ein Anfang und für einen bestehenden
 * Nutzer ein Risiko: Sein Bestand liegt unter dem alten Schlüssel, seine
 * Exportdateien tragen die alte Kennung. Diese Fälle sichern, dass beides
 * nach dem Update weiter funktioniert. Sie sind der Beweis für §89 (kein
 * Datenverlust) und §32 (der Export ist immer die vollständige Rettung) —
 * genau an der Stelle, an der eine Umbenennung beides brechen würde.
 */
test.describe('Umzug der Speicherschlüssel', () => {
  test('ein Bestand unter dem alten Namen ist nach dem Start unter dem neuen da', async ({ page }) => {
    await blockFonts(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const seeded = emptyData()
    seeded.athletes[0].name = 'Altbestand Meier'
    seeded.athletes[0].profile.onboardingCompletedAt = '2026-01-01T00:00:00.000Z'

    // Genau der Zustand eines Geräts, auf dem die App vor der Umbenennung
    // lief: nichts unter «kydon.», alles unter «baseline.».
    await page.evaluate((store) => {
      localStorage.clear()
      localStorage.setItem('baseline.data.v1', JSON.stringify(store))
      localStorage.setItem('baseline.theme', 'dark')
      localStorage.setItem('baseline.locale', 'de')
      localStorage.setItem('baseline.intro', 'off')
      localStorage.setItem('baseline.equipment', '["barbell"]')
      localStorage.setItem(
        'baseline.account.v1',
        JSON.stringify({
          name: 'Altbestand',
          email: 'alt@baseline.test',
          role: 'athlete',
          planId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
      )
    }, seeded)
    await page.reload({ waitUntil: 'domcontentloaded' })

    // Der Bestand ist da — nicht «neu eingerichtet», sondern der alte.
    const keys = await page.evaluate(() => Object.keys(localStorage).sort())
    expect(keys.filter((k) => k.startsWith('baseline.')), 'alte Schlüssel sind noch da').toEqual([])
    for (const k of ['kydon.data.v1', 'kydon.theme', 'kydon.locale', 'kydon.intro', 'kydon.equipment', 'kydon.account.v1']) {
      expect(keys, `${k} fehlt nach dem Umzug`).toContain(k)
    }
    const name = await page.evaluate(
      () => JSON.parse(localStorage.getItem('kydon.data.v1') ?? '{}').athletes?.[0]?.name,
    )
    expect(name).toBe('Altbestand Meier')
    // Auch das Theme ist mitgezogen — und wirkt.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('ein bereits vorhandener neuer Stand wird durch den alten nicht überschrieben', async ({ page }) => {
    await blockFonts(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const older = emptyData()
    older.athletes[0].name = 'Alt'
    const newer = emptyData()
    newer.athletes[0].name = 'Neu'
    await page.evaluate(({ older, newer }) => {
      localStorage.clear()
      localStorage.setItem('baseline.data.v1', JSON.stringify(older))
      localStorage.setItem('kydon.data.v1', JSON.stringify(newer))
    }, { older, newer })
    await page.reload({ waitUntil: 'domcontentloaded' })
    const name = await page.evaluate(
      () => JSON.parse(localStorage.getItem('kydon.data.v1') ?? '{}').athletes?.[0]?.name,
    )
    expect(name, 'der jüngere Stand unter dem neuen Namen muss gewinnen').toBe('Neu')
    expect(await page.evaluate(() => localStorage.getItem('baseline.data.v1'))).toBeNull()
  })

  test('das Theme-Vorabskript ist eine eigene Datei, keine Inline-Zeile', () => {
    // Die Inhaltsrichtlinie erlaubt Skripte nur von der eigenen Herkunft. Ein
    // Inline-Skript in index.html wäre in Produktion still blockiert — und
    // das Theme blitzte genau so auf, wie es nicht sollte.
    const html = readFileSync('index.html', 'utf-8')
    expect(html).toContain('<script src="/theme-init.js"></script>')
    expect(html, 'index.html enthält ein Inline-Skript').not.toMatch(/<script>\s*\(/)
    expect(existsSync('public/theme-init.js')).toBe(true)
    const script = readFileSync('public/theme-init.js', 'utf-8')
    // Beide Schlüssel, weil das Skript VOR dem Umzug läuft.
    expect(script).toContain("'kydon.theme'")
    expect(script).toContain("'baseline.theme'")
  })
})

test.describe('Alte Exportdateien bleiben einlesbar', () => {
  test('die alte Kennung wird weiter angenommen, die neue geschrieben', () => {
    // Geprüft an der Quelle: der Import läuft über `importData`, und die Datei
    // benennt beide Kennungen ausdrücklich. Ein Laufzeittest bräuchte den
    // Entwicklungsserver — der Vorschau-Server liefert /src nicht aus.
    const src = readFileSync('src/lib/store/localStore.ts', 'utf-8')
    expect(src).toContain("EXPORT_FORMAT = 'KYDON_DATA_EXPORT'")
    expect(src).toContain("LEGACY_EXPORT_FORMATS: readonly string[] = ['BASELINE_DATA_EXPORT']")
    expect(src).toContain('LEGACY_EXPORT_FORMATS.includes(')
    const handover = readFileSync('src/lib/store/handover.ts', 'utf-8')
    expect(handover).toContain("HANDOVER_FORMAT = 'KYDON_ATHLETE_HANDOVER'")
    expect(handover).toContain("'BASELINE_ATHLETE_HANDOVER'")
  })

  test('ein Export im alten Format lässt sich in der App einlesen', async ({ page }) => {
    const data = emptyData()
    data.athletes[0].name = 'Aus altem Export'
    data.athletes[0].profile.onboardingCompletedAt = '2026-01-01T00:00:00.000Z'
    // Ein Umschlag, wie ihn die App vor der Umbenennung geschrieben hat.
    const legacy = JSON.stringify({
      format: 'BASELINE_DATA_EXPORT',
      schemaVersion: data.version,
      appVersion: '0.1.0',
      createdAt: '2026-08-01T00:00:00.000Z',
      data,
    })
    // Ein eingerichteter Bestand, damit die Navigation steht — der Import
    // ersetzt ihn dann durch die Datei.
    await openGuest(page)
    await page.getByRole('button', { name: 'PROFIL' }).click()
    await page.getByLabel('Importieren').setInputFiles({
      name: 'alt.json',
      mimeType: 'application/json',
      buffer: Buffer.from(legacy),
    })
    // Kein «kein KYDON-Export» — die alte Kennung gilt weiter …
    await expect(page.getByRole('alert')).toHaveCount(0)
    // … und der Bestand aus der Datei liegt jetzt unter dem neuen Schlüssel.
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem('kydon.data.v1') ?? '{}').athletes?.[0]?.name,
        ),
      )
      .toBe('Aus altem Export')
  })
})
