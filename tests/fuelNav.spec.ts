import { expect, test } from '@playwright/test'
import { openDemo } from './helpers'
import { NAV_ITEMS, navKeyForPath } from '../src/features/dashboard/BottomNav'

/** Fuel als eigener Bereich in der unteren Leiste. */

test('Fuel steht als vierter Bereich in der Leiste, vor Mehr', () => {
  expect(NAV_ITEMS.map((i) => i.key)).toEqual(['athleteToday', 'athleteTest', 'athletePlan', 'athletePerformance', 'fuel', 'athleteMore'])
})

test('Fuel und Ernährung markieren denselben Reiter', () => {
  expect(navKeyForPath('/fuel')).toBe('fuel')
  expect(navKeyForPath('/ernaehrung')).toBe('fuel')
  expect(navKeyForPath('/tagebuch')).toBe('athleteMore')
})

test('Tippen auf «Fuel» öffnet den Bereich; von dort geht es zur Ernährung und zurück', async ({ page }) => {
  await openDemo(page)
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Fuel' }).click()
  await expect(page).toHaveURL(/\/fuel$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Fuel')
  await expect(page.getByTestId('fuel-supplements')).toBeVisible()
  await page.getByTestId('fuel-to-nutrition').click()
  await expect(page).toHaveURL(/\/ernaehrung$/)
  await expect(page.getByTestId('fuel-need')).toBeVisible()
  await page.getByTestId('nutrition-to-fuel').click()
  await expect(page).toHaveURL(/\/fuel$/)
})

test('die Leiste passt in die Breite, alle zwölf Bereiche erreichbar', async ({ page }) => {
  await openDemo(page)
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
  const box = await nav.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
  await expect(nav.getByRole('button')).toHaveCount(12)
  for (const b of await nav.getByRole('button').all()) {
    const bb = await b.boundingBox()
    expect(bb!.width, 'jeder Reiter mindestens 44 px breit').toBeGreaterThanOrEqual(44)
  }
})
