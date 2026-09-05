import { mkdirSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import { blockFonts } from '../tests/helpers'

/**
 * Das Tor in seinen Zuständen.
 *
 * Die Kugel steht kurz, dann wandern die Punkte auf den Umriss, dann
 * erscheint der Inhalt. Die Aufnahmen greifen an vier Stellen: Kugel,
 * unterwegs, fertig, Zerfall. Ein einzelnes Bild vom fertigen Zustand würde
 * das Wesentliche verschweigen — die Bewegung IST der Entwurf.
 */

const OUT = 'mockups/out/auth'

async function coldStart(page: Page) {
  await blockFonts(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('baseline.locale', 'de')
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
}

test.describe('Anmeldung', () => {
  test('vom Partikelfeld bis zum Zerfall', async ({ page }, testInfo) => {
    const p = testInfo.project.name
    mkdirSync(`${OUT}/${p}`, { recursive: true })

    for (const theme of ['dark', 'light'] as const) {
      await coldStart(page)
      await page.evaluate((value) => localStorage.setItem('baseline.theme', value), theme)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('BASELINE')

      // Die Kugel: die Animation der App, bevor sie zum Tor wird.
      await page.waitForTimeout(450)
      await page.screenshot({ path: `${OUT}/${p}/01-${theme}-kugel.png` })

      // Unterwegs: die Punkte wandern auf den Umriss, der Inhalt ist noch nicht da.
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${OUT}/${p}/02-${theme}-partikel-unterwegs.png` })

      // Fertig: der Umriss steht, die Anmeldung ist bedienbar.
      await expect(page.locator('[data-state="formed"]')).toBeAttached({ timeout: 10_000 })
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${OUT}/${p}/03-${theme}-anmeldung.png` })

      // Registrierung: Rolle, dann Stufe.
      await page.getByRole('tab', { name: 'Konto anlegen' }).click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${p}/04-${theme}-rolle.png` })

      await page.getByRole('button', { name: /Ich betreue andere/ }).click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${p}/05-${theme}-stufen-trainer.png` })

      await page.getByRole('button', { name: 'Zurück' }).click()
      await page.getByRole('button', { name: /Für mich selbst/ }).click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${p}/06-${theme}-stufen-athlet.png` })

      await page.getByRole('button', { name: 'Später entscheiden' }).click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${p}/07-${theme}-zugang.png` })

      // Der Zerfall: nach dem Absenden lösen sich die Punkte nach aussen auf.
      await page.getByLabel('Name').fill('Mira Sand')
      await page.getByLabel('E-Mail').fill('mira@example.org')
      await page.getByLabel('Passwort').fill('egal')
      await page.getByRole('button', { name: 'Konto anlegen' }).click()
      await page.waitForTimeout(420)
      await page.screenshot({ path: `${OUT}/${p}/08-${theme}-zerfall.png` })
    }
  })
})
