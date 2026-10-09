import { test } from '@playwright/test'
import { openDemo } from '../tests/helpers'

/**
 * Bildschirme für den Werbespot (keine Prüfung): englische Oberfläche,
 * dunkel, Demo-Daten. Ausgabe in den Ordner aus SPOT_OUT.
 * Aufruf: SPOT_OUT=<ordner> npx playwright test -c playwright.mockups.config.ts mockups/werbespot.spec.ts --project=phone
 */
const OUT = process.env.SPOT_OUT ?? 'mockups-spot'
const LOCALES = ['en', 'de', 'fr', 'es', 'nl', 'sv', 'nb', 'da']

test('Werbespot-Bildschirme', async ({ page }) => {
  page.setDefaultTimeout(20_000)
  await page.emulateMedia({ colorScheme: 'dark' })
  await openDemo(page)
  const go = async (path: string, locale = 'en') => {
    await page.evaluate((l) => { localStorage.setItem('kydon.locale', l); localStorage.setItem('kydon.theme', 'dark') }, locale)
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(900)
  }
  await go('/tests')
  await page.screenshot({ path: `${OUT}/catalog.png` })
  await go('/tests/countermovement_jump/details')
  await page.screenshot({ path: `${OUT}/detail.png` })
  const id = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    const rs = d.athletes[0].results.filter((r: { testSlug: string; score: number | null }) => r.testSlug === 'countermovement_jump' && r.score != null)
    return rs.length ? rs[rs.length - 1].id : d.athletes[0].results.find((r: { score: number | null }) => r.score != null).id
  })
  await go(`/ergebnis/${id}`)
  await page.screenshot({ path: `${OUT}/result.png` })
  // Ein Ergebnis mit Referenzvergleich (Spektrum sichtbar) für «benchmarked».
  const ids: string[] = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('kydon.data.v1') as string)
    return d.athletes[0].results.filter((r: { score: number | null }) => r.score != null).map((r: { id: string }) => r.id).reverse()
  })
  for (const rid of ids.slice(0, 40)) {
    await go(`/ergebnis/${rid}`)
    const spectrum = page.locator('main .relative > p.label-tag').first()
    if (await spectrum.count()) {
      await spectrum.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(1200)
      await page.screenshot({ path: `${OUT}/benchmark.png` })
      break
    }
  }
  await page.evaluate(() => window.scrollBy(0, 520))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/result2.png` })
  await go('/tests/countermovement_jump')
  await page.screenshot({ path: `${OUT}/run-cmj.png` })
  await go('/tests/sprint_30m')
  await page.screenshot({ path: `${OUT}/run-sprint.png` })
  await go('/tests/yo_yo_ir1')
  await page.screenshot({ path: `${OUT}/run-yoyo.png` })
  await go('/performance')
  await page.screenshot({ path: `${OUT}/performance.png` })
  await go('/')
  await page.screenshot({ path: `${OUT}/today.png` })
  for (const l of LOCALES) {
    await go('/tests', l)
    await page.screenshot({ path: `${OUT}/lang-${l}.png` })
  }
})
