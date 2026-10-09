import { test } from '@playwright/test'
import { openDemo } from '../tests/helpers'

/**
 * Aufnahmen der Neugestaltung, übrige Bereiche (keine Prüfung).
 * Aufruf: npx playwright test -c playwright.mockups.config.ts mockups/bereiche.spec.ts --project=phone
 * Ausgabe: mockups-neu/bereiche/<name>-<hell|dunkel>.png
 */
const PAGES: [string, string][] = [
  ['10-woche', '/woche'],
  ['11-training', '/training'],
  ['12-fuel', '/fuel'],
  ['13-tagebuch', '/tagebuch'],
  ['14-belastung', '/belastung'],
  ['15-gesundheit', '/gesundheit'],
  ['16-peakweek', '/peakweek'],
  ['17-laeufe', '/analyse/laeufe'],
  ['18-verlauf', '/verlauf'],
  ['19-termine', '/diagnostik/termine'],
  ['20-testdetail', '/tests/countermovement_jump/details'],
  ['21-messung', '/tests/countermovement_jump'],
  ['22-profil', '/profil'],
  ['23-hrv', '/hrv-messung'],
]

for (const theme of ['light', 'dark'] as const) {
  test(`Bereiche ${theme}`, async ({ page }) => {
    page.setDefaultTimeout(15_000)
    const name = theme === 'light' ? 'hell' : 'dunkel'
    await page.emulateMedia({ colorScheme: theme })
    await openDemo(page)
    for (const [file, path] of PAGES) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      await page.waitForTimeout(700)
      await page.screenshot({ path: `mockups-neu/bereiche/${file}-${name}.png` })
    }
  })
}
