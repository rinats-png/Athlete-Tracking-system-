import { test } from '@playwright/test'
import { openDemo } from '../tests/helpers'

/**
 * Bildschirme für den Erklärfilm «Veränderung oder Messschwankung» (keine
 * Prüfung): deutsche Oberfläche, hell. Zwei Beispielreihen im Countermovement
 * Jump — gleicher neuer Sprung, einmal laute, einmal ruhige Messschwankung.
 * Aufgenommen wird die Karte «Veränderung» der Ergebnisseite.
 * Aufruf: FILM_OUT=<ordner> npx playwright test -c playwright.mockups.config.ts mockups/erklaerfilm.spec.ts --project=phone
 */
const OUT = process.env.FILM_OUT ?? 'mockups-film'
const SERIES: Record<string, number[]> = {
  laut: [40.2, 41.6, 40.0, 41.4, 40.5, 41.0, 42.3],
  ruhig: [41.0, 41.2, 40.9, 41.1, 41.0, 41.0, 42.3],
}

test('Erklärfilm-Bildschirme', async ({ page }) => {
  page.setDefaultTimeout(20_000)
  await page.emulateMedia({ colorScheme: 'light' })
  await openDemo(page)
  for (const [name, values] of Object.entries(SERIES)) {
    const id = await page.evaluate((vals) => {
      const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
      const a = d.athletes[0]
      const template = a.results.find((r: { testSlug: string }) => r.testSlug === 'countermovement_jump')
      const day = 86_400_000
      const end = Date.now() - day
      const own = vals.map((v: number, i: number) => ({
        ...template,
        id: `film-${i}`,
        performedAt: new Date(end - (vals.length - 1 - i) * 14 * day).toISOString(),
        values: { jumpHeightCm: v },
        metrics: {},
        score: v,
        attempts: [],
        attemptSelection: null,
        assessmentId: null,
      }))
      a.results = [...a.results.filter((r: { testSlug: string }) => r.testSlug !== 'countermovement_jump'), ...own]
      localStorage.setItem('kydon.data.v1', JSON.stringify(d))
      localStorage.setItem('kydon.locale', 'de')
      localStorage.setItem('kydon.theme', 'light')
      return own[own.length - 1].id
    }, values)
    await page.goto(`/ergebnis/${id}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    const card = page.locator('div.border-t', { has: page.getByText('Veränderung', { exact: true }) }).first()
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    await card.screenshot({ path: `${OUT}/change-${name}.png` })
    await page.screenshot({ path: `${OUT}/result-${name}.png` })
  }
})
