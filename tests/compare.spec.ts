import { expect, test } from '@playwright/test'
import { openGuest } from './helpers'

/**
 * Athletenvergleich und Gruppenbericht.
 *
 * DIE LÜCKE, DIE DAS SCHLIESST: ein Trainer, der gefragt wird, wer im Kader
 * der schnellste ist, musste zwölf Profile öffnen und die Zahlen im Kopf
 * behalten.
 *
 * Der teuerste Fehler wäre eine Rangliste, die es nicht gibt: zwei Werte,
 * von denen nur einer gemessen wurde, oder zwei Messungen unter
 * verschiedenen Bedingungen (§81). Dafür stehen der zweite und der dritte
 * Fall.
 */

async function coachWithTwo(page: import('@playwright/test').Page) {
  await openGuest(page)
  await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Trainer' }).click()

  await page.getByRole('textbox', { name: /^Name von/ }).first().fill('Athlet A')
  await page.goto('/tests/standing_broad_jump', { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/Sprungweite|Weite|Distanz/).first().fill('2.40')
  await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
  await page.waitForURL('**/ergebnis/**')

  await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Athlet hinzufügen' }).first().click()
  await page.getByRole('textbox', { name: /^Name von/ }).last().fill('Athlet B')
  await page.goto('/tests/standing_broad_jump', { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/Sprungweite|Weite|Distanz/).first().fill('2.00')
  await page.getByRole('button', { name: 'Ergebnis speichern' }).click()
  await page.waitForURL('**/ergebnis/**')
}

test.describe('Athletenvergleich', () => {
  test('ein gemeinsamer Test stellt beide nebeneinander, mit Rang und Anteil', async ({ page }) => {
    await coachWithTwo(page)
    await page.goto('/trainer/vergleich', { waitUntil: 'domcontentloaded' })

    const tabelle = page.getByRole('table').filter({ hasText: 'Athlet A' }).last()
    await expect(tabelle).toContainText('Athlet A')
    await expect(tabelle).toContainText('Athlet B')
    // 2,40 m gegen 2,00 m: der Weitere führt, der andere steht bei 83 %.
    await expect(tabelle).toContainText('83')
  })

  test('der Nenner steht neben jedem Vergleich', async ({ page }) => {
    await coachWithTwo(page)
    await page.goto('/trainer/vergleich', { waitUntil: 'domcontentloaded' })

    // Ohne den Nenner läse sich ein Vergleich zweier Werte wie eine Aussage
    // über alle Ausgewählten (§81).
    await expect(page.getByText('2 von 2').first()).toBeVisible()
  })

  test('eine nicht gemessene Achse bleibt leer und wird nicht als Null gezeigt', async ({
    page,
  }) => {
    await coachWithTwo(page)
    await page.goto('/trainer/vergleich', { waitUntil: 'domcontentloaded' })

    // Nicht gemessen und schlecht sind zwei verschiedene Aussagen (§89).
    await expect(page.getByText('nicht gemessen').first()).toBeVisible()
  })
})

test.describe('Gruppenbericht', () => {
  test('die Gruppe steht als Verteilung da, mit dem Nenner über jeder Zahl', async ({ page }) => {
    await coachWithTwo(page)
    await page.goto('/trainer/gruppenbericht', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Gruppenbericht' })).toBeVisible()
    await expect(page.getByText('Median').first()).toBeVisible()
    await expect(page.getByText('2 von 2').first()).toBeVisible()
  })

  test('er nennt keinen Letzten — die Namen stehen nicht darin', async ({ page }) => {
    await coachWithTwo(page)
    await page.goto('/trainer/gruppenbericht', { waitUntil: 'domcontentloaded' })

    // Eine Gruppenauswertung, die den Letzten benennt, wird gegen ihn
    // verwendet. Wer wo steht, sagt der Vergleich — dort ruft ein Trainer
    // ihn gezielt auf.
    await expect(page.getByRole('main').getByText('Athlet B')).toHaveCount(0)
  })
})
