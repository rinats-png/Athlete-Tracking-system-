import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Der Gastmodus muss ohne Konto vollständig benutzbar sein: Profil anlegen,
 * Test erfassen, Ergebnis im Verlauf und im Profil wiederfinden, Daten wieder
 * löschen. Das ist der Weg, den ein Nutzer ohne Anmeldung nimmt.
 */

test.describe('Gastmodus', () => {
  test('kompletter Durchlauf: Profil, Test, Verlauf, Löschen', async ({ page }) => {
    await openGuest(page)

    // Leerzustand statt leerem Diagramm
    await expect(page.getByText(/Noch keine Messung/)).toBeVisible()

    // 1. Profil anlegen — für Relativkraft und Perzentile nötig
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Vorname').fill('Testperson')
    await page.getByRole('radio', { name: 'Männlich' }).click()
    await page.getByLabel('Geburtsdatum').fill('1994-03-11')
    await page.getByLabel('Körpergrösse').fill('181')

    // 2. Körpergewicht als Zeitreihe
    await page.getByLabel('Körpergewicht', { exact: true }).last().fill('83.2')
    await page.getByRole('button', { name: 'Gewicht speichern' }).click()
    await expect(page.getByText('83.2 kg')).toBeVisible()

    // 3. Test durchführen
    await page.goto('/tests/back_squat_1rm', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Gewicht/).fill('165')
    await page.getByLabel(/^Wiederholungen/).fill('1')

    // Die abgeleiteten Werte erscheinen noch vor dem Speichern.
    await expect(page.getByText('Relativkraft')).toBeVisible()

    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/verlauf')

    // 4. Ergebnis ist im Verlauf
    await expect(page.getByText('Kniebeuge (Back Squat) 1RM').first()).toBeVisible()

    // 5. Und im Dashboard entsteht ein Profil
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Testperson')).toBeVisible()
    await expect(page.getByText(/Baseline-Index/i).first()).toBeVisible()

    // 6. Daten überleben einen Reload — sie liegen lokal
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Testperson')).toBeVisible()

    // 7. Und lassen sich vollständig löschen
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Alle Daten löschen' }).click()
    await page.getByRole('button', { name: 'Ja, löschen' }).click()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Noch keine Messung/)).toBeVisible()
  })

  test('es werden keine Netzwerkanfragen an Fremdziele gestellt', async ({ page }) => {
    const external: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      const ownHost = url.hostname === '127.0.0.1' || url.hostname === 'localhost'
      const isFont = url.hostname.includes('fonts.g')
      if (!ownHost && !isFont) external.push(request.url())
    })

    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('3200')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/verlauf')

    // Die Zusage des Gastmodus: nichts verlässt das Gerät.
    expect(external, 'keine Übertragung an Dritte').toEqual([])
  })
})
