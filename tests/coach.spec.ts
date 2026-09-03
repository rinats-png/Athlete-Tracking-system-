import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Der Trainermodus führt mehrere Menschen auf einem Gerät. Der teuerste
 * Fehler ist hier nicht ein Absturz, sondern eine Messung, die beim falschen
 * Kunden landet: im Nachhinein ist das kaum zu erkennen und verfälscht zwei
 * Profile gleichzeitig. Diese Fälle bewachen die Trennung.
 */

async function enableCoachMode(page: import('@playwright/test').Page) {
  await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Trainer' }).click()
}

test.describe('Trainermodus', () => {
  test('im Einzelmodus gibt es keinen Athletenumschalter', async ({ page }) => {
    await openGuest(page)
    await expect(page.getByRole('button', { name: /Ohne Namen|Athlet/ })).toHaveCount(0)
  })

  test('Bestände zweier Athleten bleiben getrennt', async ({ page }) => {
    await openGuest(page)
    await enableCoachMode(page)

    // Erster Athlet bekommt einen Namen und eine Messung.
    await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Athlet A')
    await page.goto('/tests/standing_broad_jump', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/Sprungweite|Weite|Distanz/).first().fill('2.40')
    await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
    await page.waitForURL('**/ergebnis/**')
    await expect(page.getByText(/240\s*cm/).first()).toBeVisible()

    // Zweiter Athlet: eigener, leerer Bestand.
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Athlet hinzufügen' }).first().click()
    await page.getByRole('textbox', { name: /^Name von/ }).last().fill('Athlet B')

    await page.goto('/verlauf', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/240\s*cm/)).toHaveCount(0)

    // Und zurück: der Bestand des ersten ist unversehrt.
    await page.getByRole('button', { name: /Athlet B/ }).click()
    await page.getByRole('option', { name: /Athlet A/ }).click()
    await expect(page.getByText(/240\s*cm/).first()).toBeVisible()
  })

  test('der aktive Athlet steht dauerhaft in der Kopfzeile', async ({ page }) => {
    await openGuest(page)
    await enableCoachMode(page)
    await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Mara Vogt')

    for (const route of ['/', '/diagnostik', '/verlauf', '/analyse']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('button', { name: /Mara Vogt/ })).toBeVisible()
    }
  })

  test('Archivieren blendet aus, ohne Messwerte zu verlieren', async ({ page }) => {
    await openGuest(page)
    await enableCoachMode(page)
    await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Athlet A')

    await page.getByRole('button', { name: 'Athlet hinzufügen' }).first().click()
    await page.getByRole('textbox', { name: /^Name von/ }).last().fill('Athlet B')

    // A archivieren — B bleibt aktiv, A verschwindet aus der Auswahl.
    await page.getByRole('button', { name: 'Archivieren' }).first().click()
    await expect(page.getByText('archiviert')).toBeVisible()

    await page.getByRole('button', { name: /Athlet B/ }).click()
    await expect(page.getByRole('option', { name: /Athlet A/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Schliessen' }).click()

    // Wiederherstellen bringt ihn samt allem zurück.
    await page.getByRole('button', { name: 'Wiederherstellen' }).first().click()
    await page.getByRole('button', { name: /Athlet B/ }).click()
    await expect(page.getByRole('option', { name: /Athlet A/ })).toBeVisible()
  })

  test('der letzte Athlet lässt sich nicht löschen', async ({ page }) => {
    await openGuest(page)
    await enableCoachMode(page)
    await expect(page.getByRole('button', { name: 'Athlet löschen' })).toBeDisabled()
  })

  test('Löschen verlangt eine Bestätigung, die den Umfang nennt', async ({ page }) => {
    await openGuest(page)
    await enableCoachMode(page)
    await page.getByRole('button', { name: 'Athlet hinzufügen' }).first().click()
    await page.getByRole('textbox', { name: /^Name von/ }).last().fill('Athlet B')

    await page.getByRole('button', { name: 'Athlet löschen' }).last().click()
    await expect(page.getByText(/endgültig gelöscht/)).toBeVisible()
    await expect(page.getByText(/Archiv/)).toBeVisible()

    await page.getByRole('button', { name: 'Endgültig löschen' }).click()
    await expect(page.getByRole('textbox', { name: /^Name von/ })).toHaveCount(1)
  })
})
