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

    // Leerzustand: die Tests zum Start statt eines leeren Diagramms
    await expect(page.getByText('Zum Start empfohlen')).toBeVisible()

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
    await page.waitForURL('**/ergebnis/**')

    // 4. Die Auswertung steht — mit dem Wert
    await expect(page.getByText('Kniebeuge (Back Squat) 1RM').first()).toBeVisible()
    await expect(page.getByText('Dein Wert')).toBeVisible()

    // 5. Und in der Übersicht entsteht ein Profil
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Testperson')).toBeVisible()
    await expect(page.getByText('Performance-Profil').first()).toBeVisible()

    // 6. Daten überleben einen Reload — sie liegen lokal
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Testperson')).toBeVisible()

    // 7. Und lassen sich vollständig löschen
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Alle Daten löschen' }).click()
    await page.getByRole('button', { name: 'Ja, löschen' }).click()
    // Ein leerer Bestand führt ehrlich wieder durch den Einstieg.
    await expect(page.getByText('Schritt 1 von 9')).toBeVisible()
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
    await page.waitForURL('**/ergebnis/**')

    // Die Zusage des Gastmodus: nichts verlässt das Gerät.
    expect(external, 'keine Übertragung an Dritte').toEqual([])
  })
})
