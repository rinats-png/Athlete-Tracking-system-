import { expect, test } from '@playwright/test'
import { openDemo, openGuest } from './helpers'

/**
 * Der Einseiter.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: der vollständige Bericht hat vier A4-Seiten.
 * Was tatsächlich weitergereicht wird — an Eltern, an einen Vorstand — ist
 * eine Seite. Ein Bericht, den niemand weitergibt, erzeugt keine Nachfrage.
 *
 * Der teuerste Fehler wäre, beim Kürzen den Vorbehalt wegzulassen: gerade
 * das Blatt, das das Haus verlässt, muss sagen, was es nicht ist (§82).
 * Dafür steht der dritte Fall.
 */

test.describe('Einseiter', () => {
  test('er steht auf einer Seite und nennt Profil und Messwerte', async ({ page }) => {
    await openDemo(page)
    await page.goto('/einseiter', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Leistungsprofil')).toBeVisible()
    await expect(page.getByText('Kurz gefasst')).toBeVisible()
    // Höchstens acht Messwertzeilen — mehr passt nicht auf eine Seite.
    const zeilen = page.locator('table').last().locator('tbody tr')
    expect(await zeilen.count()).toBeLessThanOrEqual(8)
  })

  test('der vollständige Bericht bleibt daneben bestehen', async ({ page }) => {
    await openDemo(page)
    await page.goto('/bericht', { waitUntil: 'domcontentloaded' })
    // Nichts wird ersetzt (§89) — der Einseiter kommt dazu.
    await expect(page.getByRole('link', { name: 'Einseiter' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Bericht drucken|Drucken/ })).toBeVisible()
  })

  test('er sagt, dass er keine medizinische Diagnostik ist', async ({ page }) => {
    await openDemo(page)
    await page.goto('/einseiter', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/keine medizinische Diagnostik/)).toBeVisible()
    await expect(page.getByText(/kein physiologischer Grenzwert/)).toBeVisible()
  })

  test('die Bedienelemente verschwinden im Druck', async ({ page }) => {
    await openDemo(page)
    await page.goto('/einseiter', { waitUntil: 'domcontentloaded' })
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('button', { name: 'Einseiter drucken' })).toBeHidden()
    await expect(page.getByText('Leistungsprofil')).toBeVisible()
  })

  test('ohne Messwerte bleibt er leer statt halb ausgefüllt', async ({ page }) => {
    await openGuest(page)
    await page.goto('/einseiter', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/noch keine Messwerte vor/)).toBeVisible()
  })
})
