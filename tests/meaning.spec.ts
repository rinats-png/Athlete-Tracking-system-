import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Was ein Messwert bedeutet.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: die App ordnete korrekt ein und nannte auch
 * die Grundlage — «aus Perzentil 62 gegenüber Männer 20–29 Jahre,
 * FRIEND-Register». Das ist richtig und hilft niemandem, der nicht
 * Sportwissenschaft studiert hat.
 *
 * Der teuerste Fehler wäre, in der Übersetzung eine Behauptung
 * hinzuzufügen, die in den Daten nicht steht (§81) — etwa eine
 * Trainingsempfehlung. Dafür steht der letzte Fall.
 */

test.describe('Der Satz zum Wert', () => {
  test('bei der ersten Messung sagt er, dass es noch keine Veränderung gibt', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2800')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    await expect(page.getByText('Was bedeutet das?')).toBeVisible()
    await expect(page.getByText(/erste Messung in diesem Test/).first()).toBeVisible()
  })

  test('er nennt die Bedingung, unter der die nächste Messung vergleichbar ist', async ({
    page,
  }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2800')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    // Diese Grenze stand schon in der Durchführungsvorschrift — nur nicht
    // dort, wo das Ergebnis gelesen wird.
    await expect(page.getByText(/nächste Messung vergleichbar ist/)).toBeVisible()
  })

  test('ohne Referenz sagt er das, statt zu schweigen', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/rope_climb', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Wiederholungen/).fill('4')
    await page.getByLabel(/^Seilhöhe/).fill('5')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    await expect(page.getByText(/keine publizierte Vergleichsgruppe/)).toBeVisible()
  })

  test('der nächste Schritt ist eine Messung, kein Training', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2800')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    // Die Grenze, die der Auftraggeber gezogen hat: kein Trainingsplan,
    // keine Übung. Der Satz darf nur auf eine Messung zeigen.
    await expect(page.getByText(/entscheidet ein Trainer/)).toBeVisible()
    await expect(page.getByText(/Als Nächstes sinnvoll zu messen/)).toBeVisible()
  })
})

test.describe('Einordnung in der Gruppe', () => {
  test('im Einzelmodus gibt es sie nicht', async ({ page }) => {
    await openGuest(page)
    await page.goto('/tests/cooper_12min', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Distanz/).fill('2800')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    // «Rang 1 von 1» wäre eine Auszeichnung für Alleinsein.
    await expect(page.getByText('In deiner Gruppe')).toHaveCount(0)
  })

  test('im Trainermodus steht der Rang im Kader — auch ohne publizierte Norm', async ({ page }) => {
    await openGuest(page)
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('radio', { name: 'Trainer' }).click()
    await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Athlet A')

    await page.goto('/tests/rope_climb', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Wiederholungen/).fill('6')
    await page.getByLabel(/^Seilhöhe/).fill('5')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Athlet hinzufügen' }).first().click()
    await page.getByRole('textbox', { name: /^Name von/ }).last().fill('Athlet B')
    await page.goto('/tests/rope_climb', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/^Wiederholungen/).fill('3')
    await page.getByLabel(/^Seilhöhe/).fill('5')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')

    // Für Seilklettern gibt es keine publizierte Referenz — der Kadervergleich
    // trägt trotzdem.
    await expect(page.getByText('In deiner Gruppe')).toBeVisible()
    await expect(page.getByText(/Rang 2 von 2/)).toBeVisible()
  })
})
