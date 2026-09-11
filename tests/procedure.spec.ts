import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Durchführungsvorschriften.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: der Katalog sagte in ein bis zwei Sätzen,
 * was zu tun ist. Das genügt, um einen Test einmal durchzuführen — nicht,
 * um ihn ein halbes Jahr später unter denselben Bedingungen zu wiederholen.
 * Genau daran hängt in KYDON alles: eine Veränderung ist nur dann eine
 * Veränderung, wenn nicht das Vorgehen sich geändert hat.
 *
 * Der teuerste Fehler wäre, eine aus dem Testmodus abgeleitete Vorschrift
 * wie ein geprüftes Protokoll aussehen zu lassen (§81). Dafür steht der
 * dritte Fall.
 */

test.describe('Durchführungsvorschrift', () => {
  test('die Detailseite nennt Vorbereitung, Versuche, Abbruch und was gleich bleiben muss', async ({
    page,
  }) => {
    await openGuest(page)
    await page.goto('/tests/back_squat_1rm/details', { waitUntil: 'domcontentloaded' })

    const panel = page.getByText('Durchführung', { exact: true }).locator('..')
    await expect(panel).toBeVisible()
    for (const label of ['Vorbereitung', 'Versuche und Pausen', 'Wann ein Versuch zählt', 'Abbruch', 'Was gleich bleiben muss']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    // Die Tiefe entscheidet, ob zwei Kniebeugen dasselbe messen.
    await expect(page.getByText(/Hüfte kommt unter die Höhe des Knies/)).toBeVisible()
  })

  test('während der Durchführung ist sie erreichbar, ohne die Eingabe zu verlieren', async ({
    page,
  }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2600')

    await expect(page.getByText('Was gleich bleiben muss')).toBeHidden()
    await page.getByText('Durchführung', { exact: true }).click()
    await expect(page.getByText('Was gleich bleiben muss')).toBeVisible()

    // Das Formular bleibt stehen — sonst wäre der Blick in die Vorschrift teuer.
    await expect(page.getByLabel(/^Distanz/)).toHaveValue('2600')
  })

  test('eine abgeleitete Vorschrift ist als allgemein gekennzeichnet', async ({ page }) => {
    await openGuest(page)
    // Für diesen Test ist keine eigene Vorschrift hinterlegt; was zu sehen ist,
    // folgt aus dem Testmodus und darf nicht als Protokoll durchgehen (§81).
    await page.goto('/tests/rope_climb/details', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Durchführung', { exact: true })).toBeVisible()
    await expect(page.getByText('allgemein', { exact: true })).toBeVisible()
    await expect(page.getByText(/noch keine eigene Vorschrift hinterlegt/)).toBeVisible()
  })
})
