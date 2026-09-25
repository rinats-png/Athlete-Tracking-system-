import { mkdirSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { openDemo } from '../tests/helpers'

/** App-Bilder für die Landingpage: Telefonausschnitt, hell und dunkel, Englisch. */
const OUT = process.env.LANDING_SHOTS ?? 'mockups/out/landing'
const SCREENS: [string, string][] = [
  ['uebersicht', '/'],
  ['diagnostik', '/diagnostik'],
  ['analyse', '/analyse'],
  ['verlauf', '/verlauf'],
  ['trainer', '/trainer'],
  ['einseiter', '/einseiter'],
]

async function go(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(3500)
}

test('landing shots', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone')
  await openDemo(page)
  // Trainerbereich zeigt nur im Trainermodus etwas.
  await page.goto('/profil', { waitUntil: 'domcontentloaded' })
  await page.getByRole('radio', { name: 'Trainer' }).click()
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((t) => {
      localStorage.setItem('kydon.theme', t)
      localStorage.setItem('kydon.locale', 'en')
    }, theme)
    mkdirSync(`${OUT}/${theme}`, { recursive: true })
    for (const [name, path] of SCREENS) {
      await go(page, path)
      await page.screenshot({ path: `${OUT}/${theme}/${name}.png` })
    }
  }
})
