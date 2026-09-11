import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Bedingungen einmal für den ganzen Testtag.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: Untergrund, Temperatur und Ausrüstung wurden
 * je Messwert erfasst. An einem Testtag sind sie für alle fünfzehn Athleten
 * dieselben — fünfzehnmal dasselbe einzutippen macht niemand, und deshalb
 * blieben die Felder leer.
 *
 * Genau diese Felder entscheiden aber, ob zwei Messungen vergleichbar sind:
 * ohne sie meldet der Athletenvergleich «keine Unterschiede festgehalten»,
 * obwohl niemand hingesehen hat.
 */

async function coachWithTwo(page: import('@playwright/test').Page) {
  await openGuest(page)
  await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Trainer' }).click()
  await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Athlet A')
  await page.getByRole('button', { name: 'Athlet hinzufügen' }).first().click()
  await page.getByRole('textbox', { name: /^Name von/ }).last().fill('Athlet B')
}

test.describe('Bedingungen des Testtags', () => {
  test('einmal eingetragen, stehen sie an jeder Messung dieses Tages', async ({ page }) => {
    await coachWithTwo(page)
    await page.goto('/trainer/testtag', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Testtag anlegen' }).click()
    await page.getByLabel('Batterie').selectOption({ label: 'Allgemeine Fitness' })
    await page.getByRole('button', { name: 'Anlegen', exact: true }).click()
    await page.getByRole('link', { name: 'Öffnen' }).first().click()

    await page.getByLabel('Untergrund').fill('Halle, Tartan')
    await page.getByLabel('Temperatur').fill('19')
    await expect(page.getByText(/Wird auf jede Messung dieses Tages geschrieben/)).toBeVisible()

    await page.getByRole('link', { name: /An dieser Station erfassen/ }).first().click()
    await page.waitForURL('**/gruppentest?**')

    // Nach Namen statt nach Position: auf dem Tablet und am Rechner steht die
    // Eingabe anders, und ein Positionsindex traf dort das falsche Feld.
    await page.getByLabel('Athlet A').fill('40')
    await page.getByLabel('Athlet B').fill('35')
    await page.getByRole('button', { name: /speichern/i }).first().click()

    const bestand = JSON.parse(
      (await page.evaluate(() => localStorage.getItem('kydon.data.v1'))) ?? '{}',
    )
    const alle = bestand.athletes.flatMap((a: { results: unknown[] }) => a.results) as {
      context: { surface: string; temperatureC: number | null }
    }[]
    expect(alle.length).toBeGreaterThan(0)
    for (const ergebnis of alle) {
      expect(ergebnis.context.surface).toBe('Halle, Tartan')
      expect(ergebnis.context.temperatureC).toBe(19)
    }
  })

  test('ohne Eintrag sagt der Testtag, was dadurch verloren geht', async ({ page }) => {
    await coachWithTwo(page)
    await page.goto('/trainer/testtag', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Testtag anlegen' }).click()
    await page.getByLabel('Batterie').selectOption({ label: 'Allgemeine Fitness' })
    await page.getByRole('button', { name: 'Anlegen', exact: true }).click()
    await page.getByRole('link', { name: 'Öffnen' }).first().click()

    // Nicht bloss ein leeres Feld: der Satz sagt, warum es sich lohnt.
    await expect(page.getByText(/nicht sagen, ob zwei Messungen vergleichbar sind/)).toBeVisible()
  })
})
