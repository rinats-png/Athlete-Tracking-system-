import { expect, test } from '@playwright/test'
import { TEST_CATALOG } from '../src/data/testCatalog'
import { hasStageLevel, testMode } from '../src/domain/testModel'
import { openGuest } from './helpers'

/**
 * Stufentests.
 *
 * Der Testmodus `series` sagt zu, dass die App Schritt für Schritt begleitet.
 * Für Stufentests stimmte das nicht: es gab nur ein Zahlenfeld für die
 * Endstufe, die man sich ausbelastet selbst merken musste. Diese Fälle halten
 * fest, dass der Zähler da ist — und dass er nichts vorgibt, was er nicht
 * kann.
 */

const STAGE_TESTS = TEST_CATALOG.filter((t) => t.protocol.mode === 'stages')

test.describe('Stufentests', () => {
  test('nur wer Stufen zählt, wird als begleitete Serie ausgewiesen', () => {
    expect(STAGE_TESTS.length).toBeGreaterThan(0)
    for (const t of STAGE_TESTS) {
      // Ein Rampentest auf dem Ergometer gibt Watt aus, ein Stufenschwimmen
      // eine Pace. Da kann die App nichts führen, und sie behauptet es auch
      // nicht mehr.
      const erwartet = t.setting === 'lab' ? 'external' : hasStageLevel(t) ? 'series' : 'manual'
      expect(testMode(t), t.slug).toBe(erwartet)
    }
  })

  test('jeder gezählte Stufentest hat ein Feld mit Grenzen und Schrittweite', () => {
    const gezaehlt = STAGE_TESTS.filter(hasStageLevel)
    expect(gezaehlt.length).toBeGreaterThan(0)
    for (const t of gezaehlt) {
      const field = t.fields.find((f) => f.key === t.primaryMetric)!
      expect(field.min, t.slug).not.toBeUndefined()
      expect(field.max, t.slug).not.toBeUndefined()
      expect(field.step, t.slug).not.toBeUndefined()
    }
  })

  test('wo nichts zu zählen ist, steht auch kein Zähler', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/ramp_test_bike', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Eine Stufe weiter' })).toHaveCount(0)
  })

  test('der Zähler zählt hoch und trägt den Wert ins Formular', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/beep_test_20m', { waitUntil: 'domcontentloaded' })

    const up = page.getByRole('button', { name: 'Eine Stufe weiter' })
    await up.click()
    await up.click()
    await up.click()
    // Schrittweite 0,5 ab Stufe 1 — drei Schritte sind Stufe 2,5.
    await expect(page.getByRole('status').or(page.locator('output')).first()).toHaveText('2.5')

    await page.getByRole('button', { name: 'Zurücksetzen' }).click()
    await expect(page.locator('output').first()).toHaveText('1')
  })

  test('die App gibt keinen eigenen Takt vor und sagt das auch', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/beep_test_20m', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/einen eigenen Takt gibt die App bewusst nicht vor/)).toBeVisible()
  })
})
